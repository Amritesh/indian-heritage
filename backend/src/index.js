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

  // Send full detail to the model; only resize if truly giant
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

function clampBBox(bbox, imgW, imgH) {
  if (!bbox || typeof bbox !== 'object') return null;
  let { x = 0, y = 0, width = 0, height = 0 } = bbox;
  x = Math.floor(x); y = Math.floor(y);
  width = Math.floor(width); height = Math.floor(height);
  if (width <= 0 || height <= 0) return null;
  if (x < 0) { width += x; x = 0; }
  if (y < 0) { height += y; y = 0; }
  if (x + width > imgW) width = imgW - x;
  if (y + height > imgH) height = imgH - y;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

/* ---------------------------------------
   OpenAI (LLM-only bboxes + details)
----------------------------------------*/
async function getOpenAIInstance() {
  const key = process.env.OPENAI_API_KEY || (functions.config().openai && functions.config().openai.api_key);
  if (!key) throw new Error('OpenAI API key not configured (.env OPENAI_API_KEY or functions config).');
  return new OpenAI({ apiKey: key });
}

/* ---------------------------------------
   JSON Schema (strict) used in both passes
----------------------------------------*/
// IMPORTANT: every object has additionalProperties:false AND a required list.
const PAGE_ITEMS_SCHEMA = {
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
    items: {
      type: "array",
      maxItems: 64, // upper bound; we'll pass a tighter cap at runtime
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
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
          },
          bbox: {
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
          }
        },
        required: ["id", "name", "description", "metadata", "bbox"]
      }
    }
  },
  required: ["image_dimensions", "items"]
};

/**
 * Pass 1: Ask the LLM to return pixel bboxes + details (strict schema).
 */
