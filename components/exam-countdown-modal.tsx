"use client";

import React, { useEffect } from "react";
import { X, Clock, Sparkles } from "lucide-react";
import ExamCountdownWidget, { getExamYear } from "@/components/exam-countdown-widget";

interface ExamCountdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  onOpenCalculator?: () => void;
  onOpenFormulaSheet?: () => void;
  onOpenResources?: () => void;
}

export default function ExamCountdownModal({
  isOpen,
  onClose,
  studentName,
  onOpenCalculator,
  onOpenFormulaSheet,
  onOpenResources,
}: ExamCountdownModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const examYear = getExamYear();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exam-countdown-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[92vh] bg-slate-50 dark:bg-[#0b1120] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-black shrink-0 shadow-md">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="exam-countdown-modal-title"
                  className="text-base sm:text-lg font-black tracking-tight"
                >
                  Official Maths Exam Countdown
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Summer {examYear}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official GCSE &amp; A-Level Mathematics exam timetables, perpetual countdown clocks, and study milestones.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close exam countdown"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <ExamCountdownWidget
            studentName={studentName}
            onOpenCalculator={() => {
              onClose();
              onOpenCalculator?.();
            }}
            onOpenFormulaSheet={() => {
              onClose();
              onOpenFormulaSheet?.();
            }}
            onOpenResources={() => {
              onClose();
              onOpenResources?.();
            }}
          />
        </div>
      </div>
    </div>
  );
}
