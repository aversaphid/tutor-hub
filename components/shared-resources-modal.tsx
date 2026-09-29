"use client";

import React, { useEffect } from "react";
import { X, BookOpen } from "lucide-react";
import SharedResourcesHub from "@/components/shared-resources-hub";

interface SharedResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    name: string;
    role: "HEAD_TUTOR" | "TUTOR" | "TUTEE";
    magicKey?: string | null;
  };
}

export default function SharedResourcesModal({
  isOpen,
  onClose,
  currentUser,
}: SharedResourcesModalProps) {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shared-resources-modal-title"
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
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="shared-resources-modal-title"
                className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2"
              >
                <span>Shared Resources &amp; Revision</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold">
                  Past Papers &amp; Tools
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Browse past papers, topic worksheets, exam specifications, formulas, and revision links shared by your tutors.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close resources library"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <SharedResourcesHub currentUser={currentUser} hideHeaderBanner />
        </div>
      </div>
    </div>
  );
}
