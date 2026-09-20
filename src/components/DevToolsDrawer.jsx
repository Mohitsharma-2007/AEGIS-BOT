import React, { useState } from 'react';
import { 
  Code2, 
  Accessibility, 
  Wrench, 
  ScrollText, 
  Globe2, 
  Terminal, 
  ChevronUp, 
  ChevronDown,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export function DevToolsDrawer({
  domElements = [],
  a11yNodes = [],
  toolCalls = [],
  events = [],
  providers = [],
  activeProvider = '',
  activeModel = '',
  refreshDom,
  refreshA11y
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dom'); // 'dom' | 'a11y' | 'tools' | 'events' | 'network' | 'console'
  const [searchFilter, setSearchFilter] = useState('');

  // Extract console-like logs from events or system messages
  const consoleLogs = events
    .filter(e => e.type?.includes('log') || e.type?.includes('error') || e.type?.includes('thought') || e.type?.includes('agent:'))
    .map(e => ({
      level: e.type?.includes('error') ? 'error' : e.type?.includes('thought') ? 'info' : 'log',
      message: e.payload?.thought || e.payload?.message || JSON.stringify(e.payload || {}),
      timestamp: e.timestamp
    }));

  // Network logs synthesized from navigation & tool fetch events
  const networkLogs = events
    .filter(e => e.type === 'tool:call' || e.type === 'browser:navigated' || e.type === 'agent:action')
    .map(e => ({
      method: e.type === 'browser:navigated' ? 'GET' : 'RPC',
      url: e.payload?.url || e.payload?.tool || 'aegis://runtime/rpc',
      status: e.payload?.status === 'error' ? 500 : 200,
      duration: e.payload?.duration_ms ? `${e.payload.duration_ms}ms` : '12ms',
      timestamp: e.timestamp
    }));

  const tabs = [
    { id: 'dom', label: 'DOM', icon: Code2, count: domElements.length },
    { id: 'a11y', label: 'A11Y', icon: Accessibility, count: a11yNodes.length },
    { id: 'tools', label: 'TOOLS', icon: Wrench, count: toolCalls.length },
    { id: 'events', label: 'EVENTS', icon: ScrollText, count: events.length },
    { id: 'network', label: 'NETWORK', icon: Globe2, count: networkLogs.length },
    { id: 'console', label: 'CONSOLE', icon: Terminal, count: consoleLogs.length }
  ];

  const filteredDom = domElements.filter(el => {
    if (!searchFilter) return true;
    const query = searchFilter.toLowerCase();
    return (
      (el.element_id && el.element_id.toLowerCase().includes(query)) ||
      (el.tag && el.tag.toLowerCase().includes(query)) ||
      (el.text && el.text.toLowerCase().includes(query)) ||
      (el.role && el.role.toLowerCase().includes(query))
    );
  });

  const filteredA11y = a11yNodes.filter(node => {
    if (!searchFilter) return true;
    const query = searchFilter.toLowerCase();
    return (
      (node.role && node.role.toLowerCase().includes(query)) ||
      (node.name && node.name.toLowerCase().includes(query)) ||
      (node.node_id && node.node_id.toLowerCase().includes(query))
    );
  });

  return (
    <div className="bg-[#0b0e14] border-t border-white/[0.08] transition-all shrink-0 select-none">
      {/* DevTools Drawer Header / Tabs */}
      <div className="h-9 px-3 flex items-center justify-between bg-[#0e121a]">
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mr-2 hidden sm:inline">
            INSPECTOR
          </span>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (!isOpen) setIsOpen(true);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  isActive && isOpen
                    ? 'bg-[#151a24] text-cyan-400 border-t-2 border-cyan-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800/80 text-slate-300 font-mono">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Controls & Collapse Toggle */}
        <div className="flex items-center gap-2">
          {isOpen && (
            <>
              {/* Search filter input */}
              <div className="relative hidden md:flex items-center">
                <Search className="w-3 h-3 text-slate-500 absolute left-2 pointer-events-none" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder={`Filter ${activeTab.toUpperCase()}...`}
                  className="bg-[#08090b] border border-white/10 rounded px-2 py-0.5 pl-6 text-[10px] font-mono text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 w-32 focus:w-48 transition-all"
                />
              </div>

              {(activeTab === 'dom' || activeTab === 'a11y') && (
                <button
                  onClick={() => {
                    if (activeTab === 'dom' && refreshDom) refreshDom();
                    if (activeTab === 'a11y' && refreshA11y) refreshA11y();
                  }}
                  className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                  title="Re-extract from active page"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors font-mono"
            title={isOpen ? 'Collapse DevTools' : 'Expand DevTools'}
          >
            <span className="text-[11px]">{isOpen ? 'Hide' : 'Inspect'}</span>
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* DevTools Drawer Body */}
      {isOpen && (
        <div className="h-56 p-3 overflow-y-auto bg-[#10131b] font-mono text-xs text-slate-300 border-t border-white/[0.04]">
          {/* 1. DOM Inspector */}
          {activeTab === 'dom' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px]">
                <span className="text-slate-400">
                  Interactive Elements ({filteredDom.length} / {domElements.length} tagged with [data-aegis-id])
                </span>
                <button 
                  onClick={refreshDom}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded text-[10px] transition-colors"
                >
                  Extract DOM
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredDom.map((el) => (
                  <div key={el.element_id} className="p-2 bg-[#08090b] rounded border border-white/[0.06] hover:border-cyan-500/40 transition-colors space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-bold text-[11px]">{el.element_id}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                        &lt;{el.tag}&gt; {el.role ? `[role=${el.role}]` : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200 truncate font-sans">
                      {el.text || el.placeholder || el.aria_label || '<empty>'}
                    </p>
                    <div className="text-[9px] text-slate-500 flex items-center justify-between font-mono">
                      <span>x:{el.bbox.viewport_x} y:{el.bbox.viewport_y}</span>
                      <span>{el.bbox.width}×{el.bbox.height}px</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Accessibility Tree */}
          {activeTab === 'a11y' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px]">
                <span className="text-slate-400">
                  Accessibility Hierarchy ({filteredA11y.length} nodes)
                </span>
                <button 
                  onClick={refreshA11y}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded text-[10px] transition-colors"
                >
                  Extract Tree
                </button>
              </div>

              <div className="space-y-0.5">
                {filteredA11y.map((node) => (
                  <div 
                    key={node.node_id} 
                    style={{ paddingLeft: `${node.depth * 14}px` }}
                    className="flex items-center gap-2 py-0.5 px-1.5 hover:bg-white/[0.04] rounded transition-colors text-[11px]"
                  >
                    <span className="text-cyan-400 text-[9px] font-mono">{node.node_id}</span>
                    <span className="text-purple-400 font-semibold">{node.role}</span>
                    {node.name && <span className="text-slate-200 font-sans">"{node.name}"</span>}
                    {node.value && <span className="text-emerald-400">val="{node.value}"</span>}
                    {node.focused && <span className="text-[8px] bg-cyan-950 text-cyan-300 px-1 rounded border border-cyan-800">FOCUSED</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Registered & Executed Tools */}
          {activeTab === 'tools' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px]">
                <span className="text-slate-400">
                  Browser Tool Execution History ({toolCalls.length} invocations)
                </span>
                <span className="text-[10px] text-cyan-400">AEGIS RPC Tool Registry</span>
              </div>

              <div className="space-y-1.5">
                {toolCalls.length > 0 ? (
                  toolCalls.map((tc, idx) => (
                    <div key={idx} className="p-2 bg-[#08090b] rounded border border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {tc.status === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span className="text-cyan-300 font-semibold">{tc.tool}</span>
                        <span className="text-slate-400 text-[10px] truncate max-w-md">
                          {JSON.stringify(tc.args || {})}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                        <span>{tc.duration_ms || 12}ms</span>
                        <span>{new Date(tc.timestamp || Date.now()).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 py-4 text-center">No tool calls executed in current task.</p>
                )}
              </div>
            </div>
          )}

          {/* 4. Event Bus Log */}
          {activeTab === 'events' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px]">
                <span className="text-slate-400">Live SSE/WebSocket Event Stream</span>
                <span className="text-[10px] text-slate-500">{events.length} recorded</span>
              </div>
              {events.map((evt, idx) => (
                <div key={idx} className="flex items-center gap-3 py-1 px-2 hover:bg-white/[0.03] rounded text-[11px]">
                  <span className="text-slate-500 text-[9px]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  <span className="text-cyan-400 font-bold">{evt.type}</span>
                  <span className="text-slate-400 truncate flex-1 font-mono">
                    {JSON.stringify(evt.payload || {})}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 5. Network Activity */}
          {activeTab === 'network' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px]">
                <span className="text-slate-400">Network Telemetry (HTTP / RPC Requests)</span>
                <span className="text-[10px] text-emerald-400">CDP Network Monitor</span>
              </div>
              {networkLogs.length > 0 ? (
                networkLogs.map((net, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 px-2 hover:bg-white/[0.03] rounded text-[11px]">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`text-[9px] px-1 rounded font-bold ${net.method === 'GET' ? 'bg-cyan-950 text-cyan-400' : 'bg-purple-950 text-purple-400'}`}>
                        {net.method}
                      </span>
                      <span className="text-slate-300 truncate">{net.url}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono shrink-0">
                      <span className="text-emerald-400">{net.status} OK</span>
                      <span className="text-slate-500">{net.duration}</span>
                      <span className="text-slate-600">{new Date(net.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 py-4 text-center">No network requests tracked.</p>
              )}
            </div>
          )}

          {/* 6. Console Stream */}
          {activeTab === 'console' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px]">
                <span className="text-slate-400">Agent & Chromium Console Telemetry</span>
                <span className="text-[10px] text-cyan-400 font-mono">stdout / stderr</span>
              </div>
              {consoleLogs.length > 0 ? (
                consoleLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-0.5 px-2 hover:bg-white/[0.03] rounded text-[11px]">
                    <span className="text-slate-500 text-[9px] mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                      log.level === 'error' ? 'bg-rose-950 text-rose-400' : 'bg-cyan-950 text-cyan-400'
                    }`}>
                      {log.level}
                    </span>
                    <span className={`flex-1 break-all ${log.level === 'error' ? 'text-rose-300' : 'text-slate-300'}`}>
                      {log.message}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 py-4 text-center font-mono text-[11px]">
                  &gt; AEGIS console output stream ready.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
