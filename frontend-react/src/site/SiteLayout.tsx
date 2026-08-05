import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Nav } from './Nav';
import { AmbientBackdrop } from './components/AmbientBackdrop';
import { Footer } from './Footer';

export const SiteLayout = () => {
  const { pathname, hash } = useLocation();

  // Restore natural page-load behaviour that a SPA router otherwise swallows:
  // jump to top on navigation, or to the anchor when one is present.
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  return (
    <div className="flex min-h-screen flex-col">
      <AmbientBackdrop />
      <Nav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
