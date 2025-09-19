const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '../../temp/serviceAccountKey.json');
let firebaseConfig = {
  databaseURL: 'https://indian-heritage-gallery-default-rtdb.firebaseio.com/'
};

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  firebaseConfig.credential = admin.credential.cert(serviceAccount);
} else {
  console.warn('serviceAccountKey.json not found. Admin SDK will attempt to initialize without explicit credentials. This is expected in deployed environments.');
}

admin.initializeApp(firebaseConfig);

const db = admin.database();
const storage = admin.storage();

const dataDir = path.join(__dirname, '../../temp/data');
const imagesDir = path.join(__dirname, '../../temp/images'); // Assuming temp/images is at the project root

async function uploadData() {
  try {
    // 1. Upload collections data
    const collectionsRef = db.ref('collections');
    const collectionsFilePath = path.join(dataDir, 'collections.json');
    if (fs.existsSync(collectionsFilePath)) {
      let collectionsData = JSON.parse(fs.readFileSync(collectionsFilePath, 'utf8'));

      // Check if the collectionsData object itself contains a 'collections' key
      // This handles cases where the JSON file might be structured as { "collections": { ... } }
      if (collectionsData.collections && typeof collectionsData.collections === 'object') {
        collectionsData = collectionsData.collections;
      }

      console.log('Uploading collections...');
      await collectionsRef.set(collectionsData);
      console.log('Collections uploaded successfully.');
    } else {
      console.warn('collections.json not found. Skipping collections upload.');
    }

    // 2. Upload individual collection details (e.g., primitive-money-1.json)
    const dataFiles = fs.readdirSync(dataDir).filter(file => file.endsWith('.json') && file !== 'collections.json');
    const collectionDetailsRef = db.ref('collection_details');

    for (const file of dataFiles) {
      const filePath = path.join(dataDir, file);
      const collectionId = path.basename(file, '.json');
      const collectionDetail = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`Uploading details for collection: ${collectionId}...`);
      await collectionDetailsRef.child(collectionId).set(collectionDetail);
      console.log(`Details for collection ${collectionId} uploaded successfully.`);
    }
    console.log('All collection details uploaded successfully.');

    // 3. Upload images to Firebase Storage
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir).filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
      const bucket = storage.bucket('indian-heritage-gallery-bucket');

      for (const imageFile of imageFiles) {
        const imageFilePath = path.join(imagesDir, imageFile);
        const destination = `images/${imageFile}`; // Path in Firebase Storage
        console.log(`Uploading image: ${imageFile} to ${destination}...`);
        await bucket.upload(imageFilePath, {
          destination: destination,
          metadata: {
            contentType: `image/${path.extname(imageFile).substring(1)}`,
          },
        });
        console.log(`Image ${imageFile} uploaded successfully.`);
      }
      console.log('All images uploaded successfully.');
    } else {
      console.warn(`Image directory not found: ${imagesDir}. Skipping image upload.`);
    }

    console.log('Data and images upload process completed.');
  } catch (error) {
    console.error('Error during upload process:', error);
  }
}

uploadData();