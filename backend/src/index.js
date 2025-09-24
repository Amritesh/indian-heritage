// functions/index.js
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

// ------------------------------
// Firebase Admin & DB
// ------------------------------
admin.initializeApp({
  databaseURL: 'https://indian-heritage-gallery-default-rtdb.firebaseio.com/',
});
const db = admin.database();

// Storage client (works locally with ADC / emulator or in Cloud)
const storage = new Storage();

// ------------------------------
// Express App
// ------------------------------
const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));

// ------------------------------
// Helpers
// ------------------------------
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
    // Example:
    // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>?alt=media&token=...
    const u = new URL(uri);
    if (u.hostname !== 'firebasestorage.googleapis.com') return null;
    const parts = u.pathname.split('/').filter(Boolean); // ["v0", "b", "<bucket>", "o", "<encodedPath>"]
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

// Robust HTTP(S) agents (prefer IPv4; keepalive off to avoid stale sockets with some proxies)
const httpAgent = new http.Agent({ keepAlive: false, family: 4 });
const httpsAgent = new HttpsAgent({ keepAlive: false, timeout: 30000, freeSocketTimeout: 15000, socketActiveTTL: 0, family: 4 });

async function axiosGetBuffer(url, { timeoutMs = 25000, maxBytes = 60 * 1024 * 1024, maxRedirects = 5 } = {}) {
  const client = axios.create({
    maxContentLength: maxBytes,
    maxBodyLength: maxBytes,
    timeout: timeoutMs,
    maxRedirects,
    decompress: true,
    headers: {
      // Some CDNs behave better with a "real" UA
      'User-Agent': 'curl/8.5 (+image-fetcher)',
      Accept: '*/*',
      Connection: 'close',
    },
    httpAgent,
    httpsAgent,
    validateStatus: (s) => s >= 200 && s < 400,
    responseType: 'arraybuffer',
  });

  // simple retry with backoff
  const attempts = [0, 300, 800, 1600];
  let lastErr;
  for (const backoff of attempts) {
    try {
      if (backoff) await new Promise((r) => setTimeout(r, backoff));
      const resp = await client.get(url);
      return Buffer.from(resp.data);
    } catch (err) {
      lastErr = err;
      // If it's a reset/timeout, retry; otherwise, break
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
  const [data] = await file.download(); // Buffer
  return data;
}

/**
 * Normalizes an input image into PNG buffer (+dataUrl) and returns its final width/height.
 * Tries in order:
 * 1) data URL (imageDataUrl)
 * 2) GCS (gcsUri: gs://bucket/path)
 * 3) HTTP(S) URL (imageUrl) with retries; if firebase URL, try GCS fallback
 */
async function loadImageAny({ imageDataUrl, gcsUri, imageUrl }, { timeoutMs = 25000, maxSide = 2048 } = {}) {
  let buf;

  if (imageDataUrl && imageDataUrl.startsWith('data:image/')) {
    const b64 = imageDataUrl.split(',')[1];
    buf = Buffer.from(b64, 'base64');
  } else if (gcsUri && gcsUri.startsWith('gs://')) {
    const g = new URL(gcsUri.replace('gs://', 'gs://dummy/')); // quick parse helper
    const [bucket, ...rest] = g.pathname.replace(/^\/+/, '').split('/');
    const objectPath = rest.join('/');
    buf = await downloadFromGCS(bucket, objectPath);
  } else if (imageUrl) {
    // Try HTTP(S)
    try {
      buf = await axiosGetBuffer(imageUrl, { timeoutMs });
    } catch (err) {
      // If this is a Firebase URL, try GCS fallback
      const parsed = parseFirebaseDownloadUrlToGcs(imageUrl);
      if (!parsed) throw err;
      buf = await downloadFromGCS(parsed.bucket, parsed.objectPath);
    }
  } else {
    throw new Error('No image provided (expected imageDataUrl, gcsUri, or imageUrl).');
  }

  // Normalize via sharp
  let img = sharp(buf, { failOnError: false });
  const meta = await img.metadata();

  if (!meta || !meta.width || !meta.height) {
    throw new Error('Unsupported or corrupt image.');
  }

  let resized = img;
  if (meta.width > maxSide || meta.height > maxSide) {
    resized = img.resize({
      width: meta.width >= meta.height ? maxSide : null,
      height: meta.height > meta.width ? maxSide : null,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const pngBuffer = await resized.png({ compressionLevel: 9 }).toBuffer();
  const pngMeta = await sharp(pngBuffer).metadata();
  const b64 = pngBuffer.toString('base64');
  const dataUrl = `data:image/png;base64,${b64}`;

  return { pngBuffer, dataUrl, width: pngMeta.width, height: pngMeta.height };
}

function clampBBox(bbox, imgW, imgH) {
  let { x, y, width, height } = bbox || {};
  x = Math.max(0, Math.floor(x ?? 0));
  y = Math.max(0, Math.floor(y ?? 0));
  width = Math.floor(width ?? 0);
  height = Math.floor(height ?? 0);
  if (width <= 0 || height <= 0) return null;
  if (x + width > imgW) width = imgW - x;
  if (y + height > imgH) height = imgH - y;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function parseModelJson(content) {
  const codeFenceMatch = content.match(/```json\s*([\s\S]*?)\s*```/i);
  const raw = codeFenceMatch ? codeFenceMatch[1] : content;
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== 'object') throw new Error('Model output is not an object');

  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const dims = parsed.image_dimensions && typeof parsed.image_dimensions === 'object' ? parsed.image_dimensions : {};
  const imageW = Number(dims.width) || null;
  const imageH = Number(dims.height) || null;

  const normalizedItems = items.map((it, idx) => {
    const id = slugify(it.id || it.name || `item-${idx + 1}`, `item-${idx + 1}`);
    const bbox = it.bbox || {};
    return {
      id,
      name: String(it.name || `Item ${idx + 1}`),
      description: String(it.description || ''),
      metadata: typeof it.metadata === 'object' && it.metadata ? it.metadata : {},
      bbox: {
        x: Number(bbox.x) || 0,
        y: Number(bbox.y) || 0,
        width: Number(bbox.width) || 0,
        height: Number(bbox.height) || 0,
        units: 'pixels',
      },
    };
  });

  return {
    image_dimensions: imageW && imageH ? { width: imageW, height: imageH } : null,
    items: normalizedItems,
  };
}

// ------------------------------
// Routes you already had
// ------------------------------
app.get('/', (req, res) => res.json({ message: 'Welcome to Anand Heritage Gallery API' }));

app.get('/api/collections', async (req, res) => {
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
    if (itemCollection.items) itemCollection.items.forEach((it) => console.log('Original item image URL:', it.image));
    res.json({ itemCollection });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch item collection' });
  }
});

// ------------------------------
// OpenAI wiring
// ------------------------------
async function getOpenAIInstance() {
  const key = process.env.OPENAI_API_KEY || (functions.config().openai && functions.config().openai.api_key);
  if (!key) throw new Error('OpenAI API key not configured (.env OPENAI_API_KEY or functions config).');
  return new OpenAI({ apiKey: key });
}

async function processImageFlow(req, res, openai) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed. Please use POST.' });

    const { imageUrl, imageDataUrl, gcsUri } = req.body;
    if (!imageUrl && !imageDataUrl && !gcsUri) {
      return res.status(400).json({ error: 'Provide one of: imageDataUrl | gcsUri | imageUrl' });
    }

    // 1) Load & normalize image (robust against ECONNRESET)
    const { pngBuffer, dataUrl, width: normW, height: normH } = await loadImageAny(
      { imageUrl, imageDataUrl, gcsUri },
      { timeoutMs: 25000, maxSide: 2048 }
    );

    // 2) Ask OpenAI for items + bounding boxes
    const prompt = `
You are given a single album-page image that contains multiple distinct items (e.g., stamps or coins).
Return STRICT JSON only:

{
  "image_dimensions": { "width": ${normW}, "height": ${normH} },
  "items": [
    {
      "id": "kebab-case-unique-id",
      "name": "Human title",
      "description": "2–3 sentence summary",
      "metadata": { /* visible facts only: year, ruler/artist, mint/place, denomination, catalog numbers, grade/condition, series */ },
      "bbox": { "x": INT, "y": INT, "width": INT, "height": INT, "units": "pixels" }
    }
  ]
}

Rules:
- "bbox" must be tight around the item; include captions only if visually fused.
- Use integer pixel coords on the provided image (width=${normW}, height=${normH}).
- 0 ≤ x < ${normW}, 0 ≤ y < ${normH}, x+width ≤ ${normW}, y+height ≤ ${normH}.
- No extra commentary, no markdown, just valid JSON.
    `.trim();

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    const content = resp.choices?.[0]?.message?.content || '';
    let parsed;
    try {
      parsed = parseModelJson(content);
    } catch (e) {
      console.error('Model JSON parse failed:', e);
      return res.status(200).json({ warning: 'Model did not return valid JSON', rawContent: content });
    }

    // 3) Crop each bbox
    const baseDir = getOutputDir();
    const crops = [];
    for (const it of parsed.items) {
      const clamped = clampBBox(it.bbox, normW, normH);
      if (!clamped) {
        console.warn(`Skipping ${it.id}: invalid bbox`, it.bbox);
        continue;
      }
      const outPath = path.join(baseDir, `${it.id}.png`);
      await sharp(pngBuffer)
        .extract({ left: clamped.x, top: clamped.y, width: clamped.width, height: clamped.height })
        .png({ compressionLevel: 9 })
        .toFile(outPath);

      crops.push({ id: it.id, path: outPath, bbox: clamped });
    }

    // 4) Respond
    return res.status(200).json({
      image_dimensions: { width: normW, height: normH },
      items: parsed.items,
      crops,
    });
  } catch (error) {
    console.error('processImage error:', error);
    // Surface a concise error (so you don’t just see ECONNRESET without context)
    return res.status(500).json({
      error: 'Failed in processImage',
      code: error.code || undefined,
      details: error.message || String(error),
    });
  }
}

// Local testing route using env OPENAI_API_KEY
app.post('/api/processImage', async (req, res) => {
  try {
    const openai = await getOpenAIInstance();
    return processImageFlow(req, res, openai);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// Export full Express app (so /app/api/processImage keeps working)
exports.app = functions.https.onRequest(app);

// Standalone callable function (optional / alternative endpoint)
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
