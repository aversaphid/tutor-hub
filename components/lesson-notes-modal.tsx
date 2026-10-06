"use client";

import React, { useState, useEffect } from "react";
import { X, FileText, Check, Loader2, Info, Sparkles } from "lucide-react";

interface LessonNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  onSaved: (newNotes: string) => void;
}

export default function LessonNotesModal({
  isOpen,
  onClose,
  session,
  onSaved,
}: LessonNotesModalProps) {
  const [notes, setNotes] = useState(session?.feedbackNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (session && isOpen) {
      setNotes(session.feedbackNotes || "");
      setSaveMessage("");
    }
  }, [session, isOpen]);

  const saveNotesToApi = async (notesToSave: string): Promise<boolean> => {
    if (!session?.id) return false;
    setIsSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackNotes: notesToSave }),
      });
      if (res.ok) {
        try {
          localStorage.setItem(`tutor_draft_notes_${session.id}`, notesToSave);
        } catch {}
        onSaved(notesToSave);
        return true;
      } else {
        setSaveMessage("Failed to save");
        return false;
      }
    } catch (err) {
      console.error("Failed to save lesson notes:", err);
      setSaveMessage("Error saving");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndClose = async () => {
    const trimmed = notes.trim();
    const success = await saveNotesToApi(trimmed);
    if (success) {
      onClose();
    }
  };

  const handleCloseAndAutoSave = async () => {
    const trimmed = notes.trim();
    const original = (session?.feedbackNotes || "").trim();
    if (session?.id && trimmed !== original) {
      await saveNotesToApi(trimmed);
    }
    onClose();
  };

  // Keyboard shortcut: Escape to close and auto-save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleCloseAndAutoSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, notes, session]);

  if (!isOpen || !session) return null;

  return (
    <div
      onClick={handleCloseAndAutoSave}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 relative transition-colors max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={handleCloseAndAutoSave}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close (auto-saves)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Lesson Notes &amp; Homework</span>
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
            Notes for {session.tutee?.name || "Student"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {session.title} &bull;{" "}
            <span>Jot down notes during the lesson. These will also appear when you complete the lesson.</span>
          </p>
        </div>

        {/* Content Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span>Extra notes &amp; homework assigned</span>
            </label>
            <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/70 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 shrink-0">
              Shown to Student
            </span>
          </div>

          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Set textbook p. 42 Q 1-6 for homework. Reviewed negative signs and brackets..."
            className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 transition-all text-xs resize-none"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>Automatically saved when you close this popup or click Save Notes.</span>
            {notes.length > 0 && <span>{notes.length} characters</span>}
          </div>

          <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5 font-medium bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-800/60">
            <Info className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Student View:</strong> Notes and homework entered here are shown in the student&apos;s lobby and their previous lesson review.
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs">
            {isSaving ? (
              <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </span>
            ) : saveMessage ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {saveMessage}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCloseAndAutoSave}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs cursor-pointer transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save Notes"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
