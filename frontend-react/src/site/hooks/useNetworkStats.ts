import { useEffect, useState } from 'react';
import { apiClient, deriveNetworkStats } from '../../api/client';
import type { NetworkStats } from '../../api/client';

/** Polls the real payment ledger so every headline figure on the site is live
 *  on-chain data. `online` distinguishes "backend unreachable" from "no jobs yet",
 *  so the UI can say which is true instead of silently showing zeroes. */
export function useNetworkStats(pollMs = 15000) {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { ledger } = await apiClient.getLedger();
        if (cancelled) return;
        setStats(deriveNetworkStats(ledger));
        setOnline(true);
      } catch {
        if (cancelled) return;
        setOnline(false);
      }
    };

    load();
    const id = window.setInterval(load, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  return { stats, online };
}
