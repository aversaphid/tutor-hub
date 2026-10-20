"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  BookOpen,
  FileText,
  Search,
  Calendar,
  User,
  Check,
  Copy,
  Edit2,
  Save,
  Loader2,
  Clock,
  Sparkles,
  Info,
  ShieldCheck,
  Paperclip,
} from "lucide-react";
import { formatTutorName } from "@/lib/format";
import HomeworkAttachments from "./homework-attachments";

interface NotesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: { id: string; name: string } | null;
  canEdit?: boolean;
  onNotesUpdated?: (sessionId: string, newNotes: string) => void;
}

export default function NotesHistoryModal({
  isOpen,
  onClose,
  student,
  canEdit = false,
  onNotesUpdated,
}: NotesHistoryModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "HOMEWORK_ONLY">("ALL");

  // Inline editing state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

  // Fetch history whenever modal opens or student changes
  useEffect(() => {
    if (!isOpen || !student?.id) {
      setHistory([]);
      setSearchTerm("");
      setEditingSessionId(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/notes-history?studentId=${student.id}`);
        if (!res.ok) {
          throw new Error("Failed to load notes history.");
        }
        const data = await res.json();
        if (isMounted) {
          setHistory(data.history || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "An error occurred.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [isOpen, student?.id]);

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !editingSessionId) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, editingSessionId, onClose]);

  // Filtered entries
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (filterMode === "HOMEWORK_ONLY" && !item.feedbackNotes?.trim()) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const notes = (item.feedbackNotes || "").toLowerCase();
      const covered = (item.feedbackCovered || "").toLowerCase();
      const topic = (item.studentTopic || "").toLowerCase();
      const tutor = (item.tutor?.name || "").toLowerCase();
      const title = (item.title || "").toLowerCase();
      const adminNotes = (item.notes || "").toLowerCase();
      const adminReminder = (item.adminReminder || "").toLowerCase();

      return (
        notes.includes(q) ||
        covered.includes(q) ||
        topic.includes(q) ||
        tutor.includes(q) ||
        title.includes(q) ||
        adminNotes.includes(q) ||
        adminReminder.includes(q)
      );
    });
  }, [history, filterMode, searchTerm]);

  // Copy homework text
  const handleCopyNotes = async (sessionId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSessionId(sessionId);
      setTimeout(() => {
        setCopiedSessionId(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Start inline editing
  const handleStartEdit = (session: any) => {
    setEditingSessionId(session.id);
    setEditingText(session.feedbackNotes || "");
  };

  // Save edited notes
  const handleSaveEdit = async (sessionId: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackNotes: editingText.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to save changes.");
      }

      setHistory((prev) =>
        prev.map((item) =>
          item.id === sessionId ? { ...item, feedbackNotes: editingText.trim() } : item
        )
      );
      setEditingSessionId(null);
      onNotesUpdated?.(sessionId, editingText.trim());
    } catch (err) {
      console.error("Error saving notes:", err);
      alert("Failed to save notes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 relative transition-colors max-h-[90vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 pr-8 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Notes &amp; Homework History</span>
            </span>
            {student && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {student.name}
              </span>
            )}
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              ({history.length} {history.length === 1 ? "lesson" : "lessons"})
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
            Past Lesson Notes &amp; Homework
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A chronological timeline of all extra notes, feedback, and homework assigned across past lessons.
          </p>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notes, homework, topics, tutors..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500 text-xs transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Chips & Print */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setFilterMode("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === "ALL"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              All Notes
            </button>
            <button
              onClick={() => setFilterMode("HOMEWORK_ONLY")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === "HOMEWORK_ONLY"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Homework Only
            </button>
          </div>
        </div>

        {/* Scrollable Timeline List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 min-h-[220px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              <span className="text-xs">Loading notes history...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs text-center">
              {error}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2.5 text-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {searchTerm
                    ? "No matching notes found"
                    : "No notes or homework recorded yet"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  {searchTerm
                    ? `No notes match "${searchTerm}". Try a different keyword.`
                    : "Notes and homework assigned by tutors during or after lessons will appear here."}
                </p>
              </div>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const startDate = new Date(item.scheduledStartTime);
              const formattedDate = startDate.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const formattedTime = `${startDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })} - ${new Date(item.scheduledEndTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`;

              const isEditingThis = editingSessionId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-3 transition-colors hover:border-purple-200 dark:hover:border-purple-800"
                >
                  {/* Lesson Meta Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                        <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>{formattedDate}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formattedTime}</span>
                      </span>
                      {item.status && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider ${
                            item.status === "COMPLETED"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                              : item.status === "IN_PROGRESS"
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {item.status === "IN_PROGRESS" ? "Live" : item.status.toLowerCase()}
                        </span>
                      )}
                    </div>

                    {/* Tutor info & Action buttons */}
                    <div className="flex items-center gap-2">
                      {item.tutor?.name && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <User className="w-3 h-3 text-purple-600" />
                          <span>Tutor: {formatTutorName(item.tutor.name)}</span>
                        </span>
                      )}

                      {/* Copy Homework Button */}
                      {item.feedbackNotes && (
                        <button
                          type="button"
                          onClick={() => handleCopyNotes(item.id, item.feedbackNotes)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 transition-colors cursor-pointer"
                          title="Copy homework to clipboard"
                        >
                          {copiedSessionId === item.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Edit Button for Tutors/Admins */}
                      {canEdit && !isEditingThis && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="p-1 rounded-lg text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Edit notes for this lesson"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Topics Covered / Student Topic */}
                  {(item.feedbackCovered || item.studentTopic) && (
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {item.studentTopic && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 text-[11px]">
                          <strong>Student Topic:</strong> {item.studentTopic}
                        </span>
                      )}
                      {item.feedbackCovered && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                          <strong>Covered:</strong> {item.feedbackCovered}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Notes & Homework Body */}
                  {isEditingThis ? (
                    <div className="space-y-2 pt-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Edit Notes &amp; Homework Assigned:
                      </label>
                      <textarea
                        rows={4}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        placeholder="e.g. Set textbook p. 42 Q 1-6 for homework..."
                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-purple-500 transition-colors resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingSessionId(null)}
                          disabled={isSaving}
                          className="px-3 py-1 rounded-lg text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          disabled={isSaving}
                          className="px-3.5 py-1 rounded-lg text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3 h-3" />
                              <span>Save Notes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : item.feedbackNotes ? (
                    <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/60 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-purple-600" />
                          <span>Notes &amp; Homework Assigned</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {item.feedbackNotes}
                      </p>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                      No homework or extra notes entered for this session.
                    </div>
                  )}

                  {/* Worksheets & Homework Attachments (Supabase Storage with 21-day rollover) */}
                  {(Boolean(item.attachments && item.attachments !== "[]") || canEdit) && (
                    <div className="p-3 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/50 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                          <Paperclip className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          <span>Worksheets &amp; Attachments</span>
                        </span>
                        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.2 rounded-full border border-amber-200/70 dark:border-amber-900/60">
                          21-Day Rollover
                        </span>
                      </div>
                      <HomeworkAttachments
                        sessionId={item.id}
                        attachments={item.attachments}
                        canUpload={canEdit}
                        canDelete={canEdit}
                        onAttachmentsChange={(newAtts) => {
                          setHistory((prev) =>
                            prev.map((s) =>
                              s.id === item.id
                                ? { ...s, attachments: JSON.stringify(newAtts) }
                                : s
                            )
                          );
                        }}
                        compact
                      />
                    </div>
                  )}

                  {/* Staff-only Admin Notes / Instructions for Tutors */}
                  {Boolean(item.notes || item.adminReminder) && (
                    <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#48A5EE]" />
                        <span>Admin Note for Tutor (Hidden from Student)</span>
                      </div>
                      {item.notes && (
                        <p className="text-xs text-blue-950 dark:text-blue-200 leading-relaxed whitespace-pre-wrap">
                          {item.notes}
                        </p>
                      )}
                      {item.adminReminder && (
                        <div className="text-[11px] text-blue-800/90 dark:text-blue-300/90 flex items-start gap-1 pt-0.5">
                          <span className="font-semibold">Reminder:</span>
                          <span>{item.adminReminder}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Notes and homework are saved in real-time.</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
