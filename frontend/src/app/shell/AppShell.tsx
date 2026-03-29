import { Outlet } from 'react-router-dom';
import { Footer } from '@/shared/ui/Footer';
import { Header } from '@/shared/ui/Header';

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <div className="grain-overlay" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
