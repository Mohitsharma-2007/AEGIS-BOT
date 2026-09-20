import React from 'react';

/**
 * Reusable AEGIS AI Entity Avatar
 * States: 'idle' | 'thinking' | 'working' | 'success' | 'error'
 * Sizes: 'sm' (20px) | 'md' (32px) | 'lg' (48px) | 'xl' (64px)
 */
export function AegisAvatar({
  status = 'idle',
  size = 'md',
  className = '',
  showRing = true
}) {
  // Normalize status
  const normalizedStatus = (() => {
    switch (status) {
      case 'planning':
        return 'thinking';
      case 'executing':
        return 'working';
      case 'completed':
        return 'success';
      case 'failed':
      case 'stopped':
      case 'interrupted':
        return 'error';
      default:
        return status;
    }
  })();

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const coreSizes = {
    sm: 'w-2 h-2',
    md: 'w-3.5 h-3.5',
    lg: 'w-5 h-5',
    xl: 'w-7 h-7'
  };

  const orbitSizes = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-11 h-11',
    xl: 'w-15 h-15'
  };

  // State colors
  const stateStyles = {
    idle: {
      core: 'bg-aegis-text-secondary group-hover:bg-cyan-400 transition-colors',
      ring: 'border-white/10 group-hover:border-cyan-400/30',
      glow: 'opacity-0 group-hover:opacity-40',
      accent: '#9A9DA5'
    },
    thinking: {
      core: 'bg-cyan-400 animate-aegis-pulse',
      ring: 'border-cyan-500/40 border-dashed animate-aegis-orbit',
      glow: 'opacity-70 bg-cyan-400/20 blur-sm',
      accent: '#00F2FE'
    },
    working: {
      core: 'bg-cyan-300 shadow-[0_0_8px_rgba(0,242,254,0.8)]',
      ring: 'border-cyan-400 border-t-transparent border-r-transparent animate-aegis-orbit',
      glow: 'opacity-90 bg-cyan-400/30 blur-md',
      accent: '#00F2FE'
    },
    success: {
      core: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
      ring: 'border-emerald-500/40',
      glow: 'opacity-80 bg-emerald-400/20 blur-sm',
      accent: '#10B981'
    },
    error: {
      core: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
      ring: 'border-rose-500/40',
      glow: 'opacity-80 bg-rose-400/20 blur-sm',
      accent: '#F43F5E'
    }
  };

  const current = stateStyles[normalizedStatus] || stateStyles.idle;

  return (
    <div
      className={`relative flex items-center justify-center select-none group shrink-0 ${sizeClasses[size]} ${className}`}
      title={`AEGIS State: ${normalizedStatus.toUpperCase()}`}
      aria-label={`AEGIS Entity - Status: ${normalizedStatus}`}
    >
      {/* Background Soft Glow */}
      <div
        className={`absolute inset-0 rounded-full transition-opacity duration-300 pointer-events-none ${current.glow}`}
      />

      {/* Outer Orbiting / Breathing Technical Ring */}
      {showRing && (
        <div
          className={`absolute rounded-full border transition-all duration-300 pointer-events-none ${orbitSizes[size]} ${current.ring}`}
        >
          {normalizedStatus === 'working' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-cyan-300 shadow-[0_0_4px_#00F2FE]" />
          )}
        </div>
      )}

      {/* Subtle Inner Octagon / Diamond Shield Grid */}
      <svg
        className={`absolute inset-0 w-full h-full pointer-events-none opacity-40 transition-transform duration-500 ${
          normalizedStatus === 'working' ? 'rotate-45' : 'rotate-0'
        }`}
        viewBox="0 0 32 32"
        fill="none"
      >
        <polygon
          points="16,3 29,16 16,29 3,16"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      </svg>

      {/* Central Geometric AI Core */}
      <div
        className={`rounded-full transition-all duration-200 z-10 flex items-center justify-center ${coreSizes[size]} ${current.core}`}
      >
        {size === 'lg' || size === 'xl' ? (
          <div className="w-1.5 h-1.5 rounded-full bg-white/90" />
        ) : null}
      </div>
    </div>
  );
}
