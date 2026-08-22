import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Loader2, Lock, Mail, User as UserIcon } from 'lucide-react';
import { useAuth, authErrorMessage } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

type Mode = 'signin' | 'signup' | 'reset';

const GoogleMark = () => (
  <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.3 17.6 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.4c-.5 2.9-2.1 5.4-4.5 7l7.6 5.9c4.4-4.1 6.6-10.1 6.6-17.2z" />
    <path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.4 0-11.7-3.8-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

/* Signing in is now required to reach the console, so the page should say what it hands
   over rather than only what it withholds. The wallet leads: it is the one thing that
   happens *for* you the moment you arrive. */
const PERKS = [
  'An Algorand testnet wallet, created and funded for you on arrival',
  'Your finished reports are saved — the orchestrator forgets them on restart',
  'Your budget, default provider tier and API key prefix travel with you',
];

export const SignIn = () => {
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  /* Straight to the console once signed in. `from` is set by RequireAuth when someone was
     bounced off a gated route, so being sent here from /console returns them to /console;
     signing in directly from the nav lands there too, since running the agent is the
     reason to have an account at all. */
  const redirectTo = (location.state as { from?: string } | null)?.from || '/console';

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'form' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy('form');
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, name);
        navigate(redirectTo, { replace: true });
      } else if (mode === 'signin') {
        await signInWithEmail(email, password);
        navigate(redirectTo, { replace: true });
      } else {
        await resetPassword(email);
        setSent(true);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  /* Someone already signed in has no business on this page - they land here by using the
     back button after signing in, or by following a stale link. Send them where they were
     going instead of showing a login form to a logged-in user. Guarded on `loading` so a
     hard refresh doesn't redirect during the moment before auth resolves. */
  if (!loading && user) {
    return <Navigate to={redirectTo} replace />;
  }

  const google = async () => {
    setError(null);
    setBusy('google');
    try {
      await signInWithGoogle();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const field =
    'w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3.5 py-2.5 pl-10 text-[14px] text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-ink-4)] focus:border-[var(--tone-amber-border)]';

  return (
    <section className="relative overflow-hidden pt-36 pb-24 sm:pt-40">
      {/* the same focused warm light the hero sits in */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div
          className="hero-glow absolute left-1/2 top-[2%] h-[460px] w-[720px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(closest-side, var(--amb-1), transparent 72%)' }}
        />
      </div>

      <div className="site-container">
        <div className="mx-auto grid max-w-[980px] items-center gap-12 lg:grid-cols-[1fr_420px]">
          {/* ---------- why bother ---------- */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block"
          >
            <div className="eyebrow">Account</div>
            <h1 className="mt-4 font-display text-[38px] font-extrabold leading-[1.08] tracking-[-0.03em]">
              Put the agent
              <br />
              to work.
            </h1>
            <p className="lede mt-5 max-w-[420px] text-[16px]">
              Signing in opens the console, and sets you up with a testnet wallet of your
              own — no faucet, no browser extension, nothing to install.
            </p>
            <ul className="mt-8 space-y-3">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--tone-amber-border)] bg-[var(--tone-amber-bg)]">
                    <Check className="h-3 w-3 text-[var(--tone-amber-text)]" />
                  </span>
                  <span className="text-[13.5px] leading-relaxed text-[var(--color-ink-2)]">{p}</span>
                </li>
              ))}
            </ul>
            <p className="mono mt-8 text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-4)]">
              Base Sepolia · testnet only
            </p>
          </motion.div>

          {/* ---------- the form ---------- */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="card p-7">
              <h2 className="text-[20px] font-bold tracking-tight text-[var(--color-ink)]">
                {mode === 'signup' ? 'Create an account' : mode === 'reset' ? 'Reset password' : 'Sign in'}
              </h2>
              <p className="prose-body mt-1.5 text-[13px]">
                {mode === 'signup'
                  ? 'Free. No card, no wallet.'
                  : mode === 'reset'
                    ? 'We’ll email you a reset link.'
                    : 'Welcome back.'}
              </p>

              {mode !== 'reset' && (
                <>
                  <button
                    type="button"
                    onClick={google}
                    disabled={busy !== null}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-2)] px-4 py-2.5 text-[14px] font-semibold text-[var(--color-ink)] transition-all hover:border-[var(--color-line-2)] hover:-translate-y-px disabled:opacity-50"
                  >
                    {busy === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
                    Continue with Google
                  </button>

                  <div className="my-5 flex items-center gap-3">
                    <span className="h-px flex-1 bg-[var(--color-line)]" />
                    <span className="mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-ink-4)]">
                      or
                    </span>
                    <span className="h-px flex-1 bg-[var(--color-line)]" />
                  </div>
                </>
              )}

              <form onSubmit={submit} className="space-y-3">
                {mode === 'signup' && (
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-4)]" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      className={field}
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-4)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={field}
                  />
                </div>

                {mode !== 'reset' && (
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-4)]" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'At least 6 characters' : 'Password'}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      className={field}
                    />
                  </div>
                )}

                {error && (
                  <p className="rounded-xl border border-[var(--tone-danger-border)] bg-[var(--tone-danger-bg)] px-3.5 py-2.5 text-[12.5px] text-[var(--tone-danger-text-strong)]">
                    {error}
                  </p>
                )}

                {sent && (
                  <p className="rounded-xl border border-[var(--tone-signal-border)] bg-[var(--tone-signal-bg)] px-3.5 py-2.5 text-[12.5px] text-[var(--tone-signal-text)]">
                    Reset link sent. Check your inbox.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy !== null}
                  className="btn-primary w-full py-3 disabled:opacity-50"
                >
                  {busy === 'form' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signup' ? 'signin' : 'signup');
                    setError(null);
                    setSent(false);
                  }}
                  className="font-semibold text-[var(--color-ink-2)] underline decoration-[var(--color-line-2)] underline-offset-4 transition-colors hover:text-[var(--color-ink)]"
                >
                  {mode === 'signup' ? 'Already have an account?' : 'Create an account'}
                </button>

                {mode !== 'reset' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setError(null);
                    }}
                    className="text-[var(--color-ink-4)] transition-colors hover:text-[var(--color-ink-2)]"
                  >
                    Forgot password?
                  </button>
                )}
                {mode === 'reset' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setError(null);
                      setSent(false);
                    }}
                    className="text-[var(--color-ink-4)] transition-colors hover:text-[var(--color-ink-2)]"
                  >
                    Back to sign in
                  </button>
                )}
              </div>
            </div>

            {/* No "continue without an account" escape hatch: /console is gated now, so
                that link would bounce straight back here. */}
            <p className={cn('mt-4 text-center text-[12px] text-[var(--color-ink-4)]')}>
              Just looking?{' '}
              <Link
                to="/how-it-works"
                className="font-semibold text-[var(--color-ink-3)] underline decoration-[var(--color-line-2)] underline-offset-4 transition-colors hover:text-[var(--color-ink)]"
              >
                See how it works first
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
