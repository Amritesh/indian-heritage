import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { createUserProfile } from '@/entities/user/api/userService';
import { FormField } from '@/shared/ui/FormField';

export function AdminOnboardingPage() {
  const { firebaseUser, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(firebaseUser?.displayName ?? '');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await createUserProfile(firebaseUser.uid, firebaseUser.email ?? '', {
        displayName: displayName.trim(),
        organization: organization.trim(),
      });
      await refreshProfile();
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="grain-overlay" />
      <div className="relative z-10 w-full max-w-lg space-y-8">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-5xl text-primary">waving_hand</span>
          <h1 className="font-headline text-3xl font-bold text-on-surface">Welcome, Curator</h1>
          <p className="text-on-surface-variant max-w-sm mx-auto">
            Complete your profile to begin managing the Indian Heritage Gallery archive.
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label text-xs font-bold">1</div>
            <span className="font-label text-[10px] uppercase tracking-wider text-primary font-bold">Account</span>
          </div>
          <div className="w-8 h-px bg-primary/30" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-surface-container-high text-outline flex items-center justify-center font-label text-xs font-bold">2</div>
            <span className="font-label text-[10px] uppercase tracking-wider text-outline font-bold">Profile</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 shadow-card space-y-6">
          {error && (
            <div className="bg-error-container/30 text-error rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          <div className="bg-surface-container-low p-4 rounded-lg">
            <p className="metadata-label">Signed in as</p>
            <p className="mt-1 text-sm font-semibold">{firebaseUser?.email}</p>
          </div>

          <FormField
            label="Display Name"
            required
            value={displayName}
            onChange={(e) => setDisplayName((e.target as HTMLInputElement).value)}
            placeholder="Dr. A. Sharma"
            hint="How you'll appear as a curator"
          />

          <FormField
            label="Organization"
            value={organization}
            onChange={(e) => setOrganization((e.target as HTMLInputElement).value)}
            placeholder="National Museum, New Delhi"
            hint="Optional - your institution or team"
          />

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center disabled:opacity-50"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
            ) : (
              <>
                Complete Setup
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
