import React, { useRef, useState } from 'react';
import { 
  Navigation, 
  Target, 
  MousePointer, 
  Sparkles,
  Crosshair,
  Layers
} from 'lucide-react';

export function BrowserViewport({
  screencastFrame,
  mouse,
  clickPulses,
  targetElement,
  agentState,
  manualClick,
  manualType,
  manualScroll
}) {
  const containerRef = useRef(null);
  const [showCursor, setShowCursor] = useState(true);
  const [showTargetHalo, setShowTargetHalo] = useState(true);

  // Viewport native dimensions from Playwright (1280x800)
  const NATIVE_WIDTH = 1280;
  const NATIVE_HEIGHT = 800;

  const handleViewportClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = NATIVE_WIDTH / rect.width;
    const scaleY = NATIVE_HEIGHT / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX);
    const clickY = Math.round((e.clientY - rect.top) * scaleY);

    manualClick(clickX, clickY);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? 'down' : 'up';
    manualScroll(direction, Math.abs(e.deltaY) * 2);
  };

  // Coordinates converted to percentage
  const cursorLeftPercent = (mouse.x / NATIVE_WIDTH) * 100;
  const cursorTopPercent = (mouse.y / NATIVE_HEIGHT) * 100;

  const isMoving = mouse.state === 'moving';
  const isClicking = mouse.state === 'clicking';
  const isExecuting = agentState?.status === 'executing';

  return (
    <div className="relative flex-1 bg-aegis-bg flex items-center justify-center overflow-hidden p-3 select-none">
      {/* Viewport Frame Shell */}
      <div 
        ref={containerRef}
        onClick={handleViewportClick}
        onWheel={handleWheel}
        className="relative w-full h-full max-w-[1280px] max-h-[800px] aspect-[16/10] bg-[#050608] rounded-xl shadow-2xl border border-aegis-border overflow-hidden group cursor-crosshair"
      >
        {/* Real-time Screencast Image Stream */}
        {screencastFrame ? (
          <img
            src={screencastFrame}
            alt="AEGIS Real Chromium Surface"
            className="w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-aegis-text-muted gap-3 bg-aegis-panel/40">
            <div className="relative flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border border-cyan-500/30 border-t-cyan-400 animate-spin" />
              <Navigation className="w-4 h-4 text-cyan-400 absolute" />
            </div>
            <p className="text-xs font-mono text-aegis-text-secondary">
              Connecting to Chromium CDP stream...
            </p>
          </div>
        )}

        {/* Dynamic Target Element Highlight Box */}
        {showTargetHalo && targetElement && targetElement.bbox && (
          <div
            style={{
              left: `${(targetElement.bbox.viewport_x / NATIVE_WIDTH) * 100}%`,
              top: `${(targetElement.bbox.viewport_y / NATIVE_HEIGHT) * 100}%`,
              width: `${(targetElement.bbox.width / NATIVE_WIDTH) * 100}%`,
              height: `${(targetElement.bbox.height / NATIVE_HEIGHT) * 100}%`
            }}
            className="absolute pointer-events-none z-20 border border-cyan-400 bg-cyan-400/10 rounded shadow-[0_0_12px_rgba(0,242,254,0.3)] transition-all duration-200 animate-pulse"
          >
            <div className="absolute -top-5 left-0 bg-cyan-400 text-black text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shadow whitespace-nowrap flex items-center gap-1">
              <Crosshair className="w-2.5 h-2.5" />
              <span>TARGET [{targetElement.element_id}]</span>
            </div>
          </div>
        )}

        {/* Click Pulses */}
        {clickPulses.map((pulse) => (
          <div
            key={pulse.id}
            style={{
              left: `${(pulse.x / NATIVE_WIDTH) * 100}%`,
              top: `${(pulse.y / NATIVE_HEIGHT) * 100}%`
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-25"
          >
            <div className="w-9 h-9 rounded-full border border-cyan-400 bg-cyan-400/20 click-pulse" />
          </div>
        ))}

        {/* Modern AEGIS AI Control Cursor (PRD §15 & User Spec) */}
        {showCursor && (
          <div
            style={{
              left: `${cursorLeftPercent}%`,
              top: `${cursorTopPercent}%`
            }}
            className="absolute pointer-events-none z-30 transition-transform duration-100 ease-out -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          >
            {/* Reticle / AI Core Entity */}
            <div className="relative flex items-center justify-center">
              {/* Outer Subtle Halo Ring */}
              <div 
                className={`w-6 h-6 rounded-full border border-cyan-400/50 transition-all duration-150 ${
                  isClicking 
                    ? 'scale-125 border-cyan-300 bg-cyan-400/25' 
                    : isMoving 
                    ? 'scale-110 border-cyan-400/70' 
                    : 'scale-100'
                }`}
              />

              {/* Central Core Dot */}
              <div 
                className={`w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#00F2FE] absolute transition-transform duration-100 ${
                  isClicking ? 'scale-75' : 'scale-100'
                }`}
              />

              {/* Subtle Trailing Line when Moving */}
              {isMoving && (
                <div className="absolute w-8 h-[1px] bg-gradient-to-r from-transparent to-cyan-400/60 -top-1 -right-2 rotate-45 pointer-events-none" />
              )}
            </div>

            {/* Coordinate Telemetry Pill */}
            <div className="mt-1 px-1.5 py-0.5 rounded bg-black/80 border border-white/10 backdrop-blur-md text-[9px] font-mono text-cyan-300 shadow-md flex items-center gap-1 whitespace-nowrap">
              <span>x:{mouse.x} y:{mouse.y}</span>
              {isExecuting && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </div>
          </div>
        )}

        {/* Floating Viewport Quick Controls */}
        <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1 bg-black/75 backdrop-blur-md p-1 rounded-lg border border-white/10 opacity-70 hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setShowCursor(!showCursor); }}
            className={`p-1 rounded text-xs transition-colors ${
              showCursor ? 'text-cyan-400 bg-cyan-950/50' : 'text-aegis-text-muted hover:text-aegis-text-primary'
            }`}
            title="Toggle AI Cursor"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setShowTargetHalo(!showTargetHalo); }}
            className={`p-1 rounded text-xs transition-colors ${
              showTargetHalo ? 'text-cyan-400 bg-cyan-950/50' : 'text-aegis-text-muted hover:text-aegis-text-primary'
            }`}
            title="Toggle Target Element Highlight"
          >
            <Target className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-white/10 mx-0.5" />

          <span className="text-[10px] font-mono text-aegis-text-muted px-1">
            {NATIVE_WIDTH}x{NATIVE_HEIGHT}
          </span>
        </div>

        {/* Subtle Bottom Telemetry Info */}
        <div className="absolute bottom-2 left-2.5 z-30 pointer-events-none">
          <span className="text-[10px] font-mono text-aegis-text-muted bg-black/60 px-2 py-0.5 rounded border border-white/5 backdrop-blur-sm">
            AEGIS Chromium Canvas • Active
          </span>
        </div>
      </div>
    </div>
  );
}

