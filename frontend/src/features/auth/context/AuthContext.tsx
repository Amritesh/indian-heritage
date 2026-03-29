import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/shared/config/firebase';
import { getUserProfile, updateLastLogin } from '@/entities/user/api/userService';
import type { UserRecord } from '@/entities/user/model/types';

type AuthState = {
  firebaseUser: User | null;
  userProfile: UserRecord | null;
  loading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  firebaseUser: null,
  userProfile: null,
  loading: true,
  isAdmin: false,
  isEditor: false,
  isAuthenticated: false,
  needsOnboarding: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!firebaseUser) return;
    const profile = await getUserProfile(firebaseUser.uid);
    setUserProfile(profile);
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
          if (profile) {
            updateLastLogin(user.uid).catch(() => {});
          }
        } catch {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const isAuthenticated = !!firebaseUser;
  const isAdmin = userProfile?.role === 'admin';
  const isEditor = userProfile?.role === 'editor' || isAdmin;
  const needsOnboarding = isAuthenticated && !userProfile?.onboardingCompleted;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        loading,
        isAdmin,
        isEditor,
        isAuthenticated,
        needsOnboarding,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
