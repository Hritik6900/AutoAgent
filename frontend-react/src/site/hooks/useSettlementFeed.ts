import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../../api/client';
import type { Step } from '../../api/client';

export const GRAPH_TASK_TYPES = ['web_search', 'fact_check', 'data_enrichment', 'summarize', 'compile_report'] as const;
export type GraphTaskType = (typeof GRAPH_TASK_TYPES)[number];

export type NodeStat = { count: number; total: number; lastTier: string | null };
export type PulseEvent = { id: string; taskType: GraphTaskType; amount: number; txHash: string | null };

const emptyNodes = (): Record<GraphTaskType, NodeStat> =>
  Object.fromEntries(GRAPH_TASK_TYPES.map((t) => [t, { count: 0, total: 0, lastTier: null }])) as Record<
    GraphTaskType,
    NodeStat
  >;

/** Same ledger every other live component reads, polled fast enough to drive an
 *  animation. New settlements (tx_hash not seen before) become one-shot pulse events
 *  that the graph animates outward from the wallet - so what moves on screen is a diff
 *  against real state, not a canned loop. */
export function useSettlementFeed(pollMs = 3500) {
  const [online, setOnline] = useState<boolean | null>(null);
  const [totalSettled, setTotalSettled] = useState(0);
  const [settledTxCount, setSettledTxCount] = useState(0);
  const [jobCount, setJobCount] = useState(0);
  const [lastTier, setLastTier] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Record<GraphTaskType, NodeStat>>(emptyNodes());
  const [pulses, setPulses] = useState<PulseEvent[]>([]);
  const [lastTx, setLastTx] = useState<{ hash: string; url: string } | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  const removePulse = (id: string) => setPulses((p) => p.filter((x) => x.id !== id));

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { ledger } = await apiClient.getLedger();
        if (cancelled) return;
        setOnline(true);

        const settled = ledger.filter(
          (e): e is Step & { tx_hash: string } =>
            (e.status === 'paid' || e.status === 'completed') && !!e.tx_hash,
        );

        const nextNodes = emptyNodes();
        let sum = 0;
        let newestTier: string | null = null;
        let newestTs = '';
        for (const e of settled) {
          const key = e.task_type as GraphTaskType;
          if (nextNodes[key]) {
            nextNodes[key].count += 1;
            nextNodes[key].total += e.amount_usdc || 0;
            nextNodes[key].lastTier = e.tier;
          }
          sum += e.amount_usdc || 0;
          if (e.timestamp > newestTs) {
            newestTs = e.timestamp;
            newestTier = e.tier;
          }
        }
        setNodes(nextNodes);
        setTotalSettled(sum);
        setSettledTxCount(settled.length);
        setJobCount(new Set(ledger.map((e) => (e as unknown as { job_id?: string }).job_id).filter(Boolean)).size);
        if (newestTier) setLastTier(newestTier);

        const fresh = settled.filter((e) => !seen.current.has(e.tx_hash));

        if (!primed.current) {
          // First load: mark everything seen, but replay the most recent few as a
          // staggered opening flourish so the graph is never a dead first paint.
          primed.current = true;
          for (const e of settled) seen.current.add(e.tx_hash);
          const opener = settled.slice(-3);
          opener.forEach((e, i) => {
            window.setTimeout(() => {
              if (cancelled) return;
              const key = e.task_type as GraphTaskType;
              if (!GRAPH_TASK_TYPES.includes(key)) return;
              setPulses((p) => [...p, { id: `${e.tx_hash}-open`, taskType: key, amount: e.amount_usdc, txHash: e.tx_hash }]);
              if (e.explorer_url) setLastTx({ hash: e.tx_hash, url: e.explorer_url });
            }, 900 + i * 500);
          });
          return;
        }

        for (const e of fresh) {
          seen.current.add(e.tx_hash);
          const key = e.task_type as GraphTaskType;
          if (!GRAPH_TASK_TYPES.includes(key)) continue;
          setPulses((p) => [...p, { id: e.tx_hash, taskType: key, amount: e.amount_usdc, txHash: e.tx_hash }]);
          if (e.explorer_url) setLastTx({ hash: e.tx_hash, url: e.explorer_url });
        }
      } catch {
        if (!cancelled) setOnline(false);
      }
    };

    load();
    const id = window.setInterval(load, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  return { online, totalSettled, settledTxCount, jobCount, lastTier, nodes, pulses, removePulse, lastTx };
}
