import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Plus, 
  X, 
  Lock, 
  Globe, 
  ExternalLink,
  ShieldCheck,
  MoreVertical
} from 'lucide-react';

export function BrowserControls({
  tabs = [],
  navigate,
  newTab,
  switchTab,
  closeTab
}) {
  const activeTab = tabs.find(t => t.active) || tabs[0];
  const [urlInput, setUrlInput] = useState(activeTab?.url || '');

  useEffect(() => {
    if (activeTab?.url) {
      setUrlInput(activeTab.url);
    }
  }, [activeTab?.url]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (urlInput.trim()) {
      navigate(urlInput.trim(), activeTab?.id);
    }
  };

  const getDomainFromUrl = (rawUrl) => {
    try {
      if (!rawUrl.startsWith('http')) return rawUrl;
      const parsed = new URL(rawUrl);
      return parsed.hostname;
    } catch {
      return rawUrl;
    }
  };

  return (
    <div className="bg-aegis-secondary border-b border-aegis-border shrink-0 select-none">
      {/* 1. Technical Browser Tabs */}
      <div className="flex items-center gap-1 px-2.5 pt-1.5 overflow-x-auto [scrollbar-width:none]">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab?.id;
          return (
            <div
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs transition-all duration-150 cursor-pointer select-none max-w-[200px] border-t border-x ${
                isActive
                  ? 'bg-aegis-panel text-aegis-text-primary border-aegis-border font-medium shadow-sm'
                  : 'bg-transparent text-aegis-text-muted hover:text-aegis-text-secondary hover:bg-white/[0.03] border-transparent'
              }`}
            >
              {/* Tab Icon / Loading Spinner */}
              {tab.loading ? (
                <div className="w-3 h-3 rounded-full border border-cyan-400 border-t-transparent animate-spin shrink-0" />
              ) : (
                <Globe className={`w-3 h-3 shrink-0 ${isActive ? 'text-cyan-400' : 'text-aegis-text-muted'}`} />
              )}
              
              {/* Tab Title */}
              <span className="truncate text-[11px] font-mono leading-none">
                {tab.title || getDomainFromUrl(tab.url) || 'New Tab'}
              </span>

              {/* Close Tab Button */}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:bg-white/10 p-0.5 rounded text-aegis-text-muted hover:text-aegis-text-primary transition-opacity ml-auto"
                  title="Close tab"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}

              {/* Active Tab Accent Line */}
              {isActive && (
                <div className="absolute -top-[1px] left-0 right-0 h-[2px] bg-cyan-400" />
              )}
            </div>
          );
        })}

        {/* New Tab Button */}
        <button
          onClick={() => newTab('https://www.google.com')}
          className="p-1 rounded-md text-aegis-text-muted hover:text-aegis-text-primary hover:bg-white/[0.06] transition-colors ml-0.5 active:scale-90"
          title="Open new browser tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Navigation Toolbar & Address Bar */}
      <div className="relative flex items-center gap-1.5 px-3 py-1.5 bg-aegis-panel border-t border-aegis-border">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => navigate('back', activeTab?.id)}
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-aegis-text-secondary hover:text-aegis-text-primary active:scale-95 transition-all"
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate('forward', activeTab?.id)}
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-aegis-text-secondary hover:text-aegis-text-primary active:scale-95 transition-all"
            title="Forward"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate(activeTab?.url || 'reload', activeTab?.id)}
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-aegis-text-secondary hover:text-aegis-text-primary active:scale-95 transition-all"
            title="Reload page"
          >
            <RotateCw className={`w-3.5 h-3.5 ${activeTab?.loading ? 'text-cyan-400 animate-spin' : ''}`} />
          </button>
        </div>

        {/* Omnibar / Address Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center">
          <div className="relative w-full flex items-center aegis-focus rounded-lg border border-aegis-border bg-aegis-bg transition-all">
            <div className="absolute left-2.5 flex items-center pointer-events-none">
              {activeTab?.url?.startsWith('https://') ? (
                <Lock className="w-3 h-3 text-emerald-400" />
              ) : (
                <Globe className="w-3 h-3 text-aegis-text-muted" />
              )}
            </div>

            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Search or enter URL..."
              className="w-full bg-transparent pl-8 pr-14 py-1.5 text-xs text-aegis-text-primary placeholder-aegis-text-muted font-mono outline-none"
            />

            <div className="absolute right-1.5 flex items-center gap-1">
              <button
                type="submit"
                className="px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-[10px] font-mono text-aegis-text-secondary hover:text-aegis-text-primary transition-colors active:scale-95"
              >
                Go
              </button>
            </div>
          </div>
        </form>

        {/* External Link Shortcut */}
        {activeTab?.url && (
          <a
            href={activeTab.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-aegis-text-secondary hover:text-aegis-text-primary active:scale-95 transition-all"
            title="Open in native Chrome"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Animated Loading Bar at bottom edge of toolbar */}
        {activeTab?.loading && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5 overflow-hidden">
            <div className="h-full bg-cyan-400 animate-pulse w-2/3" />
          </div>
        )}
      </div>
    </div>
  );
}

