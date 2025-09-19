export const getFirebaseStorageUrl = (gsPath) => {
  if (!gsPath || !gsPath.startsWith('gs://')) {
    return gsPath; // Return as is if not a gs:// path
  }

  const parts = gsPath.replace('gs://', '').split('/');
  const bucket = parts[0];
  const path = parts.slice(1).join('/');
  const encodedPath = encodeURIComponent(path);

  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
};