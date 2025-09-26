/* eslint-disable no-console */
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const OpenAI = require('openai');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { Storage } = require('@google-cloud/storage');
const http = require('http');
const https = require('https');
const { HttpsAgent } = require('agentkeepalive');
require('dotenv').config();

/* ------------------------------
   Firebase Admin & DB
-------------------------------- */
admin.initializeApp({
  databaseURL: 'https://indian-heritage-gallery-default-rtdb.firebaseio.com/',
});
const db = admin.database();
const storage = new Storage();

/* ------------------------------
   Express App
-------------------------------- */
const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));

/* ------------------------------
   Small utils
-------------------------------- */
function getOutputDir() {
  const base =
    process.env.OUTPUT_DIR ||
    (process.env.FUNCTIONS_EMULATOR
      ? path.join(process.cwd(), 'temp', 'images')
      : path.join(os.tmpdir(), 'images'));
  fs.ensureDirSync(base);
  return base;
}

function slugify(s, fallback = 'item') {
  const out = String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return out || fallback;
}

function parseFirebaseDownloadUrlToGcs(uri) {
  try {
    const u = new URL(uri);
    if (u.hostname !== 'firebasestorage.googleapis.com') return null;
    const parts = u.pathname.split('/').filter(Boolean);
    const bIdx = parts.indexOf('b');
    const oIdx = parts.indexOf('o');
    if (bIdx === -1 || oIdx === -1 || !parts[bIdx + 1] || !parts[oIdx + 1]) return null;
    const bucket = parts[bIdx + 1];
    const objectPath = decodeURIComponent(parts[oIdx + 1]);
    return { bucket, objectPath };
  } catch {
    return null;
  }
}

const httpAgent = new http.Agent({ keepAlive: false, family: 4 });
const httpsAgent = new HttpsAgent({
  keepAlive: false,
  timeout: 30000,
  freeSocketTimeout: 15000,
  socketActiveTTL: 0,
  family: 4,
});

async function axiosGetBuffer(url, { timeoutMs = 25000, maxBytes = 60 * 1024 * 1024, maxRedirects = 5 } = {}) {
  const client = axios.create({
    maxContentLength: maxBytes,
    maxBodyLength: maxBytes,
    timeout: timeoutMs,
    maxRedirects,
    decompress: true,
    headers: {
      'User-Agent': 'curl/8.5 (+image-fetcher)',
      Accept: '*/*',
      Connection: 'close',
    },
    httpAgent,
    httpsAgent,
    validateStatus: (s) => s >= 200 && s < 400,
    responseType: 'arraybuffer',
  });

  const attempts = [0, 300, 800, 1600];
  let lastErr;
  for (const backoff of attempts) {
    try {
      if (backoff) await new Promise((r) => setTimeout(r, backoff));
      const resp = await client.get(url);
      return Buffer.from(resp.data);
    } catch (err) {
      lastErr = err;
      const code = err && (err.code || err.name);
      if (!['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'].includes(code)) break;
    }
  }
  if (lastErr) {
    const msg = lastErr.message || String(lastErr);
    const code = lastErr.code || 'UNKNOWN';
    throw new Error(`HTTP fetch failed (${code}): ${msg}`);
  }
  throw new Error('HTTP fetch failed for unknown reasons');
}

async function downloadFromGCS(bucket, objectPath) {
  const file = storage.bucket(bucket).file(objectPath);
  const [data] = await file.download();
  return data;
}

