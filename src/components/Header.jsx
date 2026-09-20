import React, { useState } from 'react';
import { 
  Cpu, 
  CircleDot, 
  Square, 
  Play, 
  Pause, 
  Zap, 
  ChevronDown, 
  Check, 
  Radio
} from 'lucide-react';
import { AegisAvatar } from './AegisAvatar.jsx';

export function Header({ 
  connected, 
  agentState = {}, 
  stopAgent, 
  pauseAgent, 
  resumeAgent, 
  providers = [], 
  activeProvider = '', 
  activeModel = '', 
  selectProvider,
  turboMode = true,
  toggleTurbo
}) {
  const [showModelModal, setShowModelModal] = useState(false);

  const getStatusBadge = () => {
    const status = agentState.status || 'idle';
    switch (status) {
      case 'executing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            EXECUTING
          </span>
        );
      case 'planning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            PLANNING
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Pause className="w-3 h-3" />
            PAUSED
          </span>
        );
      case 'stopped':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <Square className="w-3 h-3" />
            STOPPED
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Check className="w-3 h-3" />
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-white/[0.04] text-aegis-text-muted border border-white/5">
            <CircleDot className="w-3 h-3 text-cyan-400/60" />
            READY
          </span>
        );
    }
  };

  const activeProviderObj = providers.find(p => p.id === activeProvider);
  const activeModelObj = activeProviderObj?.models?.find(m => m.id === activeModel);

  return (
    <header className="h-14 bg-aegis-secondary border-b border-aegis-border px-4 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left: Branding with AegisAvatar */}
      <div className="flex items-center gap-3">
        <AegisAvatar status={agentState.status || 'idle'} size="sm" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-bold tracking-widest text-aegis-text-primary font-mono">
              AEGIS
            </h1>
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/[0.04] text-cyan-400 border border-cyan-500/20">
              AI AGENT SYSTEM
            </span>
          </div>
          <p className="text-[10px] text-aegis-text-muted hidden sm:block font-sans">
            Autonomous AI Operating Environment
          </p>
        </div>
      </div>

      {/* Center: Model Router Selector & Turbo Accelerator */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowModelModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-aegis-card hover:bg-aegis-hover border border-aegis-border hover:border-cyan-500/40 transition-all text-xs text-aegis-text-primary group shadow-sm"
          title="Change active model provider"
        >
          <Cpu className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
          <span className="font-mono truncate max-w-[160px] text-[11px]">
            {activeModelObj?.name || (activeModel ? activeModel.split('/')[1] || activeModel : 'Model Router')}
          </span>
          {activeModelObj?.free && (
            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-mono px-1 py-0.2 rounded border border-emerald-500/30">
              FREE
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-aegis-text-muted group-hover:text-aegis-text-primary" />
        </button>

        {/* Turbo Mode Accelerator Toggle */}
        {toggleTurbo && (
          <button
            onClick={() => toggleTurbo(!turboMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all border shadow-sm ${
              turboMode
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                : 'bg-aegis-card text-aegis-text-muted border-aegis-border hover:text-aegis-text-primary'
            }`}
            title={turboMode ? 'Turbo Mode: 5x Speed (Media blocked)' : 'Visual Fidelity Mode'}
          >
            <Zap className={`w-3.5 h-3.5 ${turboMode ? 'text-amber-400 fill-amber-400/40' : 'text-aegis-text-muted'}`} />
            <span className="hidden sm:inline text-[11px] font-medium">
              {turboMode ? 'TURBO' : 'VISUAL'}
            </span>
          </button>
        )}

        {getStatusBadge()}
      </div>

      {/* Right: Controls & Emergency Stop */}
      <div className="flex items-center gap-2">
        {/* Pause/Resume controls */}
        {agentState.status === 'executing' && (
          <button
            onClick={pauseAgent}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono transition-all"
            title="Pause agent loop"
          >
            <Pause className="w-3 h-3" />
            <span className="hidden md:inline">Pause</span>
          </button>
        )}

        {agentState.status === 'paused' && (
          <button
            onClick={resumeAgent}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono transition-all"
            title="Resume agent loop"
          >
            <Play className="w-3 h-3" />
            <span className="hidden md:inline">Resume</span>
          </button>
        )}

        {/* Emergency STOP AGENT Button */}
        <button
          onClick={stopAgent}
          disabled={agentState.status === 'idle' || agentState.status === 'stopped'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all shadow-sm ${
            agentState.status === 'executing' || agentState.status === 'planning' || agentState.status === 'paused'
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 border border-rose-400 cursor-pointer animate-pulse'
              : 'bg-white/[0.03] text-aegis-text-muted border border-white/5 cursor-not-allowed opacity-40'
          }`}
          title="Emergency Stop: Halt agent immediately and preserve browser state"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>STOP</span>
        </button>

        {/* Live System Online Indicator (PRD Section 4 concept) */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-aegis-border ml-1 text-[11px] font-mono text-aegis-text-muted">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-500'}`} />
          <span className="hidden sm:inline">{connected ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* Model Selection Modal */}
      {showModelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-aegis-panel border border-aegis-border rounded-xl max-w-xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-aegis-border pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-sm text-aegis-text-primary font-sans">
                  Select AI Model Provider
                </h3>
              </div>
              <button 
                onClick={() => setShowModelModal(false)}
                className="text-aegis-text-muted hover:text-aegis-text-primary text-xs font-mono px-2 py-1 rounded hover:bg-white/5"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-aegis-text-secondary font-sans leading-relaxed">
              AEGIS routes across OpenRouter, Groq, Nvidia NIM, Conduit, and TokenHarbor with automatic rate-limit fallbacks.
            </p>

            <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
              {providers.map((prov) => (
                <div 
                  key={prov.id}
                  className={`p-3 rounded-lg border transition-all ${
                    prov.id === activeProvider 
                      ? 'bg-cyan-950/20 border-cyan-500/40' 
                      : 'bg-aegis-card border-aegis-border hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-aegis-text-primary">{prov.name}</span>
                      {prov.hasKey ? (
                        <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                          CONFIGURED
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded">
                          ENDPOINT
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1.5">
                    {prov.models?.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          selectProvider(prov.id, m.id);
                          setShowModelModal(false);
                        }}
                        className={`flex items-center justify-between text-left p-2 rounded text-[11px] transition-colors font-mono ${
                          activeProvider === prov.id && activeModel === m.id
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-white/[0.02] hover:bg-white/5 text-aegis-text-secondary hover:text-aegis-text-primary border border-white/5'
                        }`}
                      >
                        <span className="truncate pr-1">{m.name || m.id}</span>
                        {m.free && (
                          <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 rounded shrink-0">
                            FREE
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-aegis-border">
              <button
                onClick={() => setShowModelModal(false)}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-aegis-text-primary text-xs rounded-lg transition-colors font-mono"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
