import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUp, 
  Paperclip, 
  Cpu, 
  Wrench, 
  Mic, 
  Sparkles,
  StopCircle
} from 'lucide-react';

export function AegisChatInput({
  onSendMessage,
  isExecuting = false,
  onStopAgent,
  activeModel = 'nvidia/nemotron-3.5-lightning:free',
  onOpenModelSelector,
  onToggleTools
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-grow textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 40), 160)}px`;
    }
  }, [text]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || isExecuting) return;
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }
  };

  const quickPrompts = [
    {
      label: '⭐ GitHub AI Agents: Rank by Stars & Create Note',
      query: 'Search GitHub for AI browser agents and Find the One with highest Stars , read them properly and get Information about them and also Link for the REPO and Create an Note regarding that'
    },
    {
      label: 'Amazon RTX 5070',
      query: 'Search Amazon for RTX 5070 laptop'
    },
    {
      label: 'Wikipedia Chromium Architecture',
      query: 'Search Wikipedia for Chromium architecture'
    }
  ];

  return (
    <div className="p-3 bg-aegis-secondary border-t border-aegis-border shrink-0 select-none">
      {/* Quick Suggestion Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] pb-2">
        <span className="text-[10px] font-mono uppercase text-aegis-text-muted flex items-center gap-1 shrink-0 mr-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          Suggested:
        </span>
        {quickPrompts.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              setText(item.query);
              onSendMessage(item.query);
            }}
            disabled={isExecuting}
            className="px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-cyan-500/30 text-aegis-text-secondary hover:text-aegis-text-primary text-[11px] font-mono whitespace-nowrap transition-all duration-150 disabled:opacity-40"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Input Box Shell */}
      <div className="bg-aegis-panel rounded-xl border border-aegis-border aegis-focus transition-all duration-200 p-2 shadow-lg">
        {/* Auto-growing Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isExecuting}
          rows={1}
          placeholder={isExecuting ? "AEGIS is currently executing a browser task..." : "Ask AEGIS anything (e.g. 'Search GitHub for AI agents', 'Search Amazon')..."}
          className="w-full bg-transparent text-xs text-aegis-text-primary placeholder-aegis-text-muted font-sans outline-none resize-none px-2 py-1 max-h-36 leading-relaxed disabled:opacity-50"
        />

        {/* Action Controls Toolbar */}
        <div className="flex items-center justify-between pt-1 mt-1 border-t border-white/[0.04]">
          {/* Left: Tools, Models & Attachments */}
          <div className="flex items-center gap-1">
            {/* Model Selector Pill */}
            {onOpenModelSelector && (
              <button
                type="button"
                onClick={onOpenModelSelector}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 text-[11px] font-mono text-aegis-text-secondary hover:text-cyan-300 transition-colors"
                title="Switch Active AI Model"
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span className="truncate max-w-[130px]">
                  {activeModel ? activeModel.split('/')[1] || activeModel : 'Model'}
                </span>
              </button>
            )}

            {/* Quick Tools Button */}
            {onToggleTools && (
              <button
                type="button"
                onClick={onToggleTools}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/5 text-[11px] font-mono text-aegis-text-secondary hover:text-aegis-text-primary transition-colors"
                title="Inspect Registered Browser Tools"
              >
                <Wrench className="w-3.5 h-3.5 text-aegis-text-muted" />
                <span className="hidden sm:inline">Tools</span>
              </button>
            )}

            {/* Attachment Placeholder */}
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-white/5 text-aegis-text-muted hover:text-aegis-text-secondary transition-colors"
              title="Add Context or File (Coming Soon)"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: Voice & Send Button */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-white/5 text-aegis-text-muted hover:text-aegis-text-secondary transition-colors"
              title="Voice Input (Coming Soon)"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>

            {isExecuting ? (
              <button
                type="button"
                onClick={onStopAgent}
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 animate-pulse"
                title="Halt Agent Execution"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim()}
                className={`p-1.5 rounded-lg transition-all duration-150 flex items-center justify-center ${
                  text.trim()
                    ? 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_12px_rgba(0,242,254,0.4)] active:scale-90 cursor-pointer'
                    : 'bg-white/5 text-aegis-text-muted cursor-not-allowed opacity-40'
                }`}
                title="Run Task (Enter)"
                aria-label="Send Task"
              >
                <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
