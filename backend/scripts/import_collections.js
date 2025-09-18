const fs = require('fs');
const path = require('path');

function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;
  let cur = '';
  let row = [];
  let inQuotes = false;

  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        // lookahead for escaped quote
        if (text[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cur += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === ',') {
      row.push(cur);
      cur = '';
      i++;
      continue;
    }

    if (ch === '\r') {
      // ignore
      i++;
      continue;
    }

    if (ch === '\n') {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
      i++;
      continue;
    }

    cur += ch;
    i++;
  }

  // final
  if (cur !== '' || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }

  return rows;
}

function slugify(s) {
  return s
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function importCollections() {
  const dataDir = path.join(__dirname, '..', 'data');
  const csvFile = path.join(dataDir, 'Anand Art Gallery - Albums.csv');
  if (!fs.existsSync(csvFile)) {
    console.error('CSV file not found:', csvFile);
    return null;
  }

  const txt = fs.readFileSync(csvFile, 'utf8');
  const rows = parseCSV(txt);
  if (!rows || rows.length < 2) {
    console.error('No rows parsed from CSV');
    process.exit(1);
  }

  const headers = rows[0].map(h => (h || '').trim());
  const dataRows = rows.slice(1).filter(r => r.some(cell => (cell || '').trim() !== ''));

  const collections = dataRows.map((r, idx) => {
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      const key = (headers[i] || `col${i}`).trim();
      obj[key] = (r[i] || '').trim();
    }

    const title = obj['Name'] || `Untitled ${idx + 1}`;
    const volume = obj['Volume'] || '';
    const id = slugify(`${title}${volume ? '-' + volume : ''}`) || `collection-${idx + 1}`;

    return {
      id,
      title,
      assetValue: obj['Asset Value'] || null,
      category: obj['Segment'] || null,
      volume: volume || null,
      era: obj['Era'] || null,
      description: obj['Description'] || null,
      time: obj['Time'] || null,
      pages: obj['Pages'] || null,
      image: obj['Image'] || null,
      items: []
    };
  });

  const out = { collections };
  const outFile = path.join(dataDir, 'collections.json');
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote', outFile, 'with', collections.length, 'collections');
  return out;
}

// If run directly, execute the importer
if (require.main === module) {
  importCollections();
}

module.exports = { importCollections };
