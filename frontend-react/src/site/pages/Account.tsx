import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  Gauge,
  KeyRound,
  Loader2,
  LogOut,
  Receipt,
  Save,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  listFactChecks,
  listJobs,
  updateAutoResearch,
  updatePreferences,
  updateProfile,
  type SavedFactCheck,
  type SavedJob,
} from '../../lib/userStore';
import { Reveal } from '../components/primitives';
import { cn } from '../../utils/cn';

const field =
  'w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3.5 py-2.5 text-[13.5px] text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-ink-4)] focus:border-[var(--tone-amber-border)]';

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-4)]">
    {children}
  </label>
);

const short = (h: string | null, n = 14) => (h ? `${h.slice(0, n)}…` : '—');

const when = (ts: { toDate?: () => Date } | null) => {
  try {
    return ts?.toDate ? ts.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';
  } catch {
    return '—';
  }
};

export const Account = () => {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [jobs, setJobs] = useState<SavedJob[] | null>(null);
  const [checks, setChecks] = useState<SavedFactCheck[] | null>(null);

  // Local edit buffer. Seeded from the profile once it arrives and then owned by the
  // form, so the live Firestore listener can't overwrite what is being typed.
  const [form, setForm] = useState({
    fullName: '',
    organization: '',
    role: '',
    country: '',
    website: '',
    bio: '',
    defaultBudgetUsdc: 0.05,
    defaultReportTier: 'auto' as 'auto' | 'premium' | 'cheap',
    autoSaveJobs: true,
    orchestratorUrl: 'http://localhost:4000',
  });
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!profile || seeded) return;
    setForm({
      fullName: profile.profile.fullName,
      organization: profile.profile.organization,
      role: profile.profile.role,
      country: profile.profile.country,
      website: profile.profile.website,
      bio: profile.profile.bio,
      defaultBudgetUsdc: profile.preferences.defaultBudgetUsdc,
      defaultReportTier: profile.preferences.defaultReportTier,
      autoSaveJobs: profile.preferences.autoSaveJobs,
      orchestratorUrl: profile.autoresearch.orchestratorUrl,
    });
    setSeeded(true);
  }, [profile, seeded]);

  const [storeDown, setStoreDown] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // History is best-effort - but a failed read and an empty list must not look the
    // same, or a broken database reads as "you have no reports yet".
    listJobs(user.uid, 8)
      .then((j) => !cancelled && setJobs(j))
      .catch(() => {
        if (cancelled) return;
        setJobs([]);
        setStoreDown(true);
      });
    listFactChecks(user.uid, 8)
      .then((f) => !cancelled && setChecks(f))
      .catch(() => {
        if (cancelled) return;
        setChecks([]);
        setStoreDown(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-ink-4)]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateProfile(user.uid, {
          fullName: form.fullName,
          organization: form.organization,
          role: form.role,
          country: form.country,
          website: form.website,
          bio: form.bio,
        }),
        updatePreferences(user.uid, {
          defaultBudgetUsdc: Number(form.defaultBudgetUsdc) || 0.05,
          defaultReportTier: form.defaultReportTier,
          autoSaveJobs: form.autoSaveJobs,
        }),
        updateAutoResearch(user.uid, { orchestratorUrl: form.orchestratorUrl }),
      ]);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      console.warn('[account] save failed', err);
    } finally {
      setSaving(false);
    }
  };

  const initial = (profile?.profile.fullName || user.displayName || user.email || '?')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <section className="pt-36 pb-24 sm:pt-40">
      <div className="site-container">
        {/* ---------- header ---------- */}
        <Reveal>
          <div className="flex flex-wrap items-center gap-5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-2xl border border-[var(--color-line)] object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--tone-amber-border)] bg-[var(--tone-amber-bg)] text-[24px] font-bold text-[var(--tone-amber-text)]">
                {initial}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[36px]">
                {profile?.profile.fullName || user.displayName || 'Your account'}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                <span className="mono text-[12.5px] text-[var(--color-ink-3)]">{user.email}</span>
                {user.emailVerified && (
                  <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--color-signal)]">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    verified
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="btn-secondary px-5 py-2.5 text-[13px]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </Reveal>

        {/* Auth can succeed while Firestore is unreachable - most often because the
            database was never created for the project. Say so, rather than showing an
            empty profile that looks like the user simply hasn't filled anything in. */}
        {storeDown && (
          <Reveal delay={0.03}>
            <div className="mt-8 rounded-2xl border border-[var(--tone-warn-border)] bg-[var(--tone-warn-bg)] px-5 py-4">
              <p className="text-[13.5px] font-semibold text-[var(--tone-warn-text)]">
                Profile storage is unreachable
              </p>
              <p className="prose-body mt-1.5 text-[13px]">
                You are signed in, but Cloud Firestore did not respond, so nothing here can be
                saved or loaded yet. Create the Firestore database in the Firebase console, then
                deploy the rules with{' '}
                <code className="mono">firebase deploy --only firestore:rules</code>.
              </p>
            </div>
          </Reveal>
        )}

        {/* ---------- usage ---------- */}
        <Reveal delay={0.05}>
          <div className="card-grid mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Research jobs', profile?.usage.jobCount ?? 0, Sparkles],
              ['Fact-checks', profile?.usage.factCheckCount ?? 0, BadgeCheck],
              ['Total spent', `$${(profile?.usage.totalSpentUsdc ?? 0).toFixed(4)}`, Receipt],
              ['Plan', profile?.plan.tier ?? 'free', Gauge],
            ].map(([label, value, Icon]) => {
              const I = Icon as typeof Sparkles;
              return (
                <div key={String(label)} className="card p-5">
                  <I className="h-4 w-4 text-[var(--tone-amber-text)]" />
                  <div className="mono mt-3 text-[22px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
                    {String(value)}
                  </div>
                  <div className="mt-0.5 text-[11px] uppercase tracking-[0.1em] text-[var(--color-ink-4)]">
                    {String(label)}
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          {/* ---------- profile + preferences ---------- */}
          <Reveal delay={0.08}>
            <div className="card h-full p-7">
              <h2 className="text-[17px] font-bold text-[var(--color-ink)]">Profile</h2>
              <p className="prose-body mt-1.5 text-[13px]">
                Only you can read this — see <code className="mono">firestore.rules</code>.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Full name</Label>
                  <input
                    className={field}
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <Label>Organization</Label>
                  <input
                    className={field}
                    value={form.organization}
                    onChange={(e) => setForm({ ...form, organization: e.target.value })}
                    placeholder="The Daily Ledger"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <input
                    className={field}
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="Investigative reporter"
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <input
                    className={field}
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="India"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Website</Label>
                  <input
                    className={field}
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://…"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Bio</Label>
                  <textarea
                    className={cn(field, 'min-h-[76px] resize-y')}
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="What do you research?"
                  />
                </div>
              </div>

              <h2 className="mt-9 text-[17px] font-bold text-[var(--color-ink)]">Defaults</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Default budget cap (USDC)</Label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.02"
                    max="0.30"
                    className={field}
                    value={form.defaultBudgetUsdc}
                    onChange={(e) => setForm({ ...form, defaultBudgetUsdc: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Report tier</Label>
                  <select
                    className={field}
                    value={form.defaultReportTier}
                    onChange={(e) =>
                      setForm({ ...form, defaultReportTier: e.target.value as typeof form.defaultReportTier })
                    }
                  >
                    <option value="auto">Auto (budget-aware)</option>
                    <option value="premium">Always premium</option>
                    <option value="cheap">Cost saver</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Orchestrator URL</Label>
                  <input
                    className={cn(field, 'mono text-[12.5px]')}
                    value={form.orchestratorUrl}
                    onChange={(e) => setForm({ ...form, orchestratorUrl: e.target.value })}
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.autoSaveJobs}
                    onChange={(e) => setForm({ ...form, autoSaveJobs: e.target.checked })}
                    className="h-4 w-4 accent-[var(--color-brand)]"
                  />
                  <span className="text-[13.5px] text-[var(--color-ink-2)]">
                    Save finished reports to my account
                  </span>
                </label>
              </div>

              <button onClick={save} disabled={saving} className="btn-primary mt-7 px-6 py-2.5 disabled:opacity-50">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saved ? 'Saved' : 'Save changes'}
              </button>
            </div>
          </Reveal>

          {/* ---------- key + history ---------- */}
          <div className="space-y-4">
            <Reveal delay={0.1}>
              <div className="card p-7">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="h-4 w-4 text-[var(--tone-amber-text)]" />
                  <h2 className="text-[17px] font-bold text-[var(--color-ink)]">API key</h2>
                </div>
                <p className="prose-body mt-2 text-[13px]">
                  Only the prefix is stored here. The key itself is a spending credential, so
                  it never leaves the machine that uses it.
                </p>
                <div className="mono mt-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3.5 py-2.5 text-[12.5px] text-[var(--color-ink-2)]">
                  {profile?.autoresearch.apiKeyPrefix || 'no key linked'}
                </div>
                <p className="prose-body mt-3 text-[12px]">
                  Mint one with{' '}
                  <code className="mono">python scripts/manage_keys.py create</code>.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="card p-7">
                <h2 className="text-[17px] font-bold text-[var(--color-ink)]">Saved reports</h2>
                {jobs === null ? (
                  <p className="prose-body mt-3 text-[13px]">Loading…</p>
                ) : jobs.length === 0 ? (
                  <p className="prose-body mt-3 text-[13px]">
                    Nothing yet. Finished jobs land here — the orchestrator itself forgets them
                    when it restarts.{' '}
                    <Link to="/console" className="font-semibold text-[var(--color-ink-2)] underline decoration-[var(--color-line-2)] underline-offset-4">
                      Run one
                    </Link>
                    .
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {jobs.map((j) => (
                      <li key={j.jobId} className="border-b border-[var(--color-line)] pb-3 last:border-0 last:pb-0">
                        <div className="line-clamp-1 text-[13.5px] font-semibold text-[var(--color-ink)]">
                          {j.query}
                        </div>
                        <div className="mono mt-1 flex flex-wrap gap-x-3 text-[11px] text-[var(--color-ink-4)]">
                          <span>{when(j.createdAt)}</span>
                          <span className="text-[var(--tone-amber-text)]">${j.totalSpentUsdc.toFixed(4)}</span>
                          <span>{j.citationCount} citations</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="card p-7">
                <h2 className="text-[17px] font-bold text-[var(--color-ink)]">Recent fact-checks</h2>
                {checks === null ? (
                  <p className="prose-body mt-3 text-[13px]">Loading…</p>
                ) : checks.length === 0 ? (
                  <p className="prose-body mt-3 text-[13px]">
                    None yet. Right-click any sentence on any page with the browser extension.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {checks.map((c, i) => (
                      <li key={i} className="border-b border-[var(--color-line)] pb-3 last:border-0 last:pb-0">
                        <div className="line-clamp-2 text-[13px] text-[var(--color-ink-2)]">{c.claim}</div>
                        <div className="mono mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-[var(--color-ink-4)]">
                          <span
                            className={cn(
                              c.verdict.includes('support')
                                ? 'text-[var(--color-signal)]'
                                : c.verdict.includes('disputed')
                                  ? 'text-[var(--tone-danger-text)]'
                                  : 'text-[var(--tone-amber-text)]',
                            )}
                          >
                            {c.verdict}
                          </span>
                          {c.explorerUrl && (
                            <a
                              href={c.explorerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[var(--tone-amber-text)] hover:opacity-80"
                            >
                              {short(c.txHash, 10)}
                              <ArrowUpRight className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
};
