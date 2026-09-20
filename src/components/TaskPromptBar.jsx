import React, { useState } from 'react';
import { Send, Sparkles, Compass, ShoppingCart, Github, BookOpen } from 'lucide-react';

export function TaskPromptBar({ runTask, isExecuting }) {
  const [taskInput, setTaskInput] = useState('');

  const quickTasks = [
    { 
      label: '⭐ GitHub AI Agents: Rank by Stars & Create Note', 
      icon: Github, 
      query: 'Search GitHub for AI browser agents and Find the One with highest Stars , read them properly and get Information about them and also Link for the REPO and Create an Note regarding that' 
    },
    { label: 'Search Amazon for RTX 5070 laptop', icon: ShoppingCart, query: 'Search Amazon for RTX 5070 laptop' },
    { label: 'Search Wikipedia for Chromium architecture', icon: BookOpen, query: 'Search Wikipedia for Chromium architecture' }
  ];


  const handleSubmit = (e) => {
    e.preventDefault();
    if (taskInput.trim() && !isExecuting) {
      runTask(taskInput.trim());
    }
  };

  return (
    <div className="bg-[#0f131a] border-t border-slate-800 p-3 space-y-2 shrink-0">
      {/* Quick Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] pb-1">
        <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          Quick Tasks:
        </span>
        {quickTasks.map((chip, idx) => {
          const Icon = chip.icon;
          return (
            <button
              key={idx}
              onClick={() => {
                setTaskInput(chip.query);
                runTask(chip.query);
              }}
              disabled={isExecuting}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-[11px] font-mono whitespace-nowrap transition-colors disabled:opacity-50"
            >
              <Icon className="w-3 h-3 text-cyan-400" />
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* Task Input Field */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            disabled={isExecuting}
            placeholder='Give AEGIS a task (e.g. "Search Amazon for RTX 5070 laptop" or "Search GitHub")...'
            className="w-full bg-[#07090e] border border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono outline-none transition-all disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={!taskInput.trim() || isExecuting}
          className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <span>Run Task</span>
          <Send className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </form>
    </div>
  );
}
