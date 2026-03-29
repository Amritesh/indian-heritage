import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getFirestoreOrThrow } from '@/shared/services/firestore';
import type { UserRecord, UserProfileInput, UserRole } from '@/entities/user/model/types';

function toISOString(val: unknown): string | null {
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return null;
}

function mapUserDoc(uid: string, data: Record<string, unknown>): UserRecord {
  return {
    uid,
    email: (data.email as string) ?? '',
    displayName: (data.displayName as string) ?? '',
    photoURL: (data.photoURL as string) ?? '',
    role: ((data.role as string) ?? 'viewer') as UserRole,
    organization: (data.organization as string) ?? '',
    onboardingCompleted: (data.onboardingCompleted as boolean) ?? false,
    status: ((data.status as string) ?? 'active') as 'active' | 'inactive',
    createdAt: toISOString(data.createdAt),
    updatedAt: toISOString(data.updatedAt),
    lastLoginAt: toISOString(data.lastLoginAt),
  };
}

export async function getUserProfile(uid: string): Promise<UserRecord | null> {
  const db = getFirestoreOrThrow();
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return mapUserDoc(uid, snap.data());
}

export async function createUserProfile(
  uid: string,
  email: string,
  profile: UserProfileInput,
): Promise<UserRecord> {
  const db = getFirestoreOrThrow();
  const ref = doc(db, 'users', uid);
  const data = {
    uid,
    email,
    displayName: profile.displayName,
    photoURL: profile.photoURL ?? '',
    organization: profile.organization ?? '',
    role: 'admin' as UserRole,
    onboardingCompleted: true,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };
  await setDoc(ref, data);
  return mapUserDoc(uid, { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastLoginAt: new Date().toISOString() });
}

export async function updateUserProfile(
  uid: string,
  profile: Partial<UserProfileInput>,
): Promise<void> {
  const db = getFirestoreOrThrow();
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { ...profile, updatedAt: serverTimestamp() }, { merge: true });
}

export async function updateLastLogin(uid: string): Promise<void> {
  const db = getFirestoreOrThrow();
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { lastLoginAt: serverTimestamp() }, { merge: true });
}
