import React from 'react';
import { ListChecks, Check, CircleDot, Circle, AlertCircle } from 'lucide-react';

export function AgentPlanCard({ plan, task, status }) {
  return (
    <div className="bg-aegis-panel rounded-xl border border-aegis-border p-3.5 space-y-3 shadow-sm select-none">
      <div className="flex items-center justify-between border-b border-aegis-border/80 pb-2">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-mono font-bold tracking-wider text-aegis-text-primary uppercase">
            Execution Plan
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {plan?.isAdapted && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 flex items-center gap-1 font-semibold animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              ADAPTED
            </span>
          )}
          <span className="text-[9px] font-mono text-aegis-text-muted px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/5">
            {plan?.steps?.length ? `${plan.steps.filter(s => s.status === 'completed').length}/${plan.steps.length} Steps` : 'Checklist'}
          </span>
        </div>
      </div>

      {/* Task Objective Display */}
      {task && (
        <div className="bg-aegis-card p-2.5 rounded-lg border border-white/[0.04]">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] uppercase font-mono text-cyan-400/80 tracking-wider">
              Active Objective
            </span>
            {plan?.isAdapted && (
              <span className="text-[8px] font-mono text-amber-400/90 tracking-wider">
                ⚡ Evasion & Re-Route Active
              </span>
            )}
          </div>
          <p className="text-xs text-aegis-text-primary font-sans leading-snug font-medium">
            {task}
          </p>
        </div>
      )}

      {/* Checklist Milestones */}
      {plan?.steps && plan.steps.length > 0 ? (
        <div className="space-y-1.5">
          {plan.steps.map((step, idx) => {
            const isCompleted = step.status === 'completed';
            const isExecuting = step.status === 'executing';
            const isFailed = step.status === 'failed' || step.status === 'interrupted';
            const isAdapted = step.isAdapted;

            return (
              <div
                key={step.id || idx}
                className={`flex items-start gap-2.5 p-2 rounded-lg text-xs transition-all duration-150 ${
                  isExecuting
                    ? isAdapted 
                      ? 'bg-purple-950/25 border border-purple-500/40 text-purple-200 shadow-sm'
                      : 'bg-cyan-950/20 border border-cyan-500/30 text-cyan-200 shadow-sm'
                    : isCompleted
                    ? 'bg-aegis-card/50 text-aegis-text-muted border border-transparent'
                    : isFailed
                    ? 'bg-rose-950/20 border border-rose-500/30 text-rose-300'
                    : 'text-aegis-text-secondary border border-transparent hover:bg-white/[0.02]'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : isExecuting ? (
                    <div className={`w-3.5 h-3.5 rounded-full ${isAdapted ? 'bg-purple-400/20 border-purple-400' : 'bg-cyan-400/20 border-cyan-400'} border flex items-center justify-center`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isAdapted ? 'bg-purple-400' : 'bg-cyan-400'} animate-pulse`} />
                    </div>
                  ) : isFailed ? (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex items-center justify-center text-[9px] font-mono text-aegis-text-muted">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`leading-tight text-xs font-sans ${
                      isCompleted 
                        ? 'line-through text-aegis-text-muted opacity-80' 
                        : isExecuting 
                        ? isAdapted ? 'text-purple-200 font-semibold' : 'text-cyan-200 font-semibold' 
                        : 'text-aegis-text-primary'
                    }`}>
                      {step.title}
                    </span>
                    {isAdapted && (
                      <span className="text-[8px] font-mono uppercase px-1 py-0.2 rounded bg-purple-950/70 border border-purple-500/30 text-purple-300 font-bold">
                        ADAPTED
                      </span>
                    )}
                  </div>
                  {step.target && (
                    <span className="text-[10px] font-mono text-aegis-text-muted block truncate mt-0.5">
                      Target: {step.target}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-4 text-center text-xs text-aegis-text-muted font-mono">
          Ready for instructions. Plan checklist generates on task launch.
        </div>
      )}
    </div>
  );
}

