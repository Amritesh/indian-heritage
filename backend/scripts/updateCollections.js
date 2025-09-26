const fs = require('fs');
const path = require('path');

const collectionsFilePath = path.join(__dirname, '../../temp/data/collections.json');

fs.readFile(collectionsFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading collections.json:', err);
    return;
  }

  try {
    const collectionsData = JSON.parse(data);

    const updatedCollections = collectionsData.collections.map(collection => {
      const collectionId = collection.id;
      const newImagePath = `gs://indian-heritage-gallery-bucket/images/${collectionId}/page-1.png`;
      return { ...collection, image: newImagePath };
    });

    collectionsData.collections = updatedCollections;

    fs.writeFile(collectionsFilePath, JSON.stringify(collectionsData, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Error writing updated collections.json:', err);
      } else {
        console.log('Successfully updated collection images in collections.json');
      }
    });
  } catch (parseError) {
    console.error('Error parsing collections.json:', parseError);
  }
});