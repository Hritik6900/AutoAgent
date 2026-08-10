import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { HeroPaymentCard } from './HeroPaymentCard';
import { OrchestrationStrip } from './OrchestrationStrip';
import { LiveDot } from './primitives';

/* Five near-invisible motes drifting behind the headline, each on its own duration and
   delay so they never move together - the closest thing to "the system is thinking"
   a static hero can carry without anyone consciously noticing why it feels alive. */
const MOTES = [
  { top: '18%', left: '28%', size: 3, op: 0.4, dur: 9, delay: 0, dx: 10 },
  { top: '32%', left: '68%', size: 2, op: 0.3, dur: 11, delay: 1.2, dx: -8 },
  { top: '58%', left: '22%', size: 2, op: 0.32, dur: 8, delay: 0.6, dx: 7 },
  { top: '48%', left: '78%', size: 3, op: 0.35, dur: 12, delay: 2, dx: -9 },
  { top: '70%', left: '52%', size: 2, op: 0.28, dur: 10, delay: 0.4, dx: 6 },
];

export const Hero = () => (
  <section className="relative overflow-hidden pt-36 pb-20 sm:pt-44">
    {/* Focused light around the headline, not a wash across the whole section - it
        breathes very slowly, and the handful of motes drift within it. Both sit below
        the copy and above the site-wide ambient backdrop. */}
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div
        className="hero-glow absolute left-1/2 top-[6%] h-[560px] w-[860px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(closest-side, var(--amb-1), transparent 72%)' }}
      />
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="hero-mote absolute rounded-full bg-[var(--tone-amber-text)]"
          style={
            {
              top: m.top,
              left: m.left,
              width: m.size,
              height: m.size,
              '--mote-op': m.op,
              '--mote-dur': `${m.dur}s`,
              '--mote-delay': `${m.delay}s`,
              '--mote-dx': `${m.dx}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>

    <div className="site-container relative">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-[820px] text-center"
      >
        <Link
          to="/how-it-works"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-paper-2)]/80 px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--color-ink-2)] backdrop-blur transition-colors hover:border-[var(--color-line-2)]"
        >
          <LiveDot online={true} />
          Paying agents on Base Sepolia with x402
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>

        <h1 className="site-hero-title mt-9 font-display text-[46px] font-extrabold leading-[1.04] tracking-[-0.03em] sm:text-[68px]">
          The research agent
          <br />
          that{' '}
          <span className="hero-gradient-text" data-text="pays its own way">
            pays its own way
          </span>
        </h1>

        {/* Deliberately generous vertical rhythm: the headline, the lede and the actions
            each get their own band of air, which is what separates an editorial cover
            from a stacked landing page. */}
        <p className="lede mx-auto mt-10 max-w-[640px] text-[18px] leading-[1.78]">
          Give it a question and a budget. It plans the work, runs a live auction between
          competing AI services, pays each one in real USDC over HTTP 402, and hands back a
          report where every claim carries a transaction hash.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link to="/console" className="btn-primary px-7 py-3.5">
            <Play className="h-4 w-4" />
            Run the agent
          </Link>
          <Link to="/how-it-works" className="btn-secondary px-7 py-3.5">
            See how it works
          </Link>
        </div>

        <p className="mt-8 text-[12.5px] text-[var(--color-ink-4)]">
          Testnet USDC only · No wallet or signup required · Every payment verifiable on BaseScan
        </p>

        <OrchestrationStrip />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        className="mt-16"
      >
        <HeroPaymentCard />
      </motion.div>
    </div>
  </section>
);
