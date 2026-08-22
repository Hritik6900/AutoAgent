import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Boxes,
  Code2,
  Coins,
  Gavel,
  Layers,
  Menu,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { LiveDot } from './components/primitives';
import { Logo } from './components/Logo';
import { ThemeToggle } from './components/ThemeToggle';
import { UserMenu } from './components/UserMenu';
import { WalletPill } from './components/WalletPill';
import { useNetworkStats } from './hooks/useNetworkStats';

type MenuItem = {
  icon: typeof Search;
  title: string;
  desc: string;
  to: string;
  tint: string;
};

const PIPELINE: MenuItem[] = [
  { icon: Search, title: 'Search Agents', desc: 'Three providers, live bidding', to: '/how-it-works#auction', tint: 'text-[var(--tone-brand-text)] bg-[var(--tone-brand-bg)]' },
  { icon: BadgeCheck, title: 'Fact-Check', desc: 'Claims cross-referenced', to: '/how-it-works#execution', tint: 'text-[var(--tone-signal-text)] bg-[var(--tone-signal-bg)]' },
  { icon: Layers, title: 'Enrichment', desc: 'Entities, dates, statistics', to: '/how-it-works#execution', tint: 'text-[var(--tone-violet-text)] bg-[var(--tone-violet-bg)]' },
  { icon: Sparkles, title: 'Summarizer', desc: 'Condenses raw findings', to: '/how-it-works#execution', tint: 'text-[var(--tone-warn-text)] bg-[var(--tone-warn-bg)]' },
  { icon: BookOpen, title: 'Report Synthesis', desc: 'Two tiers, real failover', to: '/how-it-works#synthesis', tint: 'text-[var(--tone-brand-text)] bg-[var(--tone-brand-bg)]' },
  { icon: ShieldCheck, title: 'Self-Critique', desc: 'The agent grades itself', to: '/features#critique', tint: 'text-[var(--tone-signal-text)] bg-[var(--tone-signal-bg)]' },
];

const CAPABILITIES: MenuItem[] = [
  { icon: Coins, title: 'x402 Payments', desc: 'Real USDC, settled on-chain', to: '/features#payments', tint: 'text-[var(--tone-signal-text)] bg-[var(--tone-signal-bg)]' },
  { icon: Gavel, title: 'Reverse Auction', desc: 'Price × reliability scoring', to: '/features#auction', tint: 'text-[var(--tone-brand-text)] bg-[var(--tone-brand-bg)]' },
  { icon: Radio, title: 'Reasoning Stream', desc: 'It narrates its own choices', to: '/features#narration', tint: 'text-[var(--tone-violet-text)] bg-[var(--tone-violet-bg)]' },
  { icon: Activity, title: 'Live Failover', desc: 'Kill a service, watch it route', to: '/features#failover', tint: 'text-[var(--tone-warn-text)] bg-[var(--tone-warn-bg)]' },
  { icon: Wallet, title: 'Cost Per Claim', desc: 'Every sentence has a price', to: '/features#cost', tint: 'text-[var(--tone-signal-text)] bg-[var(--tone-signal-bg)]' },
  { icon: Boxes, title: 'Provenance Receipt', desc: 'Report hashed on-chain', to: '/features#provenance', tint: 'text-[var(--tone-brand-text)] bg-[var(--tone-brand-bg)]' },
];

