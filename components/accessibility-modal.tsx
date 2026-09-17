"use client";

import { useEffect, useRef } from "react";
import {
  X,
  Eye,
  Type,
  Volume2,
  VolumeX,
  Sparkles,
  MoveHorizontal,
  RotateCcw,
  Check,
  Zap,
} from "lucide-react";
import { useAccessibility } from "@/lib/accessibility";
import { playSampleSound } from "@/lib/audio-cues";

interface AccessibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccessibilityModal({ isOpen, onClose }: AccessibilityModalProps) {
  const { preferences, updatePreferences, resetPreferences } = useAccessibility();
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#48A5EE]/10 dark:bg-[#48A5EE]/20 flex items-center justify-center text-[#48A5EE]">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="a11y-modal-title"
                className="text-base font-bold text-slate-800 dark:text-slate-100"
              >
                Accessibility Options
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Customize your viewing, reading, and sensory preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close accessibility options"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* 1. TEXT SIZING */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Type className="w-3.5 h-3.5 text-[#48A5EE]" />
                <span>Text Size</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {preferences.fontSize === "normal"
                  ? "Standard (100%)"
                  : preferences.fontSize === "large"
                  ? "Large (112%)"
                  : "Extra Large (125%)"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => updatePreferences({ fontSize: "normal" })}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  preferences.fontSize === "normal"
                    ? "bg-[#48A5EE] text-white border-[#48A5EE] shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => updatePreferences({ fontSize: "large" })}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  preferences.fontSize === "large"
                    ? "bg-[#48A5EE] text-white border-[#48A5EE] shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                Large (112%)
              </button>
              <button
                type="button"
                onClick={() => updatePreferences({ fontSize: "xlarge" })}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  preferences.fontSize === "xlarge"
                    ? "bg-[#48A5EE] text-white border-[#48A5EE] shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                XL (125%)
              </button>
            </div>
          </div>

          {/* 2. TYPOGRAPHY & READING */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Reading &amp; Focus
            </h3>

            {/* Dyslexia-Friendly Font */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="space-y-0.5 pr-4">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Dyslexia-Friendly Font (Lexend)
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Uses specialized spacing and distinct character shapes designed to reduce visual crowding.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.dyslexicFont}
                onClick={() => updatePreferences({ dyslexicFont: !preferences.dyslexicFont })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  preferences.dyslexicFont ? "bg-[#48A5EE]" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    preferences.dyslexicFont ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Reading Guide Ruler */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="space-y-0.5 pr-4">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MoveHorizontal className="w-3.5 h-3.5 text-[#48A5EE]" />
                  <span>Reading Guide Focus Ruler</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Displays a soft translucent horizontal bar following your cursor to help track text and lines.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.readingGuide}
                onClick={() => updatePreferences({ readingGuide: !preferences.readingGuide })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  preferences.readingGuide ? "bg-[#48A5EE]" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    preferences.readingGuide ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 3. VISUAL CONTRAST & MOTION */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Visual &amp; Motion
            </h3>

            {/* High Contrast */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="space-y-0.5 pr-4">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Enhanced High Contrast Mode
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Maximizes text legibility and reinforces element outlines (WCAG AAA).
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.highContrast}
                onClick={() => updatePreferences({ highContrast: !preferences.highContrast })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  preferences.highContrast ? "bg-[#48A5EE]" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    preferences.highContrast ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="space-y-0.5 pr-4">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#48A5EE]" />
                  <span>Reduced Motion</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Disables confetti celebrations, background pulses, and animated transitions.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.reducedMotion}
                onClick={() => updatePreferences({ reducedMotion: !preferences.reducedMotion })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  preferences.reducedMotion ? "bg-[#48A5EE]" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    preferences.reducedMotion ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Keyboard Focus Outlines */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="space-y-0.5 pr-4">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  High-Visibility Focus Indicators
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Emphasizes interactive elements with high-contrast outlines during keyboard navigation.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.keyboardFocus}
                onClick={() => updatePreferences({ keyboardFocus: !preferences.keyboardFocus })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  preferences.keyboardFocus ? "bg-[#48A5EE]" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    preferences.keyboardFocus ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 4. AUDIO & SENSORY */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Audio &amp; Sensory
            </h3>

            {/* Sound Mute */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="space-y-0.5 pr-4">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  {preferences.soundMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  <span>Mute Audible Lesson Chimes</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Silences the countdown chimes, start sound, and delay notifications.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!preferences.soundMuted && (
                  <button
                    type="button"
                    onClick={() => playSampleSound()}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-bold cursor-pointer transition-colors"
                    title="Play a quick sample tone"
                  >
                    Test
                  </button>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.soundMuted}
                  onClick={() => updatePreferences({ soundMuted: !preferences.soundMuted })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    preferences.soundMuted ? "bg-red-500" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      preferences.soundMuted ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 5. SECRET EASTER EGG */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>🤫 Secret Mode</span>
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 tracking-wider">
                EASTER EGG
              </span>
            </div>

            {/* Subway Surfers Option */}
            <div
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                preferences.subwaySurfers
                  ? "bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-cyan-500/10 border-[#48A5EE]/50 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="space-y-0.5 pr-4">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span role="img" aria-label="skateboard" className="text-sm">
                    🛹
                  </span>
                  <span>Subway Surfers Focus Video</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Plays endless Subway Surfers gameplay in the top-left corner of the screen for maximum focus and stimulation.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.subwaySurfers}
                onClick={() =>
                  updatePreferences({ subwaySurfers: !preferences.subwaySurfers })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  preferences.subwaySurfers ? "bg-[#48A5EE]" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    preferences.subwaySurfers ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
          <button
            type="button"
            onClick={resetPreferences}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs shadow-sm cursor-pointer transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
