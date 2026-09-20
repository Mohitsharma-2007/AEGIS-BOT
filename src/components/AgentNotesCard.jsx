import React, { useState } from 'react';
import { FileText, Copy, Check, ExternalLink, Star } from 'lucide-react';

export function AgentNotesCard({ notes = [] }) {
  const [selectedNoteIndex, setSelectedNoteIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!notes || notes.length === 0) {
    return (
      <div className="bg-aegis-card border border-aegis-border rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-aegis-text-primary">
              Research & Notes
            </h3>
          </div>
          <span className="text-[10px] font-mono bg-white/[0.04] text-aegis-text-muted px-2 py-0.2 rounded border border-white/5">
            0 Notes
          </span>
        </div>
        <div className="border border-dashed border-white/10 rounded-lg p-3 text-center">
          <p className="text-xs text-aegis-text-secondary">No persistent notes generated yet.</p>
          <p className="text-[11px] text-aegis-text-muted mt-1 font-sans">
            Ask AEGIS to research GitHub repos, compare laptops, or extract article summaries.
          </p>
        </div>
      </div>
    );
  }

  const activeNote = notes[selectedNoteIndex] || notes[0];

  const handleCopy = () => {
    if (activeNote?.markdown) {
      navigator.clipboard.writeText(activeNote.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-aegis-card border border-aegis-border hover:border-cyan-500/30 rounded-xl p-3.5 shadow-sm transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5 border-b border-white/[0.06] pb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs">
            <FileText className="w-3 h-3" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-aegis-text-primary flex items-center gap-1.5">
              Research Notes
              <span className="text-[9px] bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono">
                {notes.length} saved
              </span>
            </h3>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="text-[11px] font-mono px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-aegis-text-secondary hover:text-aegis-text-primary border border-white/5 transition flex items-center gap-1"
          title="Copy Markdown"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-aegis-text-muted" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Note Tabs if multiple */}
      {notes.length > 1 && (
        <div className="flex gap-1 mb-2.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {notes.map((n, idx) => (
            <button
              key={n.id || idx}
              onClick={() => setSelectedNoteIndex(idx)}
              className={`text-[11px] font-mono px-2 py-0.5 rounded border transition whitespace-nowrap ${
                idx === selectedNoteIndex
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-medium'
                  : 'bg-white/[0.02] border-white/5 text-aegis-text-muted hover:text-aegis-text-secondary'
              }`}
            >
              {n.stars && `⭐ `}{n.title?.slice(0, 20) || n.filename}...
            </button>
          ))}
        </div>
      )}

      {/* Active Note Content */}
      <div className="bg-aegis-panel border border-white/[0.04] rounded-lg p-3 space-y-2.5">
        {/* Title & Metadata */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-xs font-semibold text-aegis-text-primary leading-snug font-sans">
              {activeNote.title || 'Research Analysis'}
            </h4>
            {activeNote.stars && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-medium flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-amber-400" />
                {activeNote.stars}
              </span>
            )}
          </div>

          {activeNote.repo_url && (
            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              <span className="text-aegis-text-muted">Repository:</span>
              <a
                href={activeNote.repo_url}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1 font-mono break-all"
              >
                <span>{activeNote.repo_url}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}
        </div>

        {/* Note Body */}
        <div className="border-t border-white/[0.04] pt-2 text-xs text-aegis-text-secondary leading-relaxed font-sans max-h-48 overflow-y-auto space-y-2 pr-1 [scrollbar-width:thin]">
          {activeNote.content ? (
            <div className="space-y-1.5">
              {activeNote.content.split('\n\n').map((para, pIdx) => {
                if (para.startsWith('## ') || para.startsWith('### ')) {
                  return (
                    <h5 key={pIdx} className="text-xs font-bold text-cyan-400 mt-1.5 mb-1 font-mono">
                      {para.replace(/^###?\s+/, '')}
                    </h5>
                  );
                }
                if (para.startsWith('1. ') || para.startsWith('- ')) {
                  return (
                    <ul key={pIdx} className="list-disc pl-4 space-y-0.5 text-aegis-text-secondary">
                      {para.split('\n').map((li, lIdx) => (
                        <li key={lIdx} dangerouslySetInnerHTML={{
                          __html: li.replace(/^(\d+\.|\-)\s+/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-aegis-text-primary">$1</strong>')
                        }} />
                      ))}
                    </ul>
                  );
                }
                return (
                  <p key={pIdx} dangerouslySetInnerHTML={{
                    __html: para.replace(/\*\*(.*?)\*\*/g, '<strong class="text-aegis-text-primary">$1</strong>')
                  }} />
                );
              })}
            </div>
          ) : (
            <pre className="text-[11px] font-mono whitespace-pre-wrap text-aegis-text-secondary">
              {activeNote.markdown}
            </pre>
          )}

          {activeNote.takeaways && activeNote.takeaways.length > 0 && (
            <div className="mt-2 bg-white/[0.02] border border-cyan-500/20 rounded p-2">
              <span className="text-[10px] font-mono uppercase text-cyan-300 block mb-1">
                Key Takeaways
              </span>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-aegis-text-secondary">
                {activeNote.takeaways.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[9px] font-mono text-aegis-text-muted">
          <span>{activeNote.filename}</span>
          <span>{activeNote.timestamp ? new Date(activeNote.timestamp).toLocaleTimeString() : ''}</span>
        </div>
      </div>
    </div>
  );
}