async function loadImageAny({ imageDataUrl, gcsUri, imageUrl }, { timeoutMs = 25000, maxSide = 4096 } = {}) {
  let buf;

  if (imageDataUrl && imageDataUrl.startsWith('data:image/')) {
    const b64 = imageDataUrl.split(',')[1];
    buf = Buffer.from(b64, 'base64');
  } else if (gcsUri && gcsUri.startsWith('gs://')) {
    const u = new URL(gcsUri.replace('gs://', 'gs://dummy/'));
    const [bucket, ...rest] = u.pathname.replace(/^\/+/, '').split('/');
    const objectPath = rest.join('/');
    buf = await downloadFromGCS(bucket, objectPath);
  } else if (imageUrl) {
    try {
      buf = await axiosGetBuffer(imageUrl, { timeoutMs });
    } catch (err) {
      const parsed = parseFirebaseDownloadUrlToGcs(imageUrl);
      if (!parsed) throw err;
      buf = await downloadFromGCS(parsed.bucket, parsed.objectPath);
    }
  } else {
    throw new Error('No image provided (expected imageDataUrl, gcsUri, or imageUrl).');
  }

  let img = sharp(buf, { failOnError: false });
  const meta = await img.metadata();
  if (!meta || !meta.width || !meta.height) throw new Error('Unsupported or corrupt image.');

  // Send high detail to the model; only resize if truly giant
  if (meta.width > maxSide || meta.height > maxSide) {
    img = img.resize({
      width: meta.width >= meta.height ? maxSide : null,
      height: meta.height > meta.width ? maxSide : null,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const pngBuffer = await img.png({ compressionLevel: 9 }).toBuffer();
  const { width, height } = await sharp(pngBuffer).metadata();
  return { pngBuffer, width, height, dataUrl: `data:image/png;base64,${pngBuffer.toString('base64')}` };
}

function clampBBox(bbox, imgW, imgH, { allowZero = false } = {}) {
  if (!bbox || typeof bbox !== 'object') return null;
  let { x = 0, y = 0, width = 0, height = 0 } = bbox;
  x = Math.floor(x); y = Math.floor(y);
  width = Math.floor(width); height = Math.floor(height);
  if (!allowZero && (width <= 0 || height <= 0)) return null;
  if (x < 0) { width += x; x = 0; }
  if (y < 0) { height += y; y = 0; }
  if (x + width > imgW) width = imgW - x;
  if (y + height > imgH) height = imgH - y;
  if (!allowZero && (width <= 0 || height <= 0)) return null;
  return { x, y, width, height };
}

/* ---------------------------------------
   OpenAI (LLM-only, Responses API)
----------------------------------------*/
async function getOpenAIInstance() {
  const key = process.env.OPENAI_API_KEY || (functions.config().openai && functions.config().openai.api_key);
  if (!key) throw new Error('OpenAI API key not configured (.env OPENAI_API_KEY or functions config).');
  return new OpenAI({ apiKey: key });
}

/* ---------------------------------------
   STRICT JSON SCHEMAS
----------------------------------------*/
// Every object has additionalProperties:false and explicit required covering all keys.

/**
 * PAGE_POCKETS_SCHEMA:
 *  - grid: rows, cols describing page pockets (e.g., 4 cols x 5 rows)
 *  - items: ONLY occupied pockets (one per physical item)
 *  - Each item includes (row, col), the pocket's cell_bbox, the item's item_bbox, and details.
 */
const PAGE_POCKETS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    image_dimensions: {
      type: "object",
      additionalProperties: false,
      properties: {
        width: { type: "integer", minimum: 1 },
        height: { type: "integer", minimum: 1 }
      },
      required: ["width", "height"]
    },
    grid: {
      type: "object",
      additionalProperties: false,
      properties: {
        rows: { type: "integer", minimum: 1, maximum: 20 },
        cols: { type: "integer", minimum: 1, maximum: 20 }
      },
      required: ["rows", "cols"]
    },
    items: {
      type: "array",
      maxItems: 100,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          row: { type: "integer", minimum: 1 },
          col: { type: "integer", minimum: 1 },
          cell_bbox: {
            type: "object",
            additionalProperties: false,
            properties: {
              x: { type: "integer", minimum: 0 },
              y: { type: "integer", minimum: 0 },
              width: { type: "integer", minimum: 1 },
              height: { type: "integer", minimum: 1 },
              units: { type: "string", enum: ["pixels"] }
            },
            required: ["x", "y", "width", "height", "units"]
          },
          item_bbox: {
            type: "object",
            additionalProperties: false,
            properties: {
              x: { type: "integer", minimum: 0 },
              y: { type: "integer", minimum: 0 },
              width: { type: "integer", minimum: 1 },
              height: { type: "integer", minimum: 1 },
              units: { type: "string", enum: ["pixels"] }
            },
            required: ["x", "y", "width", "height", "units"]
          },
          name: { type: "string" },
          description: { type: "string" },
          metadata: {
            type: "object",
            additionalProperties: false,
            properties: {
              type: { type: "string" },                 // coin|stamp|medal|artifact|unknown
              ruler_or_issuer: { type: "string" },
              year_or_period: { type: "string" },
              mint_or_place: { type: "string" },
              denomination: { type: "string" },
              series_or_catalog: { type: "string" },
              material: { type: "string" },
              condition: { type: "string" },
              notes: { type: "string" }
            },
            required: [
              "type",
              "ruler_or_issuer",
              "year_or_period",
              "mint_or_place",
              "denomination",
              "series_or_catalog",
              "material",
              "condition",
              "notes"
            ]
          }
        },
        required: [
          "id",
          "row",
          "col",
          "cell_bbox",
          "item_bbox",
          "name",
          "description",
          "metadata"
        ]
      }
    }
  },
  required: ["image_dimensions", "grid", "items"]
};

