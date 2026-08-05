import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import type { TraceResponse, ReportResponse, ResearchRequest } from '../api/client';

interface AgentState {
  jobId: string | null;
  query: string | null;
  elapsedMs: number;
  status: 'idle' | 'queued' | 'running' | 'completed' | 'budget_exceeded' | 'failed';
  trace: TraceResponse | null;
  report: ReportResponse | null;
  error: string | null;
  launchResearch: (req: ResearchRequest) => Promise<void>;
  reset: () => void;
}

const AgentContext = createContext<AgentState | undefined>(undefined);

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobId, setJobId] = useState<string | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [status, setStatus] = useState<AgentState['status']>('idle');
  const [trace, setTrace] = useState<TraceResponse | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const pollingRef = useRef<number | null>(null);
  const elapsedRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const pollTrace = async (id: string) => {
    try {
      const data = await apiClient.getTrace(id);
      setTrace(data);
      setStatus(data.status);
      if (['completed', 'budget_exceeded', 'failed'].includes(data.status)) {
        if (pollingRef.current) window.clearInterval(pollingRef.current);
        if (elapsedRef.current) window.clearInterval(elapsedRef.current);
        if (data.status === 'completed') fetchReport(id);
      }
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const fetchReport = async (id: string) => {
    try {
      const data = await apiClient.getReport(id);
      setReport(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to fetch report: ' + msg);
    }
  };

  const launchResearch = async (req: ResearchRequest) => {
    try {
      reset();
      const res = await apiClient.launchResearch(req);
      setJobId(res.job_id);
      setQuery(req.query);
      setStatus('queued');
      startedAtRef.current = Date.now();
      elapsedRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - (startedAtRef.current ?? Date.now()));
      }, 250);
      pollingRef.current = window.setInterval(() => pollTrace(res.job_id), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg || 'Failed to start research. Is the backend running?');
      setStatus('failed');
    }
  };

  const reset = () => {
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    if (elapsedRef.current) window.clearInterval(elapsedRef.current);
    setJobId(null);
    setQuery(null);
    setStatus('idle');
    setTrace(null);
    setReport(null);
    setError(null);
    setElapsedMs(0);
    startedAtRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      if (elapsedRef.current) window.clearInterval(elapsedRef.current);
    };
  }, []);

  return (
    <AgentContext.Provider value={{ jobId, query, elapsedMs, status, trace, report, error, launchResearch, reset }}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) throw new Error('useAgent must be used within AgentProvider');
  return context;
};
