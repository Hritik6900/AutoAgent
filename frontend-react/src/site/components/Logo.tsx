import { cn } from '../../utils/cn';

/** The mark is the product: one orchestrator node fanning out to the paid services it
 *  hires, with the payment arrow doubling as the connector. Stays legible down to 20px
 *  because it's three dots and two strokes, nothing finer. */
export const LogoMark = ({ size = 28, className }: { size?: number; className?: string }) => (
  <span
    className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden', className)}
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.3,
      /* Tokenised: light keeps the Base-blue tile, dark gets a machined graphite one.
         A saturated blue chip was the single loudest thing on an otherwise monochrome
         dark page - the mark still reads, it just stops shouting. */
      background: 'var(--logo-tile)',
    }}
  >
    {/* faint inner sheen so the tile doesn't read as flat colour */}
    <span
      className="pointer-events-none absolute inset-0"
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.28), rgba(255,255,255,0) 55%)',
      }}
    />
    <svg
      viewBox="0 0 24 24"
      fill="none"
      style={{ width: size * 0.7, height: size * 0.7 }}
      className="relative"
      aria-hidden="true"
    >
      {/* connectors: one orchestrator paying out to three services */}
      <path d="M8.9 12 C 12.4 12, 12.4 5.8, 16.55 5.8" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
      <path d="M8.9 12 H 16.55" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.9 12 C 12.4 12, 12.4 18.2, 16.55 18.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      {/* orchestrator */}
      <circle cx="6" cy="12" r="2.9" fill="white" />
      {/* paid services */}
      <circle cx="18.5" cy="5.8" r="1.95" fill="white" opacity="0.9" />
      <circle cx="18.5" cy="12" r="1.95" fill="white" />
      <circle cx="18.5" cy="18.2" r="1.95" fill="white" opacity="0.7" />
    </svg>
  </span>
);

export const Logo = ({
  size = 28,
  showWord = true,
  className,
}: {
  size?: number;
  showWord?: boolean;
  className?: string;
}) => (
  <span className={cn('flex items-center gap-2.5', className)}>
    <LogoMark size={size} />
    {showWord && (
      <span className="font-display text-[16px] font-extrabold tracking-[-0.02em] text-[var(--color-ink)]">
        AutoResearch
      </span>
    )}
  </span>
);