/* ---------------------------------------
   LLM Calls: Detect + Refine Grid
----------------------------------------*/
async function llmDetectGrid(client, pageDataUrl, W, H, {
  model = process.env.OPENAI_MODEL || 'gpt-4o',
  temperature = 0.0,
  maxItems = 20,
  defaultCols = 4,
  defaultRows = 5
} = {}) {

  const system = `
You are an expert in cataloging album pages with grid pockets (white holders).
This page usually has ${defaultCols} columns and ${defaultRows} rows of pockets; some may be EMPTY.
Your task: detect the grid (rows, cols) and return ONLY OCCUPIED pockets with:
- (row, col) 1-indexed,
- the pocket's rectangle (cell_bbox) in INTEGER PIXELS,
- a tight item rectangle (item_bbox) INSIDE that cell (INTEGER PIXELS),
- brief item details.

Hard rules:
- Coordinates are relative to THIS image: width=${W}, height=${H}.
- All bboxes must have "units":"pixels".
- item_bbox must be fully inside its cell_bbox.
- Rows should be horizontally aligned; columns vertically aligned.
- Non-overlap across different cell_bbox rectangles except minor borders.
- Bounds: 0 ≤ x < ${W}, 0 ≤ y < ${H}, x+width ≤ ${W}, y+height ≤ ${H}.
- Output at most ${maxItems} occupied pockets.
- If a pocket is empty, DO NOT include it in items.
- IDs: kebab-case, unique, e.g., "r1c1", "r2c3-coin".
`.trim();

  const userInstruction = `
Return strictly valid JSON only (no commentary) using the provided schema.
`.trim();

  const schema = JSON.parse(JSON.stringify(PAGE_POCKETS_SCHEMA));
  schema.properties.items.maxItems = maxItems;

  const resp = await client.responses.create({
    model,
    temperature,
    text: {
      format: {
        type: "json_schema",
        name: "page_pockets",
        strict: true,
        schema
      }
    },
    input: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "input_text", text: userInstruction },
          { type: "input_image", image_url: pageDataUrl }
        ]
      }
    ]
  });

  const text = resp.output_text ?? resp.output?.[0]?.content?.[0]?.text;
  if (!text) throw new Error('Model returned empty response (detect).');
  return JSON.parse(text);
}

async function llmRefineGrid(client, pageDataUrl, W, H, prelim, {
  model = process.env.OPENAI_MODEL || 'gpt-4o',
  temperature = 0.0,
  maxItems = 20
} = {}) {

  const refineSystem = `
You are refining a detected grid of pockets on an album page.
Snap columns to consistent x positions and rows to consistent y positions derived from the image.
Tighten each item_bbox to visible item edges; ensure it is fully inside its cell_bbox.
Remove any items whose cell appears empty or contains text-only labels without a coin.
Remove duplicates and overlaps. Keep at most ${maxItems} occupied pockets.
Bounds: 0 ≤ x < ${W}, 0 ≤ y < ${H}, x+width ≤ ${W}, y+height ≤ ${H}.
`.trim();

  const refineUser = `
You are given the original image and a preliminary JSON.
Return strictly valid JSON with the SAME schema, corrected to:
- align all columns/rows,
- ensure item_bbox is inside cell_bbox,
- exclude empty cells,
- and maintain consistent units:"pixels".
`.trim();

  const schema = JSON.parse(JSON.stringify(PAGE_POCKETS_SCHEMA));
  schema.properties.items.maxItems = maxItems;

  const resp = await client.responses.create({
    model,
    temperature,
    text: {
      format: {
        type: "json_schema",
        name: "page_pockets",
        strict: true,
        schema
      }
    },
    input: [
      { role: "system", content: refineSystem },
      {
        role: "user",
        content: [
          { type: "input_text", text: refineUser },
          { type: "input_image", image_url: pageDataUrl },
          { type: "input_text", text: "Preliminary JSON follows:" },
          { type: "input_text", text: JSON.stringify(prelim) }
        ]
      }
    ]
  });

  const text = resp.output_text ?? resp.output?.[0]?.content?.[0]?.text;
  if (!text) throw new Error('Model returned empty response (refine).');
  return JSON.parse(text);
}

