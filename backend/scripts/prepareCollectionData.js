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

const dataDir = path.join(__dirname, '../../temp/data');
const imagesBaseDir = path.join(__dirname, '../../temp/images'); // Base directory for collection images
const FIREBASE_STORAGE_BUCKET = 'indian-heritage-gallery-bucket'; // Define bucket name

const sourceDataDir = path.join(__dirname, '../../temp/backend/data'); // New source for raw images
const outputDataDir = path.join(__dirname, '../../temp/data'); // Where generated JSONs will go
const outputImagesBaseDir = path.join(__dirname, '../../temp/images'); // Where organized images will go

async function prepareCollectionData() {
  try {
    // Ensure output directories exist
    if (!fs.existsSync(outputDataDir)) fs.mkdirSync(outputDataDir, { recursive: true });
    if (!fs.existsSync(outputImagesBaseDir)) fs.mkdirSync(outputImagesBaseDir, { recursive: true });

    const collectionFolders = fs.readdirSync(sourceDataDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const collectionId of collectionFolders) {
      console.log(`Processing collection folder: ${collectionId}...`);

      const currentSourceImagesDir = path.join(sourceDataDir, collectionId);
      const currentOutputImagesDir = path.join(outputImagesBaseDir, collectionId);
      const outputJsonFilePath = path.join(outputDataDir, `${collectionId}.json`);

      // 1. Create output image directory
      if (!fs.existsSync(currentOutputImagesDir)) {
        fs.mkdirSync(currentOutputImagesDir, { recursive: true });
      }

      const collectionData = {
        album_title: collectionId.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        items: []
      };

      if (fs.existsSync(currentSourceImagesDir)) {
        const imageFiles = fs.readdirSync(currentSourceImagesDir).filter(imgFile => /\.(jpg|jpeg|png|gif)$/i.test(imgFile));

        for (const imageFile of imageFiles) {
          const sourceImagePath = path.join(currentSourceImagesDir, imageFile);
          const destinationImagePath = path.join(currentOutputImagesDir, imageFile);

          // 2. Copy image to temp/images/{collectionId}
          fs.copyFileSync(sourceImagePath, destinationImagePath);
          console.log(`  Copied image: ${imageFile} to ${currentOutputImagesDir}`);

          // 3. Generate item data and construct gs:// URL
          const destinationPathInStorage = `images/${collectionId}/${imageFile}`;
          const gsUrl = `gs://${FIREBASE_STORAGE_BUCKET}/${destinationPathInStorage}`;

          const pageMatch = imageFile.match(/page-(\d+)\./i);
          const pageNum = pageMatch ? parseInt(pageMatch[1], 10) : null;
          const itemId = pageMatch ? `page-${pageNum}` : path.basename(imageFile, path.extname(imageFile));
          const itemTitle = pageMatch ? `Item on Page ${pageNum}` : `Item: ${itemId}`;

          collectionData.items.push({
            id: itemId,
            page: pageNum,
            title: itemTitle,
            period: "Unknown Period", // Placeholder
            region: "Unknown Region", // Placeholder
            materials: ["Mixed"], // Placeholder
            image: gsUrl,
            notes: ["Placeholder detail: This is a randomly generated note for a new item."],
            description: `A placeholder description for ${itemTitle} from the ${collectionId} collection.`
          });
          console.log(`  Generated item for ${imageFile} with GS URL: ${gsUrl}`);
        }
      } else {
        console.warn(`  Source image directory not found for collection ${collectionId}: ${currentSourceImagesDir}. Skipping image processing for this collection.`);
      }

      // 4. Save the newly created JSON data to temp/data
      fs.writeFileSync(outputJsonFilePath, JSON.stringify(collectionData, null, 2), 'utf8');
      console.log(`Generated collection data for ${collectionId} saved to ${outputJsonFilePath}`);
    }

    console.log('Collection data preparation process completed.');
  } catch (error) {
    console.error('Error during data preparation process:', error);
  }
}

prepareCollectionData();