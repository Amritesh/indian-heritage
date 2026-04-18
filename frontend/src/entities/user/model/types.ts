export type UserRole = 'admin' | 'editor' | 'viewer';

export type UserRecord = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  organization: string;
  onboardingCompleted: boolean;
  status: 'active' | 'inactive';
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
};

export type UserProfileInput = {
  displayName: string;
  photoURL?: string;
  organization?: string;
};