const MegaPanel = ({
  items,
  featured,
}: {
  items: MenuItem[];
  featured: { title: string; desc: string; to: string; cta: string };
}) => (
  <motion.div
    initial={{ opacity: 0, y: -8, scale: 0.985 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -8, scale: 0.985 }}
    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    className="absolute left-1/2 top-[calc(100%+12px)] w-[min(880px,calc(100vw-3rem))] -translate-x-1/2 overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--nav-surface)] shadow-[var(--shadow-card-hover)] backdrop-blur-2xl"
  >
    <div className="grid gap-6 p-7 md:grid-cols-[1fr_260px]">
      <div>
        <div className="eyebrow mb-4">Pipeline</div>
        <div className="grid gap-1 sm:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item.title}
              to={item.to}
              className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-[var(--color-paper-3)]"
            >
              <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', item.tint)}>
                <item.icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[14px] font-semibold text-[var(--color-ink)]">{item.title}</span>
                <span className="block text-[12.5px] leading-snug text-[var(--color-ink-3)]">{item.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <Link
        to={featured.to}
        className="group relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-2xl p-5 text-white"
        style={{ background: 'var(--nav-featured-bg)' }}
      >
        <div className="absolute inset-0 grid-bg opacity-[0.12]" />
        <Terminal className="absolute right-4 top-4 h-5 w-5 opacity-60" />
        <div className="relative">
          <div className="text-[15px] font-bold">{featured.title}</div>
          <div className="mt-1 text-[12.5px] leading-snug text-white/75">{featured.desc}</div>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold">
            {featured.cta}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    </div>
  </motion.div>
);

// "How it works" and "Features" are deliberately not repeated here as standalone links -
// the Pipeline and Capabilities dropdowns above already point into those same pages'
// sections, so a third/fourth top-level entry for them was pure duplication that pushed
// the bar past its width and wrapped "How it works" onto three lines.
const NAV_LINKS = [
  { label: 'MCP', to: '/mcp' },
  { label: 'Developers', to: '/developers' },
  { label: 'About', to: '/about' },
];

export const Nav = () => {
  const [open, setOpen] = useState<'pipeline' | 'capabilities' | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const { online } = useNetworkStats(20000);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(null);
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  // Small close delay so the pointer can travel from trigger to panel without it
  // snapping shut mid-move.
  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(null), 140);
  };
  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 px-4">
      <div className="site-container pointer-events-auto relative">
        <nav
          className={cn(
            'relative flex items-center justify-between gap-4 rounded-full border px-4 py-2.5 transition-all duration-300 ease-out sm:px-5',
            scrolled || open
              ? 'border-[var(--color-line)] bg-[var(--nav-surface)] shadow-[var(--shadow-nav)] backdrop-blur-2xl'
              : 'border-[var(--color-line)]/60 bg-[var(--nav-surface-idle)] backdrop-blur-xl',
          )}
        >
          <Link to="/" className="shrink-0">
            <Logo size={28} />
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            <button
              onMouseEnter={() => {
                cancelClose();
                setOpen('pipeline');
              }}
              onMouseLeave={scheduleClose}
              onClick={() => setOpen(open === 'pipeline' ? null : 'pipeline')}
              className={cn(
                'whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition-all duration-200',
                open === 'pipeline'
                  ? 'bg-[var(--color-paper-3)] text-[var(--color-ink)]'
                  : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]/60 hover:text-[var(--color-ink)]',
              )}
            >
              Pipeline
            </button>
            <button
              onMouseEnter={() => {
                cancelClose();
                setOpen('capabilities');
              }}
              onMouseLeave={scheduleClose}
              onClick={() => setOpen(open === 'capabilities' ? null : 'capabilities')}
              className={cn(
                'whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition-all duration-200',
                open === 'capabilities'
                  ? 'bg-[var(--color-paper-3)] text-[var(--color-ink)]'
                  : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]/60 hover:text-[var(--color-ink)]',
              )}
            >
              Capabilities
            </button>
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onMouseEnter={scheduleClose}
                className={cn(
                  'relative whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition-all duration-200',
                  location.pathname === l.to
                    ? 'text-[var(--color-ink)]'
                    : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]/60 hover:text-[var(--color-ink)]',
                )}
              >
                {l.label}
                {location.pathname === l.to && (
                  <span className="absolute inset-x-3.5 -bottom-px h-px rounded-full bg-[var(--color-ink)]" />
                )}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-paper-2)] px-3 py-1.5 sm:inline-flex">
              <LiveDot online={online} />
              <span className="text-[11px] font-semibold text-[var(--color-ink-2)]">
                {online === true ? 'Agent online' : online === false ? 'Agent offline' : 'Connecting'}
              </span>
            </span>
            <WalletPill className="hidden sm:inline-flex" />
            <ThemeToggle />
            <UserMenu />
            <Link
              to="/console"
              className="hidden rounded-full bg-[var(--color-ink)] px-4 py-2 text-[13px] font-semibold text-[var(--color-paper)] shadow-[var(--shadow-btn)] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--color-ink-hover)] hover:shadow-[var(--shadow-btn-hover)] active:translate-y-0 active:scale-[0.98] sm:inline-flex"
            >
              Launch console
            </Link>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

          <AnimatePresence>
            {open && (
              <div
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
                className="absolute left-0 right-0 top-full hidden lg:block"
              >
                {open === 'pipeline' ? (
                  <MegaPanel
                    items={PIPELINE}
                    featured={{
                      title: 'Watch it run live',
                      desc: 'Submit a query and watch real USDC settle on Base Sepolia, task by task.',
                      to: '/console',
                      cta: 'Open the console',
                    }}
                  />
                ) : (
                  <MegaPanel
                    items={CAPABILITIES}
                    featured={{
                      title: 'Plug it into Claude',
                      desc: 'Runs as an MCP server. Five tools, and an agent that pays its own way behind them.',
                      to: '/mcp',
                      cta: 'Connect a client',
                    }}
                  />
                )}
              </div>
            )}
          </AnimatePresence>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--nav-surface)] p-4 shadow-[var(--shadow-card-hover)] backdrop-blur-2xl lg:hidden"
            >
              {[{ label: 'Home', to: '/' }, ...NAV_LINKS, { label: 'Console', to: '/console' }].map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="block rounded-xl px-3 py-2.5 text-[14px] font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-1 border-t border-[var(--color-line)] pt-3">
                {[...PIPELINE, ...CAPABILITIES].slice(0, 8).map((i) => (
                  <Link
                    key={i.title}
                    to={i.to}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-[12.5px] font-medium text-[var(--color-ink-3)] hover:bg-[var(--color-paper-3)]"
                  >
                    <i.icon className="h-3.5 w-3.5" />
                    {i.title}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export { Code2 };
