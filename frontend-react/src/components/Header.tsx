import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Server } from 'lucide-react';
import { apiClient, API_BASE_URL } from '../api/client';
import { LiveDot } from '../site/components/primitives';
import { LogoMark } from '../site/components/Logo';
import { ThemeToggle } from '../site/components/ThemeToggle';

/** Compact console chrome. Same visual language as the marketing nav (floating pill,
 *  light surface) so moving between site and tool doesn't feel like two products. */
export const Header = () => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await apiClient.checkHealth();
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    };
    check();
    const id = window.setInterval(check, 10000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-paper)]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-y-2 px-5 py-3">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--color-ink-3)] transition-colors hover:text-[var(--color-ink)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to site
          </Link>
          <span className="hidden h-4 w-px bg-[var(--color-line)] sm:block" />
          <Link to="/console" className="hidden items-center gap-2.5 sm:flex">
            <LogoMark size={24} />
            <span className="font-display text-[14px] font-extrabold tracking-tight">Console</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <span className="mono hidden items-center gap-1.5 text-[11.5px] text-[var(--color-ink-4)] md:inline-flex">
            <Server className="h-3.5 w-3.5" />
            {API_BASE_URL}
          </span>
          <ThemeToggle />
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-paper-2)] px-3 py-1.5">
            <LiveDot online={isOnline} />
            <span className="text-[11px] font-semibold text-[var(--color-ink-2)]">
              {isOnline === true ? 'Agent online' : isOnline === false ? 'Agent offline' : 'Connecting'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
