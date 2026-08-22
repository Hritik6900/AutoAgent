/**
 * The two independent proofs a finished report carries, side by side.
 *
 * They are not redundant, and the layout exists to make that legible:
 *
 *   Base Sepolia — written by the *orchestrator's* wallet when the report was compiled.
 *     Proves the service published this exact text, and sits on the same chain that
 *     settled every x402 micropayment behind it. The reader has no part in it.
 *
 *   Algorand — written by the *reader's own* wallet, on demand, from a key that exists
 *     only in their browser. Proves that they held this exact report at a time the chain
 *     timestamps, independently of whether they trust the service at all.
 *
 * Same hash, two signers, two chains, two different claims. A report can carry either,
 * both, or neither: the Base receipt needs the deployment to hold TestNet ETH for gas,
 * and the Algorand anchor needs the reader to choose to sign one.
 */
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  Copy,
  Link2,
  Loader2,
  ShieldCheck,
  Stamp,
  TriangleAlert,
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { anchorReport, sha256Hex, shortAddress, verifyAnchor } from '../../lib/algorand';
import type { ReportResponse } from '../../api/client';
import { cn } from '../../utils/cn';

interface StoredAnchor {
  txId: string;
  explorerUrl: string;
  reportHash: string;
  confirmedRound: number;
}

/* Anchors are remembered per job so a page refresh (or navigating away and back) shows
   the existing one instead of inviting the user to pay for a second, identical anchor. */
const anchorKey = (jobId: string) => `autoresearch.algo.anchor.${jobId}`;

const loadAnchor = (jobId: string): StoredAnchor | null => {
  try {
    const raw = localStorage.getItem(anchorKey(jobId));
    return raw ? (JSON.parse(raw) as StoredAnchor) : null;
  } catch {
    return null;
  }
};

const ChainCard = ({
  chain,
  role,
  children,
  accent,
}: {
  chain: string;
  role: string;
  children: React.ReactNode;
  accent: 'brand' | 'signal';
}) => (
  <div className="flex flex-col rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'inline-flex h-6 w-6 items-center justify-center rounded-md border',
          accent === 'brand'
            ? 'border-[var(--tone-amber-border)] bg-[var(--tone-amber-bg)] text-[var(--tone-amber-text)]'
            : 'border-[var(--tone-signal-border)] bg-[var(--tone-signal-bg)] text-[var(--tone-signal-text)]',
        )}
      >
        {accent === 'brand' ? <Stamp className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-bold leading-tight text-[var(--color-ink)]">{chain}</div>
        <div className="text-[11px] leading-tight text-[var(--color-ink-4)]">{role}</div>
      </div>
    </div>
    <div className="mt-4 flex-1">{children}</div>
  </div>
);

const HashRow = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-4)]">
        {label}
      </div>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        }}
        className="group mt-1 flex w-full items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper-2)] px-2.5 py-1.5 text-left transition-colors hover:border-[var(--color-line-2)]"
      >
        <span className="mono min-w-0 flex-1 truncate text-[11px] text-[var(--color-ink-2)]">{value}</span>
        {copied ? (
          <Check className="h-3 w-3 shrink-0 text-[var(--color-signal)]" />
        ) : (
          <Copy className="h-3 w-3 shrink-0 text-[var(--color-ink-4)] opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </button>
    </div>
  );
};

