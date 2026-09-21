import React, { useState, useEffect, useRef } from 'react';
import { Shield, Key, Lock, Eye, EyeOff, AlertCircle, ArrowRight, X } from 'lucide-react';

export function AegisPromptModal({ request, onSubmit, onCancel }) {
  if (!request) return null;

  const { id, title, reason, fields = [] } = request;

  // Initialize field values
  const [formValues, setFormValues] = useState(() => {
    const initial = {};
    fields.forEach(f => {
      initial[f.name] = f.value !== undefined ? f.value : '';
    });
    return initial;
  });

  const [showPassword, setShowPassword] = useState({});
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [request]);

  const handleChange = (name, value) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const toggleShowPassword = (name) => {
    setShowPassword(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(id, formValues);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel(id);
    }
  };

  const isAuth = title.toLowerCase().includes('credential') || title.toLowerCase().includes('password') || title.toLowerCase().includes('login');
  const isOtp = title.toLowerCase().includes('otp') || title.toLowerCase().includes('2fa') || title.toLowerCase().includes('verification');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hitl-modal-title"
    >
      <div 
        className="w-full max-w-md bg-[#0D121F] border border-cyan-500/40 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col scale-in-95 duration-200 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              {isAuth ? <Lock className="w-5 h-5 animate-pulse" /> : isOtp ? <Key className="w-5 h-5 text-amber-400" /> : <Shield className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-wider uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                  Human-In-The-Loop
                </span>
              </div>
              <h2 id="hitl-modal-title" className="text-base font-semibold text-white mt-0.5">
                {title || 'Input Required'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onCancel(id)}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title="Cancel and skip"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reason / Context Callout */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white/80 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>{reason || 'The current page requires input parameters to continue automation safely.'}</p>
          </div>
        </div>

        {/* Dynamic Fields Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-2 flex flex-col gap-4">
          <div className="flex flex-col gap-3.5">
            {fields.map((field, idx) => {
              const isSecret = field.secret || field.type === 'password';
              const inputType = isSecret ? (showPassword[field.name] ? 'text' : 'password') : (field.type || 'text');

              return (
                <div key={field.name || idx} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label 
                      htmlFor={`field-${field.name}`}
                      className="text-xs font-medium text-white/90 flex items-center gap-1.5"
                    >
                      {field.label || field.name}
                      {field.required && (
                        <span className="text-cyan-400 font-mono text-[10px]">*required</span>
                      )}
                    </label>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      id={`field-${field.name}`}
                      ref={idx === 0 ? firstInputRef : null}
                      type={inputType}
                      value={formValues[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      placeholder={field.placeholder || `Enter ${field.label || field.name}`}
                      required={field.required}
                      autoComplete="off"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 focus:border-cyan-400 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-cyan-400/50 text-sm text-white placeholder:text-white/30 transition-all font-sans"
                    />

                    {isSecret && (
                      <button
                        type="button"
                        onClick={() => toggleShowPassword(field.name)}
                        className="absolute right-3 p-1 text-white/40 hover:text-white/80 transition-colors"
                        tabIndex={-1}
                        title={showPassword[field.name] ? 'Hide password' : 'Show password'}
                      >
                        {showPassword[field.name] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 mt-1">
            <button
              type="button"
              onClick={() => onCancel(id)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
            >
              Skip / Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active:scale-95"
            >
              <span>Submit to AEGIS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
