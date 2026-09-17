"use client";

import React, { useState, useEffect, useRef } from "react";
import { Clock, MessageSquare, FastForward, X, Sparkles } from "lucide-react";

interface DelayReasonModalProps {
  isOpen: boolean;
  minutes: number;
  studentName?: string;
  onClose: () => void;
  onConfirm: (minutes: number, reason?: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

const PRESET_REASONS = [
  "Running slightly late",
  "Technical / audio issue",
  "Finishing previous lesson",
  "Reconnecting to Teams",
  "Brief personal delay",
];

export default function DelayReasonModal({
  isOpen,
  minutes,
  studentName,
  onClose,
  onConfirm,
  isSubmitting = false,
}: DelayReasonModalProps) {
  const [reason, setReason] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
    }
  }, [isOpen, minutes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: string) => {
    if (reason === preset) {
      setReason("");
    } else {
      setReason(preset);
      inputRef.current?.focus();
    }
  };

  const handleDelayWithReason = () => {
    const trimmed = reason.trim();
    onConfirm(minutes, trimmed || undefined);
  };

  const handleDelayWithoutReason = () => {
    onConfirm(minutes, undefined);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim()) {
      handleDelayWithReason();
    } else {
      handleDelayWithoutReason();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delay-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="delay-modal-title"
                  className="text-lg font-bold text-slate-800 dark:text-slate-100"
                >
                  Delay Lesson
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                  +{minutes} mins
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {studentName
                  ? `For student ${studentName}`
                  : "Notify the student lobby"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="delay-reason-input"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between"
            >
              <span>Reason for delay (optional)</span>
              <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                {reason.length}/200
              </span>
            </label>

            <div className="relative">
              <input
                id="delay-reason-input"
                ref={inputRef}
                type="text"
                maxLength={200}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Setting up audio, starting in a moment..."
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#48A5EE] transition-all disabled:opacity-50"
              />
              {reason && !isSubmitting && (
                <button
                  type="button"
                  onClick={() => {
                    setReason("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                  aria-label="Clear reason"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick preset suggestions */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <Sparkles className="w-3 h-3 text-[#48A5EE]" />
              <span>Quick suggestions:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((preset) => {
                const isSelected = reason === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSelectPreset(preset)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#48A5EE]/15 border-[#48A5EE] text-[#48A5EE] font-semibold dark:bg-[#48A5EE]/25"
                        : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80"
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons: Explicit choice for with reason vs no reason */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDelayWithoutReason}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <FastForward className="w-3.5 h-3.5 text-slate-500" />
                <span>Delay without reason</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDelayWithReason}
                className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  reason.trim()
                    ? "bg-[#48A5EE] hover:bg-[#3292dc] text-white shadow-sm shadow-[#48A5EE]/20"
                    : "bg-amber-500 hover:bg-amber-600 text-white"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>
                  {reason.trim() ? "Delay with reason" : "Delay (enter reason)"}
                </span>
              </button>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
