import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Receipt, Settings, Sparkles, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';

/** Avatar + dropdown when signed in; a plain "Sign in" link when not.
 *  Renders nothing at all while auth is still resolving, so the nav never flickers
 *  "Sign in" at someone who is already signed in. */
export const UserMenu = () => {
  const { user, profile, loading, signOut } = useAuth();
  const { balanceAlgo, phase: walletPhase } = useWallet();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (loading) return <span className="h-9 w-9 shrink-0" aria-hidden="true" />;

  if (!user) {
    return (
      <Link
        to="/signin"
        className="hidden rounded-full border border-[var(--color-line)] bg-[var(--color-paper-2)] px-4 py-2 text-[13px] font-semibold text-[var(--color-ink-2)] transition-all duration-200 hover:border-[var(--color-line-2)] hover:text-[var(--color-ink)] sm:inline-flex"
      >
        Sign in
      </Link>
    );
  }

  const name = profile?.profile.fullName || user.displayName || user.email || '';
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[var(--color-line)] transition-all duration-200 hover:border-[var(--color-line-2)]"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-[var(--tone-amber-bg)] text-[13px] font-bold text-[var(--tone-amber-text)]">
            {initial}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] w-[248px] overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--nav-surface)] shadow-[var(--shadow-card-hover)] backdrop-blur-2xl"
          >
            <div className="border-b border-[var(--color-line)] px-4 py-3">
              <div className="truncate text-[13.5px] font-semibold text-[var(--color-ink)]">{name}</div>
              <div className="mono truncate text-[11.5px] text-[var(--color-ink-4)]">{user.email}</div>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-ink-3)]">
                <Sparkles className="h-3.5 w-3.5" />
                {profile?.usage.jobCount ?? 0} jobs
              </span>
              <span className="mono inline-flex items-center gap-1.5 text-[11.5px] text-[var(--tone-amber-text)]">
                <Receipt className="h-3.5 w-3.5" />${(profile?.usage.totalSpentUsdc ?? 0).toFixed(4)}
              </span>
            </div>

            {/* The Algorand balance sits next to the USDC figure above on purpose: the two
                numbers are the user's two relationships to the system - what the agent has
                spent on their behalf, and what they hold to sign with themselves. */}
            <div className="flex items-center justify-between border-t border-[var(--color-line)] px-4 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-ink-3)]">
                <Wallet className="h-3.5 w-3.5" />
                Algorand
              </span>
              <span className="mono text-[11.5px] text-[var(--color-ink-2)]">
                {walletPhase === 'ready' ? `${balanceAlgo.toFixed(3)} ALGO` : 'preparing…'}
              </span>
            </div>

            <div className="border-t border-[var(--color-line)] p-1.5">
              <Link
                to="/wallet"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-medium text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
              >
                <Wallet className="h-3.5 w-3.5" />
                Wallet
              </Link>
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-medium text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
              >
                <Settings className="h-3.5 w-3.5" />
                Account
              </Link>
              <button
                onClick={() => {
                  setOpen(false);
                  void signOut();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] font-medium text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