export const DualChainProof = ({ report }: { report: ReportResponse }) => {
  const { wallet, address, balanceAlgo, phase } = useWallet();

  const [hash, setHash] = useState<string | null>(report.report_hash);
  const [anchor, setAnchor] = useState<StoredAnchor | null>(() => loadAnchor(report.job_id));
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);

  /* When the orchestrator could not write its own receipt (it needs TestNet ETH for gas,
     unlike the gasless x402 payments), there is no canonical hash to anchor. Rather than
     disable the feature, hash the report text here - the anchor then commits to the prose
     rather than to the full {markdown, citations, ledger} envelope, which the label below
     says explicitly rather than quietly narrowing what the proof covers. */
  const derivedHash = !report.report_hash;
  useEffect(() => {
    if (report.report_hash) {
      setHash(report.report_hash);
      return;
    }
    let cancelled = false;
    void sha256Hex(report.report_markdown).then((h) => !cancelled && setHash(h));
    return () => {
      cancelled = true;
    };
  }, [report.report_hash, report.report_markdown]);

  const sign = useCallback(async () => {
    if (!wallet || !hash) return;
    setSigning(true);
    setError(null);
    try {
      const result = await anchorReport(wallet, hash);
      const stored: StoredAnchor = {
        txId: result.txId,
        explorerUrl: result.explorerUrl,
        reportHash: result.reportHash,
        confirmedRound: result.confirmedRound,
      };
      setAnchor(stored);
      localStorage.setItem(anchorKey(report.job_id), JSON.stringify(stored));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signing failed.';
      // The one failure a user can actually act on, so it gets a sentence rather than
      // the node's raw "overspend" text.
      setError(
        /overspend|insufficient/i.test(msg)
          ? 'This wallet has no TestNet ALGO for the 0.001 fee. Top it up from the wallet page.'
          : msg,
      );
    } finally {
      setSigning(false);
    }
  }, [wallet, hash, report.job_id]);

  const check = useCallback(async () => {
    if (!anchor) return;
    setVerifying(true);
    try {
      const res = await verifyAnchor(anchor.txId, anchor.reportHash);
      setVerified(res.verified);
    } catch {
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  }, [anchor]);

  const walletReady = phase === 'ready' && !!wallet;

  /* The payments that actually settled. A step can appear in the ledger having failed or
     been skipped (budget, a provider that was down), and counting those would overstate
     what is verifiable on BaseScan - the tx hash is the proof, so its presence is the test. */
  const settled = report.payment_ledger.filter(
    (s) => !!s.tx_hash && (s.status === 'paid' || s.status === 'completed'),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="card mt-6 p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link2 className="h-4 w-4 text-[var(--tone-amber-text)]" />
        <h3 className="text-[15px] font-bold text-[var(--color-ink)]">Proof of this report</h3>
        <span className="chip">two chains · two signers</span>
      </div>
      <p className="prose-body mt-2 max-w-[68ch] text-[13px]">
        The same SHA-256, committed twice by two different parties. One says the service
        published it; the other says you held it — and needs no trust in the service at all.
      </p>

      {hash && (
        <div className="mt-5">
          <HashRow
            label={derivedHash ? 'Report hash (report text)' : 'Report hash (markdown + citations + ledger)'}
            value={hash}
          />
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {/* ---------------- Base Sepolia: what the agent spent ----------------
             Leads with the settlements rather than the provenance receipt. Every paid step
             of this job is already an on-chain transaction here, so this half of the panel
             is always backed by something real; the receipt is an *extra* commitment on
             top, and it needs TestNet ETH for gas because it carries calldata (the x402
             payments themselves are gasless). Showing only the receipt made a well-funded
             wallet look identical to a broken one whenever that gas was missing. */}
        <ChainCard chain="Base Sepolia" role="What the agent paid, settled on-chain" accent="brand">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--tone-signal-text)]">
              <BadgeCheck className="h-3.5 w-3.5" />
              {settled.length} settlement{settled.length === 1 ? '' : 's'} · $
              {report.total_spent_usdc.toFixed(4)} USDC
            </div>

            <p className="text-[11.5px] leading-relaxed text-[var(--color-ink-4)]">
              Every source behind this report was bought with a real USDC payment, each one
              its own transaction.
            </p>

            {settled[0]?.explorer_url && (
              <a
                href={settled[0].explorer_url}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--tone-amber-text)]"
              >
                View on BaseScan
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            )}

            <div className="border-t border-[var(--color-line)] pt-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-4)]">
                Provenance receipt
              </div>
              {report.provenance_tx_hash ? (
                <a
                  href={report.provenance_explorer_url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="mono mt-1 block truncate text-[11px] text-[var(--tone-amber-text)] hover:opacity-80"
                >
                  {report.provenance_tx_hash}
                </a>
              ) : (
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-ink-4)]">
                  Not written — it carries calldata, so unlike the payments above it needs
                  TestNet ETH for gas. The Algorand anchor covers the same hash.
                </p>
              )}
            </div>
          </div>
        </ChainCard>

        {/* ---------------- Algorand: the reader's own anchor ---------------- */}
        <ChainCard chain="Algorand TestNet" role="Signed by you, from your own key" accent="signal">
          {anchor ? (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--tone-signal-text)]">
                <BadgeCheck className="h-3.5 w-3.5" />
                Anchored in round {anchor.confirmedRound.toLocaleString()}
              </div>
              <div className="mono truncate text-[11px] text-[var(--color-ink-3)]">{anchor.txId}</div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={anchor.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--tone-amber-text)]"
                >
                  View on Lora
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
                <button
                  onClick={check}
                  disabled={verifying}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)] disabled:opacity-50"
                >
                  {verifying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : verified === true ? (
                    <Check className="h-3.5 w-3.5 text-[var(--color-signal)]" />
                  ) : verified === false ? (
                    <TriangleAlert className="h-3.5 w-3.5 text-[var(--tone-danger-text)]" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  {verified === true ? 'Hash matches' : verified === false ? 'Mismatch' : 'Re-read from chain'}
                </button>
              </div>
              {verified === true && (
                <p className="text-[11.5px] leading-relaxed text-[var(--color-ink-4)]">
                  Read back off-chain and compared: the note on this transaction is this
                  report's hash.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11.5px] leading-relaxed text-[var(--color-ink-4)]">
                Writes this hash into a transaction your browser signs. Costs 0.001 ALGO and
                moves nothing — the note field is the whole point.
              </p>

              <button
                onClick={sign}
                disabled={!walletReady || signing || !hash}
                className="btn-primary w-full px-5 py-2.5 text-[13px] disabled:opacity-50"
              >
                {signing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Signing &amp; confirming…
                  </>
                ) : (
                  <>
                    <Stamp className="h-3.5 w-3.5" />
                    Anchor on Algorand
                  </>
                )}
              </button>

              {address && (
                <div className="mono flex items-center justify-between text-[10.5px] text-[var(--color-ink-4)]">
                  <span>{shortAddress(address)}</span>
                  <span>{balanceAlgo.toFixed(3)} ALGO</span>
                </div>
              )}
              {!walletReady && (
                <p className="text-[11px] text-[var(--color-ink-4)]">
                  {phase === 'creating'
                    ? 'Creating your wallet…'
                    : phase === 'funding'
                      ? 'Funding your wallet from the demo faucet…'
                      : 'Wallet not ready yet.'}
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--tone-danger-text)]">{error}</p>
          )}
        </ChainCard>
      </div>
    </motion.div>
  );
};
