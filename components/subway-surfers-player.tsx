"use client";

import { useState } from "react";
import { X, Minus, Maximize2, Sparkles } from "lucide-react";
import { useAccessibility } from "@/lib/accessibility";

export default function SubwaySurfersPlayer() {
  const { preferences, updatePreferences, isSubwaySurfersFeatureEnabled } = useAccessibility();
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isSubwaySurfersFeatureEnabled || !preferences.subwaySurfers) return null;

  return (
    <div
      className={`fixed top-20 left-4 z-50 transition-all duration-300 ease-in-out ${
        isMinimized ? "w-64" : "w-64 sm:w-72"
      } rounded-2xl bg-slate-900/95 text-white border-2 border-[#48A5EE]/50 shadow-2xl shadow-blue-500/20 backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-top-4`}
      role="region"
      aria-label="Subway Surfers Focus Player"
    >
      {/* Window Header */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <span className="text-base" role="img" aria-label="skateboard">
            🛹
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide">
                Subway Surfers
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#48A5EE]/20 text-[#48A5EE] border border-[#48A5EE]/30 uppercase tracking-wider">
                Focus
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={isMinimized ? "Expand Player" : "Minimize Player"}
            aria-label={isMinimized ? "Expand Player" : "Minimize Player"}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => updatePreferences({ subwaySurfers: false })}
            className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Subway Surfers"
            aria-label="Close Subway Surfers"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video Content */}
      {!isMinimized && (
        <div className="relative w-full aspect-[9/16] bg-black">
          <iframe
            className="w-full h-full border-0"
            src="https://www.youtube-nocookie.com/embed/m2XZ_HLq43o?autoplay=1&mute=1&loop=1&playlist=m2XZ_HLq43o&playsinline=1&controls=1&modestbranding=1&rel=0"
            title="Subway Surfers Gameplay Focus Stream"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
          {/* Subtle bottom info bar */}
          <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#48A5EE]" />
              Endless Gameplay
            </span>
            <span className="text-[9px] text-slate-500 font-mono">Top-Left Dock</span>
          </div>
        </div>
      )}

      {/* Minimized Pill state */}
      {isMinimized && (
        <div
          onClick={() => setIsMinimized(false)}
          className="p-2.5 text-center cursor-pointer hover:bg-slate-800/60 transition-colors flex items-center justify-between"
        >
          <span className="text-[11px] font-medium text-slate-300">
            Gameplay minimized
          </span>
          <span className="text-[10px] text-[#48A5EE] font-bold">Tap to expand</span>
        </div>
      )}
    </div>
  );
}
