import React from 'react';
import { Power, Activity, ShieldCheck, Cpu } from 'lucide-react';
import { HealthData, SystemStatusData } from '../types';

interface HeaderProps {
  health: HealthData | null;
  status: SystemStatusData | null;
  backendError: string | null;
  isTogglingBot: boolean;
  onToggleBot: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  status,
  backendError,
  isTogglingBot,
  onToggleBot,
}) => {
  const isBotActive = status?.bot_active ?? false;
  const isHealthy = Boolean(health?.status === 'ok' && !backendError);

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-100 tracking-tight text-base">
                Delta Bot V2
              </span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                v2.0.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Delta Exchange Automated Multi-Domain Engine
            </p>
          </div>
        </div>

        {/* System Badges & Actions */}
        <div className="flex items-center space-x-3">
          {/* Mode Pill */}
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PAPER MODE</span>
          </div>

          {/* Backend Status */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-xs font-mono transition-colors ${
              isHealthy
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${isHealthy ? 'animate-pulse' : ''}`} />
            <span>{isHealthy ? 'FASTAPI OK' : 'BACKEND DISCONNECTED'}</span>
          </div>

          {/* Master Bot Safety Switch */}
          <button
            id="bot-master-toggle-btn"
            onClick={onToggleBot}
            disabled={isTogglingBot || !isHealthy}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-medium text-xs transition-all shadow-sm ${
              isBotActive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Power className={`w-3.5 h-3.5 ${isBotActive ? 'text-white' : 'text-slate-400'}`} />
            <span>{isBotActive ? 'BOT ACTIVE' : 'BOT OFF'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
