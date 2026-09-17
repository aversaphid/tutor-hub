"use client";

import React, { useState } from "react";
import { Star, X, Check, AlertCircle, BookOpen, MessageSquare } from "lucide-react";

interface StudentCompletionModalProps {
  session: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedSession: any) => void;
  magicKey?: string | null;
}

export default function StudentCompletionModal({
  session,
  isOpen,
  onClose,
  onSuccess,
  magicKey,
}: StudentCompletionModalProps) {
  const [covered, setCovered] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!covered.trim() || covered.trim().length < 2) {
      setError("Please describe what topics you covered in this lesson.");
      return;
    }

    if (!rating || rating < 1 || rating > 5) {
      setError("Please select a rating out of 5 stars.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/sessions/${session.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackCovered: covered.trim(),
          feedbackRating: rating,
          feedbackNotes: notes.trim() || undefined,
          magicKey: magicKey || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to mark lesson as completed.");
        return;
      }

      onSuccess(data.session);
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const starLabels: Record<number, string> = {
    1: "Needs Improvement (1/5)",
    2: "Fair (2/5)",
    3: "Good (3/5)",
    4: "Very Good (4/5)",
    5: "Excellent (5/5)",
  };

  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5 transition-colors">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#48A5EE]/15 text-[#48A5EE] flex items-center justify-center">
            <Check className="w-6 h-6 text-[#48A5EE]" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
            Mark Lesson as Done
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Great work today! Please take 30 seconds to summarise your session.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. What was covered (Required) */}
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#48A5EE]" />
              <span>What did you cover in this lesson? <span className="text-red-500">*</span></span>
            </label>
            <textarea
              required
              rows={3}
              value={covered}
              onChange={(e) => setCovered(e.target.value)}
              placeholder="e.g. Quadratic equations, factorisation, and past paper 2 questions 1-4..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-[#48A5EE] focus:bg-white dark:focus:bg-slate-900 transition-all resize-none"
            />
          </div>

          {/* 2. Rating out of 5 stars (Required) */}
          <div className="space-y-1.5">
            <label className="text-slate-700 dark:text-slate-300 font-bold block flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>How was your lesson today? <span className="text-red-500">*</span></span>
            </label>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 text-slate-300 hover:scale-115 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        s <= displayRating
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-300 dark:text-slate-600"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                {starLabels[displayRating] || `${displayRating}/5`}
              </span>
            </div>
          </div>

          {/* 3. Optional Additional Notes */}
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#48A5EE]" />
              <span>Additional Notes / Homework Set (Optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Homework set: Chapter 5 exercises due next Tuesday..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-[#48A5EE] focus:bg-white dark:focus:bg-slate-900 transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? "Submitting..." : "Submit & Mark Done"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
