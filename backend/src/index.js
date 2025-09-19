const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
// Initialize Firebase Admin SDK
// When deployed as a Firebase Function, the Admin SDK automatically picks up credentials.
// For local emulation, ensure `firebase emulators:start` is run.
admin.initializeApp({
  databaseURL: 'https://indian-heritage-gallery-default-rtdb.firebaseio.com/'
});

const db = admin.database();
const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Anand Heritage Gallery API' });
});

// Collections API
app.get('/api/collections', async (req, res) => {
  try {
    const snapshot = await db.ref('collections').once('value');
    const collections = snapshot.val();
    res.json({ collections: collections || [] });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

app.get('/api/collections/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const snapshot = await db.ref(`collection_details/${id}`).once('value');
    const collection = snapshot.val();
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    res.json({ collection });
  } catch (error) {
    console.error(`Error fetching collection ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

// API endpoint for item collections
app.get('/api/items/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const snapshot = await db.ref(`collection_details/${id}`).once('value'); // Assuming item collections are also under collection_details
    const itemCollection = snapshot.val();
    if (!itemCollection) {
      return res.status(404).json({ error: 'Item collection not found' });
    }
    // Log the image URLs to inspect their format
    if (itemCollection.items) {
      itemCollection.items.forEach(item => {
        console.log('Original item image URL:', item.image);
      });
    }
    res.json({ itemCollection });
  } catch (error) {
    console.error(`Error fetching item collection ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch item collection' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

exports.app = functions.https.onRequest(app);