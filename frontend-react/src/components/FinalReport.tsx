import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { ArrowUpRight, FileText, ShieldCheck, Stamp } from 'lucide-react';
import type { Citation } from '../api/client';
import { useAgent } from '../context/AgentContext';
import { cn } from '../utils/cn';

const CONFIDENCE: Record<string, { bg: string; text: string; border: string }> = {
  strong: { bg: 'bg-[var(--tone-signal-bg)]', text: 'text-[var(--tone-signal-text)]', border: 'border-[var(--tone-signal-border)]' },
  moderate: { bg: 'bg-[var(--tone-amber-bg)]', text: 'text-[var(--tone-amber-text)]', border: 'border-[var(--tone-amber-border)]' },
  weak: { bg: 'bg-[var(--tone-danger-bg)]', text: 'text-[var(--tone-danger-text-strong)]', border: 'border-[var(--tone-danger-border)]' },
};

export const FinalReport = () => {
  const { report, status } = useAgent();

  const breakdown = useMemo(() => {
    if (!report) return [];
    const byService = new Map<string, number>();
    for (const c of report.citations) {
      byService.set(c.source_service, (byService.get(c.source_service) ?? 0) + (c.cost_usdc ?? 0));
    }
    return [...byService.entries()].sort((a, b) => b[1] - a[1]);
  }, [report]);

  if (status !== 'completed' || !report) return null;

  const trustPct = report.trust_score !== null ? Math.round(report.trust_score * 100) : null;

  return (
    <section className="border-t border-[var(--color-line)] bg-[var(--color-paper-2)]/55 backdrop-blur-[2px]">
      <div className="mx-auto max-w-[1240px] px-5 py-14">
        {/* ---- header ---- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-8 lg:grid-cols-[1.4fr_auto] lg:items-center"
        >
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--tone-signal-border)] bg-[var(--tone-signal-bg)] px-3 py-1.5 text-[12px] font-semibold text-[var(--tone-signal-text)]">
              <FileText className="h-3.5 w-3.5" />
              Report ready · fully paid for
            </span>
            <h2 className="mt-5 max-w-[680px] font-display text-[30px] font-extrabold leading-[1.14] tracking-[-0.02em] sm:text-[36px]">
              {report.query}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {trustPct !== null && <TrustDial pct={trustPct} weak={report.weak_claims_count} />}
            <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] px-5 py-4">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-ink-4)]">
                Total spent
              </div>
              <div className="mono mt-1.5 text-[24px] font-semibold text-[var(--color-ink)]">
                ${report.total_spent_usdc.toFixed(4)}
              </div>
              <div className="mt-0.5 text-[11.5px] text-[var(--color-ink-4)]">
                across {report.citations.length} cited claims
              </div>
            </div>
          </div>
        </motion.div>

        {/* ---- provenance ---- */}
        {report.provenance_tx_hash && (
          <a
            href={report.provenance_explorer_url ?? '#'}
            target="_blank"
            rel="noreferrer"
            className="group mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--tone-brand-border)] bg-[var(--tone-brand-bg)] px-5 py-4"
          >
            <Stamp className="h-4 w-4 shrink-0 text-[var(--tone-brand-text)]" />
            <span className="text-[13.5px] font-semibold text-[var(--tone-brand-text-strong)]">
              This exact report is hashed on-chain
            </span>
            <span className="mono truncate text-[11.5px] text-[var(--tone-brand-text)]/70">{report.report_hash?.slice(0, 28)}…</span>
            <span className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--tone-brand-text)]">
              Verify
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </a>
        )}

        {/* ---- body ---- */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          {/* article */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="card p-7 sm:p-10"
          >
            <div
              className={cn(
                'max-w-none',
                '[&_h1]:font-display [&_h1]:text-[27px] [&_h1]:leading-tight [&_h1]:tracking-tight [&_h1]:mb-5 [&_h1]:mt-0',
                '[&_h2]:font-display [&_h2]:text-[21px] [&_h2]:tracking-tight [&_h2]:mt-9 [&_h2]:mb-3',
                '[&_h3]:font-display [&_h3]:text-[17px] [&_h3]:mt-7 [&_h3]:mb-2.5',
                '[&_p]:text-[15.5px] [&_p]:leading-[1.78] [&_p]:text-[var(--color-ink-2)] [&_p]:mb-4',
                '[&_ul]:my-4 [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:list-disc',
                '[&_ol]:my-4 [&_ol]:space-y-2 [&_ol]:pl-5 [&_ol]:list-decimal',
                '[&_li]:text-[15px] [&_li]:leading-[1.7] [&_li]:text-[var(--color-ink-2)]',
                '[&_li::marker]:text-[var(--color-ink-4)]',
                '[&_strong]:font-semibold [&_strong]:text-[var(--color-ink)]',
                '[&_a]:text-[var(--color-brand)] [&_a]:underline [&_a]:underline-offset-2',
                '[&_em]:text-[var(--color-ink-3)]',
                '[&_code]:mono [&_code]:text-[13px] [&_code]:bg-[var(--color-paper-3)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded',
                '[&_blockquote]:border-l-2 [&_blockquote]:border-[var(--color-line-2)] [&_blockquote]:pl-4 [&_blockquote]:italic',
              )}
            >
              <ReactMarkdown>{report.report_markdown}</ReactMarkdown>
            </div>
          </motion.article>

          {/* citations rail */}
          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14 }}
            className="space-y-4"
          >
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-paper-3)]/50 px-5 py-3.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-ink-3)]" />
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-ink-2)]">
                  Paid citations
                </h3>
                <span className="mono ml-auto text-[11.5px] text-[var(--color-ink-4)]">
                  {report.citations.length}
                </span>
              </div>
              <div className="divide-y divide-[var(--color-line)]">
                {report.citations.map((c, i) => (
                  <CitationCard key={`${c.task_id}-${i}`} citation={c} />
                ))}
              </div>
            </div>

            {breakdown.length > 0 && (
              <div className="card p-5">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-ink-2)]">
                  Where the money went
                </h3>
                <div className="mt-4 space-y-2.5">
                  {breakdown.map(([service, cost]) => (
                    <div key={service} className="flex items-center gap-3">
                      <span className="w-[108px] shrink-0 truncate text-[12px] text-[var(--color-ink-3)]">
                        {service}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-line)]">
                        <motion.div
                          className="h-full rounded-full bg-[var(--color-signal)]"
                          initial={{ width: 0 }}
                          animate={{ width: `${(cost / report.total_spent_usdc) * 100}%` }}
                          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <span className="mono w-[62px] shrink-0 text-right text-[11.5px] text-[var(--color-ink-2)]">
                        ${cost.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 border-t border-[var(--color-line)] pt-3 text-[11.5px] leading-relaxed text-[var(--color-ink-4)]">
                  These add up to exactly ${report.total_spent_usdc.toFixed(4)} — the same figure
                  settled on-chain.
                </p>
              </div>
            )}
          </motion.aside>
        </div>
      </div>
    </section>
  );
};

