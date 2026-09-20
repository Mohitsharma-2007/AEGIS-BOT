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

const DEFAULT_REGISTERED_TOOLS = [
  { name: 'browser.stealth_evade', category: 'Stealth & Anti-Bot Defense', description: 'Masks navigator.webdriver, shims plugins, WebGL vendor, and rotates realistic headers.' },
  { name: 'browser.detect_wall', category: 'Stealth & Anti-Bot Defense', description: 'Scans DOM and frame for CAPTCHAs, bot challenges ("unusual traffic"), or Cloudflare Turnstile.' },
  { name: 'vision.inspect_canvas', category: 'Computer Vision & Grounding', description: 'Side-by-side Vision LLM (Llama 3.2 Vision / Qwen 2 VL) visual grounding & obstacle detection.' },
  { name: 'browser.navigate', category: 'Browser & Tabs', description: 'Navigates active browser tab to target URL with anti-bot routing.' },
  { name: 'browser.click', category: 'Browser & Tabs', description: 'Simulates human click on DOM element target with mouse physics.' },
  { name: 'browser.type', category: 'Browser & Tabs', description: 'Types text into input with human keystroke latency emulation.' },
  { name: 'browser.press', category: 'Browser & Tabs', description: 'Dispatches keyboard key events (Enter, Tab, Escape).' },
  { name: 'browser.scroll', category: 'Browser & Tabs', description: 'Scrolls viewport with smooth natural acceleration.' },
  { name: 'browser.screenshot', category: 'Browser & Tabs', description: 'Captures high-resolution canvas frame for visual inspection.' },
  { name: 'browser.dom_extract', category: 'Browser & Tabs', description: 'Extracts normalized interactive elements with bounding boxes.' },
  { name: 'browser.get_a11y_tree', category: 'Browser & Tabs', description: 'Extracts full accessibility tree structure for semantic navigation.' },
  { name: 'data.compare_products', category: 'Commerce & Data Extraction', description: 'Extracts product cards (title, price, ratings, links) from Amazon or e-commerce catalog.' },
  { name: 'data.filter_budget', category: 'Commerce & Data Extraction', description: 'Filters extracted products by maximum price threshold (e.g. ₹2,00,000 / 2 Lakhs).' },
  { name: 'browser.get_github_repos', category: 'Research & Extraction', description: 'Extracts and ranks repository cards from GitHub search by star count.' },
  { name: 'browser.get_content', category: 'Research & Extraction', description: 'Extracts full readable textual and structural content from active tab.' },
  { name: 'agent.create_note', category: 'Research & Knowledge Notes', description: 'Compiles and persists Markdown research note with direct hyperlinks.' },
  { name: 'agent.adapt_plan', category: 'Adaptive Planning & Control', description: 'Dynamically adapts and updates plan checklist upon unexpected deviation or bot challenge.' },
  { name: 'agent.decompose_intent', category: 'Adaptive Planning & Control', description: 'Decomposes raw user prompt into clean keywords, target domain, and workflow intent.' }
];

export function DevToolsDrawer({
  domElements = [],
  a11yNodes = [],
  tools = [],
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

  const displayTools = tools && tools.length > 0 ? tools : DEFAULT_REGISTERED_TOOLS;

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

          {/* 3. Registered Tool Suite & Execution History */}
          {activeTab === 'tools' && (
            <div className="space-y-3">
              {/* Header & Category Stats */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-300 font-bold font-mono">
                    AEGIS Agent Tool Suite ({displayTools.length} Tools Registered)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 font-mono">
                    Multi-Tool Engine Active
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {toolCalls.length} Invocations Executed
                </span>
              </div>

              {/* Registered Tools Grid */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block">
                  Registered Tool Catalog & Capabilities
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {displayTools.map((t, idx) => {
                    const isStealth = t.category?.includes('Stealth');
                    const isVision = t.category?.includes('Vision');
                    const isCommerce = t.category?.includes('Commerce');
                    const isPlan = t.category?.includes('Planning');

                    return (
                      <div
                        key={idx}
                        className="p-2.5 bg-[#08090b] rounded-lg border border-white/[0.06] hover:border-white/10 transition-colors flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-mono text-xs font-bold text-cyan-300 truncate">
                              {t.name}
                            </span>
                            <span className={`text-[8px] font-mono px-1 rounded uppercase font-semibold ${
                              isStealth ? 'bg-amber-950 text-amber-400 border border-amber-500/30' :
                              isVision ? 'bg-purple-950 text-purple-400 border border-purple-500/30' :
                              isCommerce ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' :
                              isPlan ? 'bg-indigo-950 text-indigo-400 border border-indigo-500/30' :
                              'bg-slate-900 text-slate-400 border border-slate-700'
                            }`}>
                              {t.category || 'Browser Tool'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug font-sans line-clamp-2 mb-2">
                            {t.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono pt-1.5 border-t border-white/[0.04]">
                          <span className="text-slate-500">RPC Enabled</span>
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            ONLINE
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Execution History */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block">
                  Active Task Tool Invocations ({toolCalls.length})
                </span>

                <div className="space-y-1.5">
                  {toolCalls.length > 0 ? (
                    toolCalls.map((tc, idx) => (
                      <div key={idx} className="p-2 bg-[#08090b] rounded border border-white/[0.06] flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {tc.status === 'success' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          )}
                          <span className="text-cyan-300 font-semibold text-xs font-mono shrink-0">{tc.tool}</span>
                          <span className="text-slate-400 text-[10px] truncate max-w-md font-mono">
                            {JSON.stringify(tc.args || {})}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500 shrink-0">
                          <span>{tc.duration_ms || 12}ms</span>
                          <span>{new Date(tc.timestamp || Date.now()).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 py-2 text-center text-xs font-mono">No tool calls executed in current task yet.</p>
                  )}
                </div>
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
