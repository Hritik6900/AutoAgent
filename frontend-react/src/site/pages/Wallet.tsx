/**
 * The user's Algorand account, in full.
 *
 * Deliberately reachable signed out. Everything on this page — the account, the balance,
 * the funding, the signing — works from a key this browser generated, so gating it behind
 * Firebase would add a dependency the feature does not actually have. Signing in changes
 * one thing: the wallet is keyed to the account rather than to the device, so it survives
 * a sign-out and is recorded on the profile.
 *
 * The recovery phrase is treated as what it is: the only copy. It is hidden by default,
 * revealed on an explicit press, and the page says plainly that clearing site data
 * destroys the account — which is the honest consequence of nobody but the user holding
 * the key.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  Check,
  Copy,
  Coins,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Stamp,
  TriangleAlert,
  Wallet as WalletIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import {
  explorerAccountUrl,
  getFaucetStatus,
  getRecentTransactions,
  type AlgoTx,
  type FaucetStatus,
} from '../../lib/algorand';
import { Reveal } from '../components/primitives';
import { cn } from '../../utils/cn';

const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="btn-secondary shrink-0 px-4 py-2 text-[12.5px]"
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-[var(--color-signal)]" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

const PhaseBadge = ({ phase }: { phase: string }) => {
  const map: Record<string, { text: string; cls: string; spin?: boolean }> = {
    idle: { text: 'Starting…', cls: 'text-[var(--color-ink-4)]', spin: true },
    creating: { text: 'Creating wallet…', cls: 'text-[var(--tone-amber-text)]', spin: true },
    funding: { text: 'Funding from faucet…', cls: 'text-[var(--tone-amber-text)]', spin: true },
    ready: { text: 'Ready to sign', cls: 'text-[var(--tone-signal-text)]' },
    error: { text: 'Needs funding', cls: 'text-[var(--tone-warn-text)]' },
  };
  const s = map[phase] ?? map.idle;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[12.5px] font-semibold', s.cls)}>
      {s.spin ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : phase === 'ready' ? (
        <ShieldCheck className="h-3.5 w-3.5" />
      ) : (
        <TriangleAlert className="h-3.5 w-3.5" />
      )}
      {s.text}
    </span>
  );
};

export const WalletPage = () => {
  const { user } = useAuth();
  const { wallet, address, balanceAlgo, phase, error, busy, refresh, fund, scope } = useWallet();
  const [revealed, setRevealed] = useState(false);
  const [faucet, setFaucet] = useState<FaucetStatus | null>(null);
  const [txs, setTxs] = useState<AlgoTx[] | null>(null);
  const [loadingTxs, setLoadingTxs] = useState(false);

  useEffect(() => {
    getFaucetStatus()
      .then(setFaucet)
      .catch(() => setFaucet(null));
  }, []);

  const loadHistory = useCallback(async () => {
    if (!address) return;
    setLoadingTxs(true);
    try {
      setTxs(await getRecentTransactions(address));
    } finally {
      setLoadingTxs(false);
    }
  }, [address]);

  useEffect(() => {
    if (!address) return;
    // The indexer trails the node by a block or two, so a wallet funded seconds ago often
    // has nothing yet on the first read. One delayed retry covers that without polling.
    void loadHistory();
    const t = window.setTimeout(() => void loadHistory(), 4000);
    return () => window.clearTimeout(t);
  }, [address, loadHistory]);

  // The phrase is only ever rendered on an explicit reveal, and re-hides on unmount so it
  // is never left on screen behind a navigation.
  useEffect(() => () => setRevealed(false), []);

  return (
    <section className="pt-36 pb-24 sm:pt-40">
      <div className="site-container">
        <Reveal>
          <div className="flex items-center justify-between gap-6">
            <div className="eyebrow">Algorand TestNet</div>
            <PhaseBadge phase={phase} />
          </div>
          <h1 className="mt-3 font-display text-[34px] font-extrabold leading-[1.08] tracking-[-0.025em] sm:text-[42px]">
            Your wallet
          </h1>
          <p className="lede mt-4 max-w-[62ch]">
            Generated in this browser, funded automatically, and controlled by a key that
            never leaves your device. It signs the integrity anchor on any report you finish.
          </p>
        </Reveal>

        {/* ---------- balance + address ---------- */}
        <Reveal delay={0.05}>
          <div className="card mt-10 overflow-hidden">
            <div className="grid gap-0 sm:grid-cols-[1.1fr_0.9fr]">
              {/* balance */}
              <div className="border-b border-[var(--color-line)] p-7 sm:border-b-0 sm:border-r">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-4)]">
                  <Coins className="h-3.5 w-3.5" />
                  Balance
                </div>
                <div className="mono mt-3 flex items-baseline gap-2">
                  <span className="text-[42px] font-semibold leading-none tracking-[-0.03em] text-[var(--color-ink)]">
                    {balanceAlgo.toFixed(3)}
                  </span>
                  <span className="text-[16px] font-medium text-[var(--color-ink-3)]">ALGO</span>
                </div>
                <div className="mt-2 text-[12.5px] text-[var(--color-ink-4)]">
                  ≈ {Math.floor(Math.max(balanceAlgo - 0.1, 0) / 0.001).toLocaleString()} report
                  anchors at 0.001 ALGO each
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={refresh} disabled={busy} className="btn-secondary px-5 py-2.5 text-[13px] disabled:opacity-50">
                    <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
                    Refresh
                  </button>
                  <button onClick={fund} disabled={busy} className="btn-primary px-5 py-2.5 text-[13px] disabled:opacity-50">
                    <Coins className="h-3.5 w-3.5" />
                    Top up
                  </button>
                </div>
              </div>

              {/* address */}
              <div className="p-7">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-4)]">
                  <WalletIcon className="h-3.5 w-3.5" />
                  Address
                </div>
                {address ? (
                  <>
                    <div className="mono mt-3 break-all rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3.5 py-3 text-[12px] leading-relaxed text-[var(--color-ink-2)]">
                      {address}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <CopyButton value={address} label="address" />
                      <a
                        href={explorerAccountUrl(address)}
                        target="_blank"
                        rel="noreferrer"
                        className="group inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--tone-amber-text)]"
                      >
                        View on Lora explorer
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    </div>
                    <div className="mt-4 text-[11.5px] text-[var(--color-ink-4)]">
                      {scope === 'account' ? (
                        <>
                          Linked to <span className="font-semibold text-[var(--color-ink-3)]">{user?.email}</span> — it
                          comes back when you sign in on this browser.
                        </>
                      ) : (
                        <>
                          Held for this browser only.{' '}
                          <Link
                            to="/signin"
                            className="font-semibold text-[var(--color-ink-2)] underline decoration-[var(--color-line-2)] underline-offset-4"
                          >
                            Sign in
                          </Link>{' '}
                          to keep it with your account.
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mt-3 flex items-center gap-2 text-[13px] text-[var(--color-ink-3)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating…
                  </div>
                )}
              </div>
            </div>
          </div>
        </Reveal>

        {error && (
          <Reveal delay={0.06}>
            <div className="mt-4 rounded-2xl border border-[var(--tone-warn-border)] bg-[var(--tone-warn-bg)] px-5 py-4">
              <p className="text-[13.5px] font-semibold text-[var(--tone-warn-text)]">
                Automatic funding didn't complete
              </p>
              <p className="prose-body mt-1.5 text-[13px]">{error}</p>
              <a
                href="https://lora.algokit.io/testnet/fund"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--tone-warn-text)]"
              >
                Fund it yourself at the public dispenser
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </Reveal>
        )}

        {/* ---------- recovery phrase + how it works ---------- */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal delay={0.08}>
            <div className="card h-full p-7">
              <div className="flex items-center gap-2.5">
                <KeyRound className="h-4 w-4 text-[var(--tone-amber-text)]" />
                <h2 className="text-[17px] font-bold text-[var(--color-ink)]">Recovery phrase</h2>
              </div>
              <p className="prose-body mt-2 text-[13px]">
                The only copy. It is not on our servers, not in your profile, and not
                recoverable by us — which is the point, and also the risk. Clearing this
                browser's site data destroys the account.
              </p>

              {wallet ? (
                <>
                  <div
                    className={cn(
                      'mono mt-5 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-4 text-[12.5px] leading-[1.9] text-[var(--color-ink-2)] transition',
                      !revealed && 'select-none blur-[6px]',
                    )}
                    aria-hidden={!revealed}
                  >
                    {revealed
                      ? wallet.mnemonic
                      : 'word word word word word word word word word word word word word word word word word word word word word word word word word'}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => setRevealed((v) => !v)}
                      className="btn-secondary px-5 py-2.5 text-[13px]"
                    >
                      {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {revealed ? 'Hide' : 'Reveal'}
                    </button>
                    {revealed && <CopyButton value={wallet.mnemonic} label="recovery phrase" />}
                  </div>
                </>
              ) : (
                <p className="prose-body mt-4 text-[13px]">No wallet on this device yet.</p>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="card h-full p-7">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[var(--tone-amber-text)]" />
                <h2 className="text-[17px] font-bold text-[var(--color-ink)]">Why two chains</h2>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-[12.5px] font-bold text-[var(--color-ink)]">
                    Base Sepolia — what the agent spends
                  </div>
                  <p className="prose-body mt-1 text-[12.5px]">
                    Every x402 micropayment to a research microservice settles in USDC there,
                    signed by the orchestrator's own wallet. x402's gasless authorisation is
                    an EVM standard, so that half stays on an EVM chain.
                  </p>
                </div>
                <div>
                  <div className="text-[12.5px] font-bold text-[var(--color-ink)]">
                    Algorand — what you can prove
                  </div>
                  <p className="prose-body mt-1 text-[12.5px]">
                    Your own account, your own key, one flat 0.001 ALGO fee and three-second
                    finality. It anchors the hash of a finished report so its integrity does
                    not rest on trusting us.
                  </p>
                </div>
              </div>

              {faucet?.configured && (
                <div className="mt-6 border-t border-[var(--color-line)] pt-4">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-4)]">
                    Demo faucet
                  </div>
                  <div className="mono mt-1.5 text-[12px] text-[var(--color-ink-3)]">
                    {faucet.balanceAlgo.toFixed(2)} ALGO available ·{' '}
                    {faucet.fundAmountAlgo} per new wallet
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>

        {/* ---------- activity ---------- */}
        <Reveal delay={0.12}>
          <div className="card mt-4 p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Activity className="h-4 w-4 text-[var(--tone-amber-text)]" />
                <h2 className="text-[17px] font-bold text-[var(--color-ink)]">On-chain activity</h2>
              </div>
              <button
                onClick={loadHistory}
                disabled={loadingTxs}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--color-ink-3)] hover:text-[var(--color-ink)] disabled:opacity-50"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', loadingTxs && 'animate-spin')} />
                Reload
              </button>
            </div>

            {txs === null ? (
              <p className="prose-body mt-4 text-[13px]">Reading the chain…</p>
            ) : txs.length === 0 ? (
              <p className="prose-body mt-4 text-[13px]">
                Nothing yet — the faucet transfer appears here once it is indexed, and every
                report you anchor after that.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-[var(--color-line)]">
                {txs.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3 first:pt-0 last:pb-0">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold',
                        t.anchoredHash
                          ? 'border-[var(--tone-amber-border)] bg-[var(--tone-amber-bg)] text-[var(--tone-amber-text)]'
                          : 'border-[var(--tone-signal-border)] bg-[var(--tone-signal-bg)] text-[var(--tone-signal-text)]',
                      )}
                    >
                      {t.anchoredHash ? <Stamp className="h-3 w-3" /> : <Coins className="h-3 w-3" />}
                      {t.anchoredHash ? 'Report anchor' : t.incoming ? 'Faucet top-up' : 'Payment'}
                    </span>

                    <span className="mono min-w-0 flex-1 truncate text-[11.5px] text-[var(--color-ink-3)]">
                      {t.anchoredHash ?? t.id}
                    </span>

                    <span className="mono text-[11.5px] text-[var(--color-ink-4)]">
                      {t.amountAlgo > 0 ? `${t.incoming ? '+' : '−'}${t.amountAlgo.toFixed(3)}` : `−${t.feeAlgo.toFixed(3)}`} ALGO
                    </span>

                    <a
                      href={t.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--tone-amber-text)]"
                    >
                      Lora
                      <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.14}>
          <p className="mt-8 text-center text-[12.5px] text-[var(--color-ink-4)]">
            TestNet only — these ALGO have no value.{' '}
            <Link
              to="/console"
              className="font-semibold text-[var(--color-ink-2)] underline decoration-[var(--color-line-2)] underline-offset-4"
            >
              Run a report
            </Link>{' '}
            and anchor it.
          </p>
        </Reveal>
      </div>
    </section>
  );
};
