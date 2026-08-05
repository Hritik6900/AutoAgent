import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Check, Lock, Send, Wallet } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useNetworkStats } from '../hooks/useNetworkStats';

/** The four beats of a real x402 exchange. The animation is a loop, but the hash it
 *  lands on is pulled from the live ledger whenever one exists, so what you see settle
 *  is a transaction that genuinely happened. */
const STEPS = [
  {
    key: 'request',
    icon: Send,
    label: 'POST /api/search',
    detail: 'Agent requests a paid service',
    tone: 'neutral',
  },
  {
    key: '402',
    icon: Lock,
    label: '402 Payment Required',
    detail: 'Server quotes its price in USDC',
    tone: 'ember',
  },
  {
    key: 'sign',
    icon: Wallet,
    label: 'EIP-3009 authorization signed',
    detail: 'Gasless transfer, signed by the agent wallet',
    tone: 'brand',
  },
  {
    key: 'settle',
    icon: Check,
    label: '200 OK · settled on Base Sepolia',
    detail: 'Results returned, payment on-chain',
    tone: 'signal',
  },
] as const;

const TONES: Record<string, { dot: string; ring: string; text: string }> = {
  neutral: { dot: 'bg-white/30', ring: 'ring-white/10', text: 'text-white/70' },
  ember: { dot: 'bg-[#FB923C]', ring: 'ring-[#FB923C]/30', text: 'text-[#FDBA74]' },
  brand: { dot: 'bg-[#FCD34D]', ring: 'ring-[#FCD34D]/30', text: 'text-[#FDE68A]' },
  signal: { dot: 'bg-[#34D399]', ring: 'ring-[#34D399]/30', text: 'text-[#6EE7B7]' },
};

export const HeroPaymentCard = () => {
  const [active, setActive] = useState(0);
  const { stats } = useNetworkStats(20000);
  const latest = stats?.recent?.[0];

  useEffect(() => {
    const id = window.setInterval(() => setActive((i) => (i + 1) % STEPS.length), 1900);
    return () => window.clearInterval(id);
  }, []);

  const price = latest ? `$${latest.amount_usdc.toFixed(4)}` : '$0.0022';

  return (
    <div className="relative mx-auto max-w-[980px]">
      <div
        className="relative overflow-hidden rounded-[28px] p-[1px] shadow-[0_40px_100px_-30px_rgba(11,11,15,0.45)]"
        /* 1px gradient hairline framing the panel, plus two blurred fields behind it.
           Tokenised because this terminal is dark in both themes: light keeps its warm
           ember-to-green run, dark gets a near-white edge with a single amber stop. */
        style={{ background: 'var(--hero-card-frame)' }}
      >
        <div className="relative overflow-hidden rounded-[27px] bg-[var(--cockpit-bg)]">
          <div className="absolute inset-0 grid-bg opacity-[0.07]" />
          <div
            className="absolute -left-24 -top-24 h-72 w-72 rounded-full blur-[90px]"
            style={{
              background: 'radial-gradient(closest-side, var(--hero-card-glow-1), transparent)',
              opacity: 'var(--hero-card-glow-opacity)',
            }}
          />
          <div
            className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full blur-[90px]"
            style={{
              background: 'radial-gradient(closest-side, var(--hero-card-glow-2), transparent)',
              opacity: 'var(--hero-card-glow-opacity)',
            }}
          />

          {/* window chrome */}
          <div className="relative flex items-center gap-2 border-b border-white/[0.07] px-5 py-3.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            <span className="mono ml-3 text-[11.5px] text-white/40">x402 payment handshake</span>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#34D399]" />
              <span className="mono text-[10.5px] text-white/50">base-sepolia</span>
            </span>
          </div>

          <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-[1.25fr_1fr]">
            {/* left: the four beats */}
            <div className="space-y-2.5">
              {STEPS.map((s, i) => {
                const tone = TONES[s.tone];
                const isActive = i === active;
                const isDone = i < active;
                return (
                  <motion.div
                    key={s.key}
                    animate={{
                      opacity: isActive ? 1 : isDone ? 0.62 : 0.32,
                      scale: isActive ? 1 : 0.995,
                    }}
                    transition={{ duration: 0.35 }}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors',
                      isActive ? 'border-white/15 bg-white/[0.055]' : 'border-white/[0.06] bg-white/[0.02]',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1',
                        isActive ? tone.ring : 'ring-white/10',
                        'bg-white/[0.06]',
                      )}
                    >
                      <s.icon className={cn('h-3.5 w-3.5', isActive ? tone.text : 'text-white/45')} />
                    </span>
                    <div className="min-w-0">
                      <div className={cn('mono text-[12.5px] font-medium', isActive ? 'text-white' : 'text-white/65')}>
                        {s.label}
                      </div>
                      <div className="mt-0.5 text-[12px] leading-snug text-white/40">{s.detail}</div>
                    </div>
                    {isActive && (
                      <motion.span
                        layoutId="hero-beat"
                        className={cn('mt-3 h-1.5 w-1.5 shrink-0 rounded-full', tone.dot)}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* right: settlement receipt */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
                  Amount authorized
                </div>
                <div className="mono mt-2 text-[34px] font-semibold leading-none text-white">{price}</div>
                <div className="mt-1.5 text-[12px] text-white/40">USDC · gasless transfer</div>
              </div>

              <div className="h-px bg-white/[0.08]" />

              <div className="min-h-[86px]">
                <AnimatePresence mode="wait">
                  {active === STEPS.length - 1 ? (
                    <motion.div
                      key="settled"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/25 bg-[#34D399]/10 px-2.5 py-1">
                        <Check className="h-3 w-3 text-[#6EE7B7]" />
                        <span className="text-[11px] font-semibold text-[#6EE7B7]">Settled on-chain</span>
                      </div>
                      {latest ? (
                        <a
                          href={latest.explorer_url}
                          target="_blank"
                          rel="noreferrer"
                          className="group mt-3 block"
                        >
                          <div className="mono truncate text-[12px] text-white/70 transition-colors group-hover:text-white">
                            {latest.tx_hash}
                          </div>
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-white/45 transition-colors group-hover:text-white/80">
                            View on BaseScan
                            <ArrowUpRight className="h-3 w-3" />
                          </div>
                        </a>
                      ) : (
                        <div className="mono mt-3 text-[12px] leading-relaxed text-white/40">
                          Run a job to pin a real transaction hash here.
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="pending"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex h-full items-center"
                    >
                      <div className="w-full space-y-2">
                        <div className="h-2.5 w-2/3 animate-pulse rounded bg-white/[0.07]" />
                        <div className="h-2.5 w-full animate-pulse rounded bg-white/[0.05]" />
                        <div className="h-2.5 w-1/2 animate-pulse rounded bg-white/[0.04]" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
