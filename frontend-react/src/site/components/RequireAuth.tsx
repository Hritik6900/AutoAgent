import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Gates a route behind being signed in.
 *
 * Sends anyone signed out to /signin carrying the page they wanted in `location.state.from`,
 * which SignIn reads and returns them to - so "Launch console" on the landing page still
 * ends at the console, with the sign-in step slotted in between rather than losing where
 * they were headed.
 *
 * The `loading` branch matters: `user` is null both while the first auth state is still
 * resolving and when there genuinely is nobody signed in. Redirecting on that first null
 * would bounce an already-signed-in user to the login screen on every hard refresh.
 */
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Matches the console's own boot state, so a signed-in user refreshing /console sees
    // one continuous loading screen rather than a flash of something else.
    return (
      <div className="console-root flex min-h-screen items-center justify-center bg-[var(--color-obs-bg)]">
        <div className="flex items-center gap-2.5 text-[13px] text-[var(--color-obs-text-muted)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-obs-green-primary)]" />
          Checking your session…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};
