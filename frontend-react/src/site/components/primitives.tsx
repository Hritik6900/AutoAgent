import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

/** Fades + lifts content in the first time it scrolls into view. */
export const Reveal = ({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 22 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/** Counts up to `value` when scrolled into view. Used for real ledger figures, so it
 *  re-animates whenever the polled number actually changes. */
export const CountUp = ({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 22 });

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  useEffect(() => {
    return spring.on('change', (v) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${v.toFixed(decimals)}${suffix}`;
      }
    });
  }, [spring, decimals, prefix, suffix]);

  return (
    <span ref={ref} className={cn('mono', className)}>
      {`${prefix}${(0).toFixed(decimals)}${suffix}`}
    </span>
  );
};

export const SectionHeading = ({
  eyebrow,
  title,
  body,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
}) => (
  <div
    className={cn(
      'max-w-[720px]',
      align === 'center' ? 'mx-auto text-center' : 'text-left',
      className,
    )}
  >
    {eyebrow && <div className="eyebrow mb-4">{eyebrow}</div>}
    <h2 className="text-[34px] sm:text-[42px] leading-[1.1] tracking-[-0.02em]">{title}</h2>
    {body && <p className="lede mt-5">{body}</p>}
  </div>
);

export const Badge = ({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'signal' | 'brand' | 'ember';
}) => {
  const tones = {
    neutral: 'bg-[var(--color-paper-3)] text-[var(--color-ink-2)] border-[var(--color-line)]',
    signal: 'bg-[var(--tone-signal-bg)] text-[var(--tone-signal-text)] border-[var(--tone-signal-border)]',
    brand: 'bg-[var(--tone-brand-bg)] text-[var(--tone-brand-text)] border-[var(--tone-brand-border)]',
    ember: 'bg-[var(--tone-warn-bg)] text-[var(--tone-warn-text)] border-[var(--tone-warn-border)]',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
};

/** Ping dot for a "live" row inside a terminal/cockpit panel — a settlement that just
 *  landed, a winning bid, a step that's actually running. Colour is passed through
 *  because these panels use per-stage accent hex, not theme tokens. */
export const ExecutionPulse = ({ color }: { color: string }) => (
  <span className="relative flex h-1.5 w-1.5 shrink-0">
    <span
      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
      style={{ background: color }}
    />
    <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: color }} />
  </span>
);

/** Small live/offline dot used in the nav and hero. */
export const LiveDot = ({ online }: { online: boolean | null }) => (
  <span className="relative flex h-2 w-2">
    {online && (
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-signal-2)] opacity-70" />
    )}
    <span
      className={cn(
        'relative inline-flex h-2 w-2 rounded-full',
        online === true
          ? 'bg-[var(--color-signal)]'
          : online === false
            ? 'bg-[var(--tone-danger-text)]'
            : 'bg-[var(--color-ink-4)]',
      )}
    />
  </span>
);
