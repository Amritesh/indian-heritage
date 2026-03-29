import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { updateUserProfile } from '@/entities/user/api/userService';
import { FormField } from '@/shared/ui/FormField';
import { StatusBadge } from '@/shared/ui/StatusBadge';

export function AdminProfilePage() {
  const { userProfile, firebaseUser, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [organization, setOrganization] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName);
      setOrganization(userProfile.organization);
      setPhotoURL(userProfile.photoURL);
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await updateUserProfile(firebaseUser.uid, {
        displayName: displayName.trim(),
        organization: organization.trim(),
        photoURL: photoURL.trim(),
      });
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <span className="eyebrow">Settings</span>
        <h1 className="mt-2 font-headline text-3xl font-bold text-on-surface">Curator Profile</h1>
      </div>

      {/* Profile Summary */}
      <div className="bg-surface-container-low p-6 rounded-xl flex items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center shrink-0">
          {photoURL ? (
            <img src={photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="font-headline text-2xl text-on-primary-container font-bold">
              {displayName?.charAt(0)?.toUpperCase() ?? 'A'}
            </span>
          )}
        </div>
        <div>
          <p className="font-headline text-xl font-bold">{userProfile?.displayName ?? 'Admin'}</p>
          <p className="text-sm text-on-surface-variant">{firebaseUser?.email}</p>
          <div className="flex gap-2 mt-2">
            <StatusBadge status={userProfile?.status === 'active' ? 'active' : 'inactive'} />
            <span className="archival-chip">{userProfile?.role ?? 'admin'}</span>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 space-y-6">
        <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary border-b border-outline-variant/20 pb-4">
          Edit Profile
        </h2>

        {error && (
          <div className="bg-error-container/30 text-error rounded-lg px-4 py-3 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-primary/10 text-primary rounded-lg px-4 py-3 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Profile updated successfully
          </div>
        )}

        <FormField
          label="Display Name"
          required
          value={displayName}
          onChange={(e) => setDisplayName((e.target as HTMLInputElement).value)}
        />

        <FormField
          label="Organization"
          value={organization}
          onChange={(e) => setOrganization((e.target as HTMLInputElement).value)}
          placeholder="Institution or team"
        />

        <FormField
          label="Photo URL"
          type="url"
          value={photoURL}
          onChange={(e) => setPhotoURL((e.target as HTMLInputElement).value)}
          placeholder="https://..."
          hint="Link to your profile photo"
        />

        <div className="flex justify-end gap-3 pt-4">
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">save</span>
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Account Info */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10">
        <h3 className="font-label text-xs font-bold uppercase tracking-widest text-outline mb-4">Account Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="metadata-label">UID</p>
            <p className="mt-1 font-mono text-xs text-on-surface-variant">{firebaseUser?.uid}</p>
          </div>
          <div>
            <p className="metadata-label">Last Login</p>
            <p className="mt-1 text-on-surface-variant">
              {userProfile?.lastLoginAt ? new Date(userProfile.lastLoginAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <p className="metadata-label">Member Since</p>
            <p className="mt-1 text-on-surface-variant">
              {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <p className="metadata-label">Role</p>
            <p className="mt-1 text-on-surface-variant capitalize">{userProfile?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
