import { firestore } from '@/shared/config/firebase';

export function getFirestoreOrThrow() {
  if (!firestore) {
    throw new Error(
      'Firebase is not configured. Add the required VITE_FIREBASE_* variables before running the app.',
    );
  }

  return firestore;
}
