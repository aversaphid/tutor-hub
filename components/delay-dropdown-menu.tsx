"use client";

import React, { useState } from "react";
import { Clock, ChevronDown, X, MessageSquare, RotateCcw } from "lucide-react";

interface DelayDropdownMenuProps {
  session: any;
  onApplyDelay: (minutes: number, reason?: string) => Promise<void> | void;
  onOpenReasonModal: (minutes: number, session: any) => void;
  onResetStartTime?: (session: any) => Promise<void> | void;
  isResettingStartTime?: boolean;
  align?: "left" | "right";
  buttonClassName?: string;
}

export default function DelayDropdownMenu({
  session,
  onApplyDelay,
  onOpenReasonModal,
  onResetStartTime,
  isResettingStartTime = false,
  align = "left",
  buttonClassName,
}: DelayDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");

  if (!session) return null;

  const isDelayed = Boolean(
    session.status === "DELAYED" ||
    (typeof session.delayMinutes === "number" && session.delayMinutes > 0)
  );

  const handleQuickPreset = (mins: number) => {
    setIsOpen(false);
    onApplyDelay(mins);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(customMinutes, 10);
    if (!isNaN(mins) && mins >= 1 && mins <= 180) {
      setIsOpen(false);
      onApplyDelay(mins);
    }
  };

  return (
    <div className="relative inline-block text-left">
      {/* Unified Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={
          buttonClassName ||
          `px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
            isDelayed ? "ring-1 ring-amber-400" : ""
          }`
        }
        title={isDelayed ? `Delayed (+${session.delayMinutes}m). Click to change duration or reset.` : "Delay lesson"}
      >
        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>{isDelayed ? `Delayed (+${session.delayMinutes}m)` : "Delay Lesson"}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            className={`absolute z-40 mt-1.5 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xl space-y-3.5 text-xs text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-100 ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">Delay Lesson</h4>
                  <p className="text-[10px] text-slate-400">Notify student of delayed start</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Preset Durations */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Quick Duration
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[5, 10, 15, 20, 30, 45].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleQuickPreset(mins)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center ${
                      session.delayMinutes === mins
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                        : "bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 border-amber-200/80 dark:border-amber-800/80"
                    }`}
                  >
                    +{mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Duration Input */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Custom Duration
              </div>
              <form onSubmit={handleCustomSubmit} className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 pr-9 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                    min
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={!customMinutes || parseInt(customMinutes, 10) < 1}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Apply
                </button>
              </form>
            </div>

            {/* Explanation & Reset Options */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  const mins = parseInt(customMinutes, 10) || session.delayMinutes || 10;
                  onOpenReasonModal(mins, session);
                }}
                className="w-full py-1.5 px-2 rounded-xl text-left font-semibold text-[11px] text-slate-600 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 transition-colors cursor-pointer flex items-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Add explanation / reason...</span>
              </button>

              {Boolean(onResetStartTime) && (
                <button
                  type="button"
                  onClick={() => {
                    if (!isDelayed) return;
                    setIsOpen(false);
                    onResetStartTime?.(session);
                  }}
                  disabled={!isDelayed || isResettingStartTime}
                  className={`w-full py-1.5 px-2 rounded-xl text-left font-semibold text-[11px] transition-colors flex items-center gap-2 ${
                    isDelayed
                      ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      : "text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50 select-none"
                  }`}
                  title={
                    isDelayed
                      ? `Reset start time back to original schedule (removes ${session.delayMinutes}m delay)`
                      : "No delay currently active on this lesson"
                  }
                >
                  <RotateCcw
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isDelayed
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-400 dark:text-slate-600"
                    }`}
                  />
                  <span>Reset start time to original</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
