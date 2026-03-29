const requiredFirebaseKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export const env = {
  firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  firebaseAuthDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  firebaseStorageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  firebaseMessagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  firebaseAppId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  firebaseMeasurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? '',
};

export const hasFirebaseEnv = requiredFirebaseKeys.every((key) => Boolean(import.meta.env[key]));
