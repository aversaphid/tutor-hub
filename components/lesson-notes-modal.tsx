"use client";

import React, { useState, useEffect } from "react";
import { X, FileText, Check, Loader2, Info, BookOpen, Sparkles, Paperclip } from "lucide-react";
import HomeworkAttachments from "./homework-attachments";

interface LessonNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  onSaved: (newNotes: string, newCovered?: string) => void;
}

export default function LessonNotesModal({
  isOpen,
  onClose,
  session,
  onSaved,
}: LessonNotesModalProps) {
  const [covered, setCovered] = useState(session?.feedbackCovered || "");
  const [notes, setNotes] = useState(session?.feedbackNotes || "");
  const [attachments, setAttachments] = useState<any[]>(session?.attachments || []);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (session && isOpen) {
      let draftNotes = "";
      let draftCovered = "";
      try {
        draftNotes = localStorage.getItem(`tutor_draft_notes_${session.id}`) || "";
        draftCovered = localStorage.getItem(`tutor_draft_covered_${session.id}`) || "";
      } catch {}

      setCovered(session.feedbackCovered || draftCovered || "");
      setNotes(session.feedbackNotes || draftNotes || "");
      setAttachments(session.attachments || []);
      setSaveMessage("");
    }
  }, [session, isOpen]);

  const saveNotesToApi = async (notesToSave: string, coveredToSave: string): Promise<boolean> => {
    if (!session?.id) return false;
    setIsSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackCovered: coveredToSave || null,
          feedbackNotes: notesToSave || null,
        }),
      });
      if (res.ok) {
        try {
          localStorage.setItem(`tutor_draft_notes_${session.id}`, notesToSave);
          localStorage.setItem(`tutor_draft_covered_${session.id}`, coveredToSave);
        } catch {}
        onSaved(notesToSave, coveredToSave);
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
    const trimmedNotes = notes.trim();
    const trimmedCovered = covered.trim();
    const success = await saveNotesToApi(trimmedNotes, trimmedCovered);
    if (success) {
      onClose();
    }
  };

  const handleCloseAndAutoSave = async () => {
    const trimmedNotes = notes.trim();
    const trimmedCovered = covered.trim();
    const originalNotes = (session?.feedbackNotes || "").trim();
    const originalCovered = (session?.feedbackCovered || "").trim();
    if (session?.id && (trimmedNotes !== originalNotes || trimmedCovered !== originalCovered)) {
      await saveNotesToApi(trimmedNotes, trimmedCovered);
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
  }, [isOpen, notes, covered, session]);

  if (!isOpen || !session) return null;

  return (
    <div
      onClick={handleCloseAndAutoSave}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 sm:space-y-5 relative transition-colors max-h-[90vh] overflow-y-auto"
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
              <span>Lesson Notes &amp; Covered Topics</span>
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
            Notes for {session.tutee?.name || "Student"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {session.title} &bull;{" "}
            <span>Jot down topics covered and notes during the lesson. All entries are saved and prefilled into your completion report.</span>
          </p>
        </div>

        {/* 1. What was covered today (partials / progress) - PREFILLS COMPLETION REPORT */}
        <div className="space-y-2 bg-sky-50/50 dark:bg-sky-950/20 p-3.5 rounded-2xl border border-sky-100 dark:border-sky-900/40">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#48A5EE]" />
              <span>What was covered today (partials / progress)</span>
            </label>
            <span className="text-[10px] font-semibold text-[#48A5EE] bg-[#48A5EE]/10 dark:bg-[#48A5EE]/20 px-2 py-0.5 rounded-full border border-[#48A5EE]/20 shrink-0">
              Prefills Completion Report
            </span>
          </div>

          <textarea
            rows={3}
            value={covered}
            onChange={(e) => setCovered(e.target.value)}
            placeholder="e.g. Quadratic equations and factorisation. Worked through questions 1-5, practiced exam paper 2 algebra..."
            className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#48A5EE] transition-all text-xs resize-none"
          />

          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#48A5EE] shrink-0" />
            <span>Enter topics covered as you go. When you complete the lesson, this will automatically appear in your report box.</span>
          </p>
        </div>

        {/* 2. Extra notes & homework assigned - SHOWN TO STUDENT */}
        <div className="space-y-2 bg-purple-50/40 dark:bg-purple-950/20 p-3.5 rounded-2xl border border-purple-100 dark:border-purple-900/40">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Extra notes &amp; homework assigned</span>
            </label>
            <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/70 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 shrink-0">
              Shown to Student
            </span>
          </div>

          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Set textbook p. 42 Q 1-6 for homework. Reviewed negative signs and brackets..."
            className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 transition-all text-xs resize-none"
          />

          <p className="text-[11px] text-purple-700 dark:text-purple-400 flex items-center gap-1.5 font-medium">
            <Info className="w-3.5 h-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
            <span>
              <strong>Student View:</strong> Notes and homework entered here are shown in the student&apos;s lobby and their previous lesson review.
            </span>
          </p>
        </div>

        {/* 3. Homework Worksheets & Attachments (Supabase Storage with 21-day rollover) */}
        <div className="space-y-2 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Homework Worksheets &amp; Attachments</span>
            </label>
            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200/70 dark:border-amber-900/60 shrink-0">
              21-Day Rollover
            </span>
          </div>

          <HomeworkAttachments
            sessionId={session.id}
            attachments={attachments}
            canUpload
            canDelete
            onAttachmentsChange={(newAtts) => {
              setAttachments(newAtts);
              if (session) session.attachments = JSON.stringify(newAtts);
            }}
          />
        </div>

        {/* Save Status & Actions */}
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
            ) : (
              <span className="text-[11px] text-slate-400">Auto-saves on close</span>
            )}
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
              <span>{isSaving ? "Saving..." : "Save Notes & Topics"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
