export const getFirebaseStorageUrl = (gsPath, options = {}) => {
  if (!gsPath || !gsPath.startsWith('gs://')) {
    return gsPath; // Return as is if not a gs:// path
  }

  const parts = gsPath.replace('gs://', '').split('/');
  const bucket = parts[0];
  const path = parts.slice(1).join('/');
  const encodedPath = encodeURIComponent(path);

  let url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;

  // Add transformation parameters if provided
  const params = [];
  if (options.width) {
    params.push(`width=${options.width}`);
  }
  if (options.height) {
    params.push(`height=${options.height}`);
  }
  if (options.quality) {
    params.push(`quality=${options.quality}`);
  }
  if (options.crop) {
    // Assuming crop is an object like { x, y, w, h } or a string like "x,y,w,h"
    // The exact format depends on the image transformation service being used.
    // For now, we'll just append it as a generic 'crop' parameter.
    if (typeof options.crop === 'object') {
      params.push(`crop=${options.crop.x},${options.crop.y},${options.crop.w},${options.crop.h}`);
    } else {
      params.push(`crop=${options.crop}`);
    }
  }

  if (params.length > 0) {
    url += `&${params.join('&')}`;
  }

  return url;
};