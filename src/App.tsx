import { apiFetch } from './lib/api';
import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DomainSwitcher } from './components/DomainSwitcher';
import { FuturesDomainView } from './components/FuturesDomainView';
import { OptionsDomainView } from './components/OptionsDomainView';
import { MultiTimeframeTrendView } from './components/MultiTimeframeTrendView';
import { PortfolioDashboardView } from './components/PortfolioDashboardView';
import { SystemDiagnostics } from './components/SystemDiagnostics';
import { TradingDomain, HealthData, SystemStatusData, LogEntry } from './types';

export default function App() {
  const [currentDomain, setCurrentDomain] = useState<TradingDomain>('futures');
  const [health, setHealth] = useState<HealthData | null>(null);
  const [status, setStatus] = useState<SystemStatusData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isTogglingBot, setIsTogglingBot] = useState<boolean>(false);

  const fetchSystemData = useCallback(async () => {
    try {
      // 1. Health Probe
      const healthRes = await apiFetch('/api/v1/health');
      if (!healthRes.ok) {
        throw new Error(`Health probe responded with HTTP ${healthRes.status}`);
      }
      const healthJson: HealthData = await healthRes.json();
      setHealth(healthJson);

      // 2. Full System Status
      const statusRes = await apiFetch('/api/v1/status');
      if (statusRes.ok) {
        const statusJson: SystemStatusData = await statusRes.json();
        setStatus(statusJson);
      }

      // 3. Recent In-Memory Logs
      const logsRes = await apiFetch('/api/v1/logs?limit=40');
      if (logsRes.ok) {
        const logsJson: LogEntry[] = await logsRes.json();
        setLogs(logsJson);
      }

      setBackendError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Backend connection failed';
      setBackendError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemData();
    const timer = setInterval(fetchSystemData, 4000);
    return () => clearInterval(timer);
  }, [fetchSystemData]);

  const handleToggleBot = async () => {
    setIsTogglingBot(true);
    try {
      const res = await apiFetch('/api/v1/bot/toggle', { method: 'POST' });
      if (res.ok) {
        await fetchSystemData();
      }
    } catch (err) {
      console.error('Failed to toggle bot state:', err);
    } finally {
      setIsTogglingBot(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Application Header */}
      <Header
        health={health}
        status={status}
        backendError={backendError}
        isTogglingBot={isTogglingBot}
        onToggleBot={handleToggleBot}
      />

      {/* Main Workspace Container */}
      <main className="min-w-0 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Backend Warning Banner if offline */}
        {backendError && (
          <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-300">
            <div className="min-w-0 break-words">
              <span className="font-semibold font-mono">[Notice]</span> FastAPI backend service is initializing or unreachable ({backendError}).
            </div>
            <button
              onClick={fetchSystemData}
              className="px-3 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-mono transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Domain Switcher: Futures vs Options */}
        <DomainSwitcher
          currentDomain={currentDomain}
          onChangeDomain={setCurrentDomain}
          status={status}
        />

        {/* Domain View: Futures, Trend AI, Options, or Portfolio */}
        {currentDomain === 'futures' && <FuturesDomainView status={status} />}
        {currentDomain === 'trend_ai' && <MultiTimeframeTrendView />}
        {currentDomain === 'options' && <OptionsDomainView status={status} />}
        {currentDomain === 'portfolio' && <PortfolioDashboardView onRefreshParent={fetchSystemData} />}

        {/* Diagnostics & Roadmap Section */}
        <SystemDiagnostics
          health={health}
          status={status}
          logs={logs}
          isLoading={isLoading}
          onRefresh={fetchSystemData}
        />
      </main>

    </div>
  );
}