const TrustDial = ({ pct, weak }: { pct: number; weak: number | null }) => {
  const color = pct >= 70 ? '#059669' : pct >= 45 ? '#D97706' : '#DC2626';
  const r = 30;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] px-5 py-4">
      <div className="relative h-[76px] w-[76px] shrink-0">
        <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
          <circle cx="38" cy="38" r={r} fill="none" stroke="var(--color-line)" strokeWidth="7" />
          <motion.circle
            cx="38"
            cy="38"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="mono text-[17px] font-semibold" style={{ color }}>
            {pct}%
          </span>
        </div>
      </div>
      <div>
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-ink-4)]">
          Self-critique
        </div>
        <div className="mt-1 text-[13.5px] font-semibold text-[var(--color-ink)]">Trust score</div>
        <div className="mt-0.5 text-[11.5px] text-[var(--color-ink-3)]">
          {weak ? `${weak} weak claim${weak === 1 ? '' : 's'} flagged` : 'no weak claims'}
        </div>
      </div>
    </div>
  );
};

const CitationCard = ({ citation }: { citation: Citation }) => {
  const conf = citation.review_confidence ? CONFIDENCE[citation.review_confidence] : null;

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink-3)]">
          {citation.source_service}
        </span>
        <span className="mono shrink-0 text-[11.5px] font-semibold text-[var(--color-signal)]">
          ${citation.cost_usdc?.toFixed(4)}
        </span>
      </div>

      <p className="mt-2.5 border-l-2 border-[var(--color-line-2)] pl-3 text-[12.5px] leading-relaxed text-[var(--color-ink-2)]">
        {citation.claim.length > 190 ? `${citation.claim.slice(0, 190)}…` : citation.claim}
      </p>

      {citation.review_note && (
        <p className="mt-2 text-[11.5px] italic text-[var(--color-ink-4)]">{citation.review_note}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {conf && (
          <span
            className={cn(
              'rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              conf.bg,
              conf.text,
              conf.border,
            )}
          >
            {citation.review_confidence}
          </span>
        )}
        {citation.source_url && (
          <a
            href={citation.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-ink-3)] transition-colors hover:text-[var(--color-ink)]"
          >
            Source
            <ArrowUpRight className="h-3 w-3" />
          </a>
        )}
        {citation.tx_hash && (
          <a
            href={`https://sepolia.basescan.org/tx/${citation.tx_hash}`}
            target="_blank"
            rel="noreferrer"
            className="mono ml-auto inline-flex items-center gap-1 text-[10.5px] text-[var(--color-ink-4)] transition-colors hover:text-[var(--color-ink)]"
          >
            {citation.tx_hash.slice(0, 10)}…
            <ArrowUpRight className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
};
