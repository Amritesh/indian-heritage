import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/shared/config/firebase';
import { FormField } from '@/shared/ui/FormField';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError('Firebase not configured');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="grain-overlay" />
      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="relative flex items-center justify-center w-20 h-20">
              <div className="absolute inset-0 border border-primary/20 rounded-full animate-spin-slow" />
              <span className="material-symbols-outlined text-4xl text-primary">account_balance</span>
            </div>
          </div>
          <div>
            <span className="font-label text-[10px] uppercase tracking-[0.3em] text-primary/60 block mb-2">
              Indian Heritage Gallery
            </span>
            <h1 className="font-headline text-3xl font-bold text-on-surface">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="mt-2 text-on-surface-variant">
              {isSignUp ? 'Set up your curator account' : 'Sign in to the curator dashboard'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 shadow-card space-y-6">
          {error && (
            <div className="bg-error-container/30 text-error rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <FormField
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
            placeholder="curator@heritage.org"
          />

          <FormField
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
            placeholder="Enter your password"
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
                {isSignUp ? 'Create Account' : 'Sign In'}
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </>
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Create one'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link to="/" className="text-sm text-outline hover:text-primary transition-colors">
            Back to public gallery
          </Link>
        </div>
      </div>
    </div>
  );
}
