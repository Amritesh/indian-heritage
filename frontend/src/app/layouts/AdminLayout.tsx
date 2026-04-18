import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/shared/config/firebase';
import { useAuth } from '@/features/auth/context/AuthContext';
import { cn } from '@/shared/lib/cn';

const sidebarItems = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/collections', label: 'Collections', icon: 'collections_bookmark' },
  { to: '/admin/items', label: 'Items', icon: 'inventory_2' },
  { to: '/admin/import', label: 'Import', icon: 'cloud_download' },
  { to: '/admin/profile', label: 'Profile', icon: 'person' },
];

export function AdminLayout() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    if (auth) await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-surface-container-lowest border-r border-outline-variant/20 flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-outline-variant/20">
          <Link to="/" className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-xl">account_balance</span>
            <span className="font-headline text-primary italic text-lg font-semibold tracking-tight">
              Admin
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg font-body text-sm transition-all duration-300',
                  isActive
                    ? 'bg-primary text-on-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high',
                )
              }
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-outline-variant/20">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
              <span className="font-headline text-sm text-on-primary-container font-bold">
                {userProfile?.displayName?.charAt(0)?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{userProfile?.displayName ?? 'Admin'}</p>
              <p className="text-[10px] text-outline uppercase tracking-wider">{userProfile?.role ?? 'admin'}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2 mt-2 rounded-lg text-sm text-on-surface-variant hover:bg-error-container/30 hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/20 px-4 py-3 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">account_balance</span>
            <span className="font-headline text-primary italic font-semibold">Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            {sidebarItems.slice(0, 4).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'p-2 rounded-lg transition-colors',
                    isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant',
                  )
                }
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
              </NavLink>
            ))}
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
