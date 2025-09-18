const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Anand Heritage Gallery API' });
});

// Regenerate collections.json from CSV at startup if available
try {
  const importer = require('../scripts/import_collections');
  if (importer && typeof importer.importCollections === 'function') {
    importer.importCollections();
  }
} catch (err) {
  console.warn('Could not run importer at startup:', err.message || err);
}

// Collections API
const path = require('path');
const fs = require('fs');

function readCollections() {
  const file = path.join(__dirname, '../data/collections.json');
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    return data.collections || [];
  } catch (err) {
    console.error('Failed to read collections.json', err);
    return [];
  }
}

app.get('/api/collections', (req, res) => {
  const collections = readCollections();
  res.json({ collections });
});

app.get('/api/collections/:id', (req, res) => {
  const collections = readCollections();
  const id = req.params.id;
  const found = collections.find(c => c.id === id);
  if (!found) return res.status(404).json({ error: 'Not found' });
  res.json({ collection: found });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});