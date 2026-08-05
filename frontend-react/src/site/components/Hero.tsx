import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { HeroPaymentCard } from './HeroPaymentCard';
import { OrchestrationStrip } from './OrchestrationStrip';

export const Hero = () => (
  <section className="relative overflow-hidden pt-36 pb-20 sm:pt-44">

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
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-signal)]" />
          Paying agents on Base Sepolia with x402
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>

        <h1 className="site-hero-title mt-7 font-display text-[46px] font-extrabold leading-[1.04] tracking-[-0.03em] sm:text-[68px]">
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
        <p className="lede mx-auto mt-8 max-w-[600px] text-[18px] leading-[1.72]">
          Give it a question and a budget. It plans the work, runs a live auction between
          competing AI services, pays each one in real USDC over HTTP 402, and hands back a
          report where every claim carries a transaction hash.
        </p>

        <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
          <Link to="/console" className="btn-primary px-7 py-3.5">
            <Play className="h-4 w-4" />
            Run the agent
          </Link>
          <Link to="/how-it-works" className="btn-secondary px-7 py-3.5">
            See how it works
          </Link>
        </div>

        <p className="mt-7 text-[12.5px] text-[var(--color-ink-4)]">
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