/* ---------------------------------------
   Main flow
----------------------------------------*/
async function processImageFlow(req, res, openai) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

    const {
      imageUrl, imageDataUrl, gcsUri,
      maxItems = 20,
      gridCols = 4,   // hint: typical page layout
      gridRows = 5,   // hint: typical page layout
      downscaleMax = 1400
    } = req.body || {};

    if (!imageUrl && !imageDataUrl && !gcsUri) {
      return res.status(400).json({ error: 'Provide one of: imageDataUrl | gcsUri | imageUrl' });
    }

    // Load page
    const { pngBuffer, width: W, height: H, dataUrl } = await loadImageAny(
      { imageUrl, imageDataUrl, gcsUri },
      { timeoutMs: 25000, maxSide: 4096 }
    );

    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    // Pass 1: detect grid + occupied cells
    const detected = await llmDetectGrid(
      openai, dataUrl, W, H,
      { model, temperature: 0.0, maxItems, defaultCols: gridCols, defaultRows: gridRows }
    );

    // Pass 2: refine grid alignment + item boxes
    const refined = await llmRefineGrid(
      openai, dataUrl, W, H, detected,
      { model, temperature: 0.0, maxItems }
    );

    const itemsIn = Array.isArray(refined.items) && refined.items.length ? refined.items : (detected.items || []);
    const gridOut = refined.grid || detected.grid || { rows: gridRows, cols: gridCols };

    // Crop each item by item_bbox; fallback to cell_bbox if needed
    const outDir = getOutputDir();
    const items = [];
    const crops = [];

    const pageId =
      (gcsUri && slugify(path.basename(gcsUri))) ||
      (imageUrl && slugify(path.basename(new URL(imageUrl).pathname))) ||
      'page';

    for (const [idx, it] of itemsIn.entries()) {
      const safeId = slugify(it.id || `r${it.row}c${it.col}-${idx+1}`, `item-${idx+1}`);

      const clampedCell = clampBBox(it.cell_bbox, W, H);
      const clampedItem = clampBBox(it.item_bbox, W, H);
      if (!clampedCell) {
        console.warn(`Skip ${safeId}: invalid cell_bbox`, it.cell_bbox);
        continue;
      }
      const useBox = clampedItem && clampedItem.width >= 24 && clampedItem.height >= 24
        ? clampedItem
        : clampedCell;

      const regionBuf = await sharp(pngBuffer)
        .extract({ left: useBox.x, top: useBox.y, width: useBox.width, height: useBox.height })
        .resize({
          width: Math.min(useBox.width, downscaleMax),
          height: null,
          fit: 'inside',
          withoutEnlargement: true
        })
        .png({ compressionLevel: 9 })
        .toBuffer();

      const outPath = path.join(outDir, `${pageId}-${safeId}.png`);
      await sharp(regionBuf).png({ compressionLevel: 9 }).toFile(outPath);

      const item = {
        id: `${pageId}-${safeId}`,
        row: it.row,
        col: it.col,
        cell_bbox: { ...clampedCell, units: 'pixels' },
        item_bbox: clampedItem ? { ...clampedItem, units: 'pixels' } : null,
        image_file: outPath,
        name: it.name || '',
        description: it.description || '',
        metadata: it.metadata || {}
      };
      items.push(item);
      crops.push({ id: item.id, path: outPath, cell_bbox: clampedCell, item_bbox: clampedItem || null });
    }

    // Manifest
    const manifest = {
      source_page: { width: W, height: H, image: imageUrl || gcsUri || 'data-url' },
      model_used: model,
      generated_at: new Date().toISOString(),
      grid: gridOut,
      items
    };
    const manifestPath = path.join(outDir, `${pageId}-manifest.json`);
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });

    return res.status(200).json({
      image_dimensions: { width: W, height: H },
      grid: gridOut,
      items,
      crops,
      manifest_path: manifestPath,
      note: 'Two-pass LLM-only (grid-aware). Items correspond to occupied pockets; crops use item_bbox (fallback cell_bbox).'
    });
  } catch (error) {
    console.error('processImage error:', error);
    return res.status(500).json({
      error: 'Failed in processImage',
      code: error.code || undefined,
      details: error.message || String(error),
    });
  }
}

/* ---------------------------------------
   Public routes
----------------------------------------*/
app.get('/', (req, res) => res.json({ message: 'Welcome to Anand Heritage Gallery API' }));

app.get('/api/collections', async (_req, res) => {
  try {
    const snapshot = await db.ref('collections').once('value');
    res.json({ collections: snapshot.val() || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

app.get('/api/collections/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const snapshot = await db.ref(`collection_details/${id}`).once('value');
    const collection = snapshot.val();
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    res.json({ collection });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

app.get('/api/items/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const snapshot = await db.ref(`collection_details/${id}`).once('value');
    const itemCollection = snapshot.val();
    if (!itemCollection) return res.status(404).json({ error: 'Item collection not found' });
    res.json({ itemCollection });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch item collection' });
  }
});

/* ---------------------------------------
   Endpoint
----------------------------------------*/
app.post('/api/processImage', async (req, res) => {
  try {
    const openai = await getOpenAIInstance();
    return processImageFlow(req, res, openai);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// Export the express app
exports.app = functions.https.onRequest(app);

// Optional callable HTTP (same behavior)
exports.processImageWithOpenAI = functions
  .runWith({ timeoutSeconds: 300, memory: '1GB' })
  .https.onRequest(async (req, res) => {
    try {
      const openai = await getOpenAIInstance();
      return processImageFlow(req, res, openai);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message || String(e) });
    }
  });
