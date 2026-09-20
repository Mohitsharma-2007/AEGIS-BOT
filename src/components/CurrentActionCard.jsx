import React from 'react';
import { Crosshair, Radio, Brain, Terminal } from 'lucide-react';
import { AegisAvatar } from './AegisAvatar.jsx';

export function CurrentActionCard({
  currentAction,
  targetElement,
  agentStatus = 'idle',
  latestThought
}) {
  const isExecuting = agentStatus === 'executing';
  const thoughtText = latestThought?.thought || currentAction?.thought;

  const getStatusDisplay = () => {
    switch (agentStatus) {
      case 'executing':
        return { label: 'WORKING', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30' };
      case 'planning':
        return { label: 'THINKING', color: 'text-cyan-300 bg-cyan-950/40 border-cyan-400/30' };
      case 'paused':
        return { label: 'PAUSED', color: 'text-amber-300 bg-amber-950/40 border-amber-500/30' };
      case 'completed':
        return { label: 'COMPLETED', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30' };
      case 'error':
      case 'stopped':
        return { label: 'HALTED', color: 'text-rose-400 bg-rose-950/40 border-rose-500/30' };
      default:
        return { label: 'IDLE / READY', color: 'text-aegis-text-muted bg-white/[0.02] border-white/5' };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="bg-aegis-panel rounded-xl border border-aegis-border p-3.5 space-y-3 shadow-sm select-none">
      {/* Header: Aegis Avatar + Status */}
      <div className="flex items-center justify-between border-b border-aegis-border/80 pb-2.5">
        <div className="flex items-center gap-2.5">
          <AegisAvatar status={agentStatus} size="sm" />
          <div>
            <h2 className="text-xs font-mono font-bold tracking-wider text-aegis-text-primary">
              AEGIS CONTROL
            </h2>
            <span className="text-[9px] font-mono text-aegis-text-muted block">
              Autonomous Agent Loop
            </span>
          </div>
        </div>

        <span className={`text-[9px] font-mono px-2 py-0.5 rounded border font-semibold tracking-wider ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        {/* Live ReAct Thought Bubble */}
        {thoughtText && (
          <div className="bg-white/[0.02] border border-cyan-500/20 p-2.5 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <Brain className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span className="text-[10px] font-mono font-semibold text-cyan-300 tracking-wider uppercase">
                Agent Thought {latestThought?.phase ? `• ${latestThought.phase}` : ''}
              </span>
            </div>
            <p className="text-xs text-aegis-text-primary font-sans leading-relaxed">
              "{thoughtText}"
            </p>
          </div>
        )}

        {/* Action Title */}
        <div className="bg-aegis-card p-2.5 rounded-lg border border-white/[0.04] flex items-start gap-2">
          <div className="mt-0.5">
            <div className={`w-2 h-2 rounded-full ${isExecuting ? 'bg-cyan-400 animate-pulse' : 'bg-aegis-text-muted'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] uppercase font-mono text-aegis-text-muted block">Current Action</span>
            <p className="text-aegis-text-primary font-mono text-xs truncate">
              {currentAction?.name || 'Awaiting instruction'}
            </p>
          </div>
        </div>

        {/* Target Element */}
        <div className="bg-aegis-card p-2.5 rounded-lg border border-white/[0.04] flex items-start gap-2">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-[9px] uppercase font-mono text-aegis-text-muted block">Target Element</span>
            <p className="text-aegis-text-secondary text-xs font-mono truncate">
              {currentAction?.target || (targetElement ? `[${targetElement.element_id}] ${targetElement.tag}` : 'None active')}
            </p>
          </div>
        </div>

        {/* Method & Status Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-aegis-card p-2 rounded-lg border border-white/[0.04]">
            <span className="text-[9px] uppercase font-mono text-aegis-text-muted block mb-0.5">Method</span>
            <p className="text-[11px] text-aegis-text-secondary font-mono truncate">
              {currentAction?.method || 'CDP + Playwright'}
            </p>
          </div>

          <div className="bg-aegis-card p-2 rounded-lg border border-white/[0.04]">
            <span className="text-[9px] uppercase font-mono text-aegis-text-muted block mb-0.5">Verified</span>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold block truncate">
              {currentAction?.status === 'completed' ? '✓ Verified' : isExecuting ? '● In Progress' : 'Ready'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


