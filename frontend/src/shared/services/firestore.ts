import { firestore } from '@/shared/config/firebase';

export function getFirestoreOrThrow() {
  if (!firestore) {
    throw new Error(
      'Firebase is not configured. Administrative functions require VITE_FIREBASE_* variables to be set in the environment.',
    );
  }

  return firestore;
}
