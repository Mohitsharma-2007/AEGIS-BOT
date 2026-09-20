import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronRight, Check, AlertCircle, Clock } from 'lucide-react';

export function ToolCallStream({ toolCalls = [] }) {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="bg-aegis-panel rounded-xl border border-aegis-border p-3.5 space-y-3 shadow-sm flex flex-col flex-1 min-h-[200px] select-none">
      <div className="flex items-center justify-between border-b border-aegis-border/80 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-mono font-bold tracking-wider text-aegis-text-primary uppercase">
            Tool Call Inspector
          </h2>
        </div>
        <span className="text-[10px] font-mono text-aegis-text-muted px-1.5 py-0.2 rounded bg-white/[0.04]">
          {toolCalls.length} events
        </span>
      </div>

      <div className="overflow-y-auto space-y-1.5 flex-1 max-h-[320px] pr-1 scrollbar-thin">
        {toolCalls.length > 0 ? (
          toolCalls.map((evt, idx) => {
            const isCompleted = evt.type === 'tool.completed';
            const isFailed = evt.type === 'tool.failed';
            const isStarted = evt.type === 'tool.started';
            const id = evt.event_id || `tc-${idx}`;
            const isExpanded = expandedId === id;

            return (
              <div
                key={id}
                className="bg-aegis-card border border-white/[0.04] hover:border-white/[0.1] rounded-lg overflow-hidden text-xs transition-colors duration-150"
              >
                {/* Collapsed Header */}
                <div
                  onClick={() => toggleExpand(id)}
                  className="px-2.5 py-2 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isCompleted ? (
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    ) : isFailed ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                    )}

                    <span className="font-mono text-[11px] font-medium text-cyan-300 truncate">
                      {evt.payload?.tool}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {evt.payload?.duration_ms !== undefined && (
                      <span className="text-[10px] font-mono text-aegis-text-muted">
                        {evt.payload.duration_ms}ms
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-aegis-text-secondary" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-aegis-text-muted" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3 py-2.5 bg-black/40 border-t border-white/[0.04] font-mono text-[11px] space-y-2.5 transition-all">
                    {evt.payload?.input && (
                      <div>
                        <span className="text-[9px] uppercase font-bold text-aegis-text-muted block mb-1 tracking-wider">
                          INPUT
                        </span>
                        <pre className="bg-aegis-bg p-2 rounded border border-white/[0.04] text-cyan-300 overflow-x-auto text-[10px] max-h-32">
                          {JSON.stringify(evt.payload.input, null, 2)}
                        </pre>
                      </div>
                    )}

                    {evt.payload?.output && (
                      <div>
                        <span className="text-[9px] uppercase font-bold text-emerald-400/80 block mb-1 tracking-wider">
                          OUTPUT
                        </span>
                        <pre className="bg-aegis-bg p-2 rounded border border-white/[0.04] text-emerald-300 overflow-x-auto text-[10px] max-h-32">
                          {JSON.stringify(evt.payload.output, null, 2)}
                        </pre>
                      </div>
                    )}

                    {evt.payload?.error && (
                      <div>
                        <span className="text-[9px] uppercase font-bold text-rose-400 block mb-1 tracking-wider">
                          ERROR
                        </span>
                        <p className="bg-rose-950/30 border border-rose-500/20 text-rose-300 p-2 rounded text-[10px]">
                          {evt.payload.error}
                        </p>
                      </div>
                    )}

                    <div className="pt-1 flex items-center justify-between text-[9px] text-aegis-text-muted border-t border-white/[0.04]">
                      <span>STATUS: <strong className="text-aegis-text-secondary">{isCompleted ? 'Success' : isFailed ? 'Failed' : 'Running'}</strong></span>
                      <span>{evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ''}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-xs text-aegis-text-muted font-mono">
            Awaiting browser tool invocations...
          </div>
        )}
      </div>
    </div>
  );
}