async function llmDetectItems(client, pageDataUrl, W, H, {
  model = process.env.OPENAI_MODEL || 'gpt-4o',
  temperature = 0.0,
  maxItems = 48,
} = {}) {

  const system = `
You are an expert image cataloguer. The user provides an album page image with multiple items (coins/stamps/etc.).
Return tight pixel bounding boxes around EACH physical item (not the page background), with brief details.

Hard rules:
- Coordinates MUST be INTEGER PIXELS relative to THIS image: width=${W}, height=${H}.
- Use { "units":"pixels" } on every bbox.
- DO NOT assume a regular grid. DO NOT output placeholder or rounded coordinates (e.g., 50/100/250).
- DO NOT guess uniform widths/heights. Snap to the actual visible edges of the item/holder.
- EXCLUDE white page margins and loose captions unless they are physically inside/attached to the same holder.
- Enforce NON-OVERLAP: IoU between two boxes must be ≤ 0.05, unless a merge clearly represents a single item.
- Bounds: 0 ≤ x < ${W}, 0 ≤ y < ${H}, x+width ≤ ${W}, y+height ≤ ${H}.
- Prefer fewer high-confidence boxes to many guesses.
- IDs must be unique and kebab-case (e.g., "item-01", "coin-top-left").
`.trim();

  const userInstruction = `
Return strictly valid JSON only (no commentary).
Provide "image_dimensions" and "items".
Boxes must reflect real visual edges—not an assumed page layout and not round-number grids.
Cap items to ${maxItems}.
`.trim();

  const schema = JSON.parse(JSON.stringify(PAGE_ITEMS_SCHEMA));
  // tighten the array cap at runtime
  schema.properties.items.maxItems = maxItems;

  const resp = await client.responses.create({
    model,
    temperature,
    text: {
      format: {
        type: "json_schema",
        name: "page_items",
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
  if (!text) throw new Error('Model returned empty response.');
  return JSON.parse(text);
}

/**
 * Pass 2: Ask the LLM to refine/repair the preliminary boxes (same strict schema).
 */
async function llmRefineBoxes(client, pageDataUrl, W, H, rawItems, {
  model = process.env.OPENAI_MODEL || 'gpt-4o',
  temperature = 0.0,
  maxItems = 48
} = {}) {

  const refineSystem = `
You are refining bounding boxes for an album page image with multiple items.
Tasks: tighten boxes to actual visible edges; remove duplicates/false positives; merge or split where appropriate.
Avoid quantized "grid-like" coordinates; prefer visually precise pixel edges even if messy.
Non-overlap constraint: IoU between distinct items ≤ 0.05 (merge if they represent the same physical item).
Bounds: 0 ≤ x < ${W}, 0 ≤ y < ${H}, x+width ≤ ${W}, y+height ≤ ${H}.
`.trim();

  const refineUser = `
You are given the original page image and a preliminary list of items with bboxes.
Return a corrected list that:
- removes false positives,
- tightens loose boxes,
- corrects positions/sizes that look like placeholders or neat grids,
- ensures each box encloses exactly one item,
- keeps "units":"pixels",
- and includes at most ${maxItems} items.

Return strictly valid JSON per the same schema as detection.
`.trim();

  const prelim = {
    image_dimensions: { width: W, height: H },
    items: rawItems.map(it => ({
      id: it.id,
      name: it.name || "",
      description: it.description || "",
      metadata: it.metadata,
      bbox: it.bbox
    }))
  };

  const schema = JSON.parse(JSON.stringify(PAGE_ITEMS_SCHEMA));
  schema.properties.items.maxItems = maxItems;

  const resp = await client.responses.create({
    model,
    temperature,
    text: {
      format: {
        type: "json_schema",
        name: "page_items",
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
          { type: "input_text", text: "Preliminary items JSON follows:" },
          { type: "input_text", text: JSON.stringify(prelim) }
        ]
      }
    ]
  });

  const text = resp.output_text ?? resp.output?.[0]?.content?.[0]?.text;
  if (!text) throw new Error('Refine returned empty response.');
  return JSON.parse(text);
}

/* ---------------------------------------
   Main processing flow (LLM bboxes only)
----------------------------------------*/
async function processImageFlow(req, res, openai) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

    const { imageUrl, imageDataUrl, gcsUri, maxItems = 32, downscaleMax = 1400 } = req.body || {};
    if (!imageUrl && !imageDataUrl && !gcsUri) {
      return res.status(400).json({ error: 'Provide one of: imageDataUrl | gcsUri | imageUrl' });
    }

    // 1) Load page and get a data URL for the LLM (full-res up to maxSide)
    const { pngBuffer, width: W, height: H, dataUrl } = await loadImageAny(
      { imageUrl, imageDataUrl, gcsUri },
      { timeoutMs: 25000, maxSide: 4096 }
    );

    // 2) Pass 1: Ask LLM for boxes + details (strict JSON schema)
    const model = process.env.OPENAI_MODEL || 'gpt-4o';
    const detected = await llmDetectItems(openai, dataUrl, W, H, { model, maxItems, temperature: 0.0 });

    // 3) Pass 2: Refine boxes with the same schema
    const refined = await llmRefineBoxes(openai, dataUrl, W, H, detected.items || [], { model, maxItems, temperature: 0.0 });
    const finalItems = Array.isArray(refined.items) && refined.items.length ? refined.items : (detected.items || []);

    // 4) Crop each bbox
    const outDir = getOutputDir();
    const items = [];
    const crops = [];

    const pageId =
      (gcsUri && slugify(path.basename(gcsUri))) ||
      (imageUrl && slugify(path.basename(new URL(imageUrl).pathname))) ||
      'page';

    for (const [idx, it] of (finalItems || []).entries()) {
      const id = slugify(it.id || `item-${idx + 1}`, `item-${idx + 1}`);
      const clamped = clampBBox(it.bbox, W, H);
      if (!clamped) {
        console.warn(`Skip ${id}: invalid bbox`, it.bbox);
        continue;
      }

      const regionBuf = await sharp(pngBuffer)
        .extract({ left: clamped.x, top: clamped.y, width: clamped.width, height: clamped.height })
        .resize({
          width: Math.min(clamped.width, downscaleMax),
          height: null,
          fit: 'inside',
          withoutEnlargement: true
        })
        .png({ compressionLevel: 9 })
        .toBuffer();

      const outPath = path.join(outDir, `${pageId}-${id}.png`);
      await sharp(regionBuf).png({ compressionLevel: 9 }).toFile(outPath);

      const item = {
        id: `${pageId}-${id}`,
        bbox: { ...clamped, units: 'pixels' },
        image_file: outPath,
        name: it.name || '',
        description: it.description || '',
        metadata: it.metadata || {}
      };
      items.push(item);
      crops.push({ id: item.id, path: outPath, bbox: clamped });
    }

    // 5) Manifest
    const manifest = {
      source_page: { width: W, height: H, image: imageUrl || gcsUri || 'data-url' },
      model_used: model,
      generated_at: new Date().toISOString(),
      items
    };
    const manifestPath = path.join(outDir, `${pageId}-manifest.json`);
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });

    return res.status(200).json({
      image_dimensions: { width: W, height: H },
      items,
      crops,
      manifest_path: manifestPath,
      note: 'Two-pass LLM-only detection (detect + refine) with strict JSON schema.'
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
   Public routes you already had
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

// Optional standalone
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
