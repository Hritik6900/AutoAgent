import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useNetworkStats } from './hooks/useNetworkStats';
import { LiveDot } from './components/primitives';
import { Logo } from './components/Logo';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', to: '/how-it-works' },
      { label: 'Features', to: '/features' },
      { label: 'Live console', to: '/console' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'API reference', to: '/developers' },
      { label: 'Quickstart', to: '/developers#quickstart' },
      { label: 'Response shapes', to: '/developers#shapes' },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Architecture', to: '/about#architecture' },
      { label: 'What is real', to: '/about#real' },
    ],
  },
];

export const Footer = () => {
  const { stats, online } = useNetworkStats(30000);

  return (
    <footer className="section-band border-t border-[var(--color-line)]">
      <div className="site-container py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link to="/">
              <Logo size={28} />
            </Link>
            <p className="prose-body mt-4 max-w-[320px]">
              An autonomous research agent that hires and pays other AI services in real
              on-chain USDC, then shows you the receipt for every sentence it wrote.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-3 py-1.5">
              <LiveDot online={online} />
              <span className="text-[11.5px] font-semibold text-[var(--color-ink-2)]">
                {online === true
                  ? `${stats?.settledTxCount ?? 0} transactions settled`
                  : online === false
                    ? 'Backend offline'
                    : 'Connecting…'}
              </span>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-[12.5px] font-bold text-[var(--color-ink)]">{col.title}</div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-[13.5px] text-[var(--color-ink-3)] transition-colors hover:text-[var(--color-ink)]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-[var(--color-line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-[var(--color-ink-4)]">
            Runs on Base Sepolia testnet. No mainnet funds, ever.
          </p>
          <a
            href="https://sepolia.basescan.org"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--color-ink-3)] transition-colors hover:text-[var(--color-ink)]"
          >
            Verify on BaseScan
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
};
