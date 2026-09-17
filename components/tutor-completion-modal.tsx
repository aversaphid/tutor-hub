"use client";

import React, { useState, useEffect } from "react";
import { Star, CheckCircle2, X, AlertCircle, BookOpen, FileText } from "lucide-react";

interface TutorCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  onCompleted: (updatedSession: any) => void;
}

export default function TutorCompletionModal({
  isOpen,
  onClose,
  session,
  onCompleted,
}: TutorCompletionModalProps) {
  const isEditing = Boolean(session?.feedbackCovered || session?.status === "COMPLETED");

  const [feedbackCovered, setFeedbackCovered] = useState(session?.feedbackCovered || "");
  const [feedbackRating, setFeedbackRating] = useState<number>(session?.feedbackRating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackNotes, setFeedbackNotes] = useState(session?.feedbackNotes || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session) {
      setFeedbackCovered(session.feedbackCovered || "");
      setFeedbackRating(session.feedbackRating || 5);
      setFeedbackNotes(session.feedbackNotes || "");
      setError("");
    }
  }, [session, isOpen]);

  if (!isOpen || !session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!feedbackCovered.trim()) {
      setError("Please describe what was covered in the lesson.");
      return;
    }

    if (feedbackRating < 1 || feedbackRating > 5) {
      setError("Please select a rating between 1 and 5 stars.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackCovered: feedbackCovered.trim(),
          feedbackRating,
          feedbackNotes: feedbackNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit lesson completion report.");
        return;
      }

      onCompleted(data.session);
      onClose();
    } catch {
      setError("Network error submitting report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 relative transition-colors max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              {isEditing ? "Edit Report" : "Lesson Wrap-up"}
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
            {isEditing ? "Edit Lesson Report" : "Mark Lesson as Completed"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Student: <strong className="text-slate-700 dark:text-slate-200">{session.tutee?.name}</strong> &bull;{" "}
            <span>{session.title}</span>
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Topics Covered (Required) */}
          <div className="space-y-1.5">
            <label className="text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#48A5EE]" />
              <span>What did you cover in this lesson? <span className="text-rose-500">*</span></span>
            </label>
            <textarea
              required
              rows={3}
              value={feedbackCovered}
              onChange={(e) => setFeedbackCovered(e.target.value)}
              placeholder="e.g. Quadratic equations, factorisation methods, and GCSE exam practice questions..."
              className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#48A5EE] transition-all resize-none text-xs"
            />
          </div>

          {/* 5-Star Rating (Required) - How lesson went overall */}
          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <label className="text-slate-700 dark:text-slate-200 font-bold block">
              How did the lesson go overall? <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  title={`${star} Star${star > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      (hoverRating || feedbackRating) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300 dark:text-slate-600"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 font-bold text-slate-700 dark:text-slate-300">
                {feedbackRating}/5 Stars
              </span>
            </div>
          </div>

          {/* Extra Notes (Optional) */}
          <div className="space-y-1.5">
            <label className="text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#48A5EE]" />
              <span>Extra notes &amp; homework assigned (Optional)</span>
            </label>
            <textarea
              rows={2}
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              placeholder="e.g. Set textbook p. 42 Q 1-6 for homework. Needs to review negative signs."
              className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#48A5EE] transition-all resize-none text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? "Saving..." : isEditing ? "Save Report" : "Complete & Save Report"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
