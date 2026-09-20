import React, { useState } from 'react';
import { 
  Plus, 
  Globe, 
  FileText, 
  History, 
  Wrench, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  Radio
} from 'lucide-react';
import { AegisAvatar } from './AegisAvatar.jsx';

export function AegisSidebar({
  activeView = 'browser',
  onSelectView,
  onNewTask,
  agentStatus = 'idle',
  connected = true,
  turboMode = true,
  notesCount = 0
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: 'browser', label: 'Browser', icon: Globe, badge: 'Live' },
    { id: 'notes', label: 'Tasks & Notes', icon: FileText, badge: notesCount > 0 ? notesCount : null },
    { id: 'history', label: 'History', icon: History },
    { id: 'tools', label: 'Tools & JEV', icon: Wrench },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside
      className={`h-full bg-aegis-secondary border-r border-aegis-border flex flex-col justify-between transition-all duration-300 ease-out z-20 shrink-0 select-none ${
        isCollapsed ? 'w-16' : 'w-56'
      }`}
      aria-label="AEGIS Navigation"
    >
      {/* Top: Brand Header & Avatar */}
      <div>
        <div className="h-14 px-3.5 border-b border-aegis-border flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <AegisAvatar status={agentStatus} size="sm" />
            {!isCollapsed && (
              <div className="min-w-0 transition-opacity duration-200">
                <span className="font-mono text-xs font-bold tracking-widest text-aegis-text-primary block leading-none">
                  AEGIS
                </span>
                <span className="text-[9px] font-mono text-aegis-text-muted tracking-wider block mt-0.5">
                  AI AGENT SYSTEM
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-white/5 text-aegis-text-secondary hover:text-aegis-text-primary transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* New Task Action Button */}
        <div className="p-2.5">
          <button
            onClick={onNewTask}
            className={`w-full flex items-center gap-2.5 rounded-lg bg-aegis-card hover:bg-aegis-hover border border-aegis-border text-aegis-text-primary transition-all duration-150 shadow-sm group ${
              isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 text-xs font-medium'
            }`}
            title="Start New Task"
          >
            <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 group-hover:border-cyan-500/40 transition-colors">
              <Plus className="w-3 h-3 stroke-[2.5]" />
            </div>
            {!isCollapsed && (
              <span className="font-mono text-[11px] tracking-wide text-aegis-text-primary group-hover:text-cyan-300">
                New Task
              </span>
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="px-2 space-y-1 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView && onSelectView(item.id)}
                className={`w-full flex items-center gap-3 rounded-lg transition-all text-xs ${
                  isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
                } ${
                  isActive
                    ? 'bg-white/5 text-cyan-300 font-medium border border-cyan-500/20 shadow-inner'
                    : 'text-aegis-text-secondary hover:text-aegis-text-primary hover:bg-white/[0.03] border border-transparent'
                }`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-cyan-400' : 'text-aegis-text-muted'}`} />
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status Panel */}
      <div className="p-3 border-t border-aegis-border bg-aegis-bg/60 space-y-2">
        {/* Turbo Mode Indicator */}
        <div className={`flex items-center gap-2 rounded px-2 py-1 bg-white/[0.02] border border-white/5 ${isCollapsed ? 'justify-center' : ''}`}>
          <Zap className={`w-3 h-3 ${turboMode ? 'text-amber-400' : 'text-aegis-text-muted'}`} />
          {!isCollapsed && (
            <span className="text-[10px] font-mono text-aegis-text-muted">
              {turboMode ? 'Turbo Mode: 5x' : 'Visual Mode'}
            </span>
          )}
        </div>

        {/* System Connection Indicator */}
        <div className={`flex items-center gap-2 px-2 py-1 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="relative flex items-center justify-center">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            {connected && (
              <span className="absolute w-3 h-3 rounded-full bg-emerald-400/40 animate-ping" />
            )}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] font-mono text-aegis-text-muted truncate">
              {connected ? 'AEGIS Live' : 'Disconnected'}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
