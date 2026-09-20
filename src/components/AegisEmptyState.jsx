import React from 'react';
import { AegisAvatar } from './AegisAvatar.jsx';
import { Search, Globe, FileSearch, Sparkles, Terminal } from 'lucide-react';

export function AegisEmptyState({ onSelectPrompt }) {
  const suggestions = [
    {
      label: 'Search GitHub for AI browser agents & find #1 highest stars',
      prompt: 'Search GitHub for AI browser agents and Find the One with highest Stars , read them properly and get Information about them and also Link for the REPO and Create an Note regarding that',
      icon: FileSearch,
      category: 'Research'
    },
    {
      label: 'Search Amazon for RTX 5070 laptop',
      prompt: 'Search Amazon for RTX 5070 laptop and compare top rated models',
      icon: Search,
      category: 'Shopping'
    },
    {
      label: 'Open Wikipedia and explore Chromium Architecture',
      prompt: 'Search Wikipedia for Chromium architecture and summarize multi-process design',
      icon: Globe,
      category: 'Knowledge'
    },
    {
      label: 'Inspect interactive DOM & accessibility tree of current tab',
      prompt: 'Extract interactive DOM elements and accessibility tree to analyze interactive controls',
      icon: Terminal,
      category: 'Developer'
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-xl mx-auto select-none">
      {/* Central Intelligent Entity Avatar */}
      <div className="mb-4">
        <AegisAvatar status="idle" size="lg" />
      </div>

      <h2 className="text-base font-semibold text-aegis-text-primary tracking-wide font-sans">
        AEGIS BROWSER ENVIRONMENT
      </h2>
      <p className="text-xs text-aegis-text-secondary mt-1.5 mb-6 max-w-md font-sans">
        Autonomous AI agent operating real Chromium. What task would you like AEGIS to execute?
      </p>

      {/* Suggestion Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        {suggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt)}
              className="group p-3 rounded-xl bg-aegis-card hover:bg-aegis-hover border border-aegis-border hover:border-cyan-500/40 text-left transition-all duration-150 flex items-start gap-2.5 shadow-sm"
            >
              <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5 group-hover:border-cyan-500/30 text-aegis-text-secondary group-hover:text-cyan-400 transition-colors mt-0.5 shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono text-cyan-400/80 block uppercase tracking-wider mb-0.5">
                  {item.category}
                </span>
                <span className="text-xs text-aegis-text-primary group-hover:text-cyan-200 transition-colors font-sans line-clamp-2 leading-snug">
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
