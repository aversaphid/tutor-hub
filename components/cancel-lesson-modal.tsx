"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Calendar, Clock, XCircle } from "lucide-react";
import { formatTutorName } from "@/lib/format";

interface CancelLessonModalProps {
  isOpen: boolean;
  session: any | null;
  onClose: () => void;
  onSuccess: (updatedSession: any) => void;
}

export default function CancelLessonModal({
  isOpen,
  session,
  onClose,
  onSuccess,
}: CancelLessonModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          notes: reason.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to cancel lesson.");
        setIsSubmitting(false);
        return;
      }

      onSuccess(data.session);
      onClose();
      setReason("");
    } catch {
      setError("Network error cancelling lesson. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="cancel-modal-title" className="text-base font-extrabold tracking-tight text-rose-700 dark:text-rose-400">
                Cancel Lesson
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {session.title} &bull; {session.tutee?.name || "Student"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lesson Summary Card */}
        <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
            <Calendar className="w-3.5 h-3.5 text-rose-500" />
            <span>
              {new Date(session.scheduledStartTime).toLocaleDateString([], {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>&bull;</span>
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span>
              {new Date(session.scheduledStartTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              –{" "}
              {new Date(session.scheduledEndTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">
            Tutor: <strong>{formatTutorName(session.tutor?.name)}</strong> &bull; Student:{" "}
            <strong>{session.tutee?.name || "Student"}</strong>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
            This lesson will be moved to the <strong>Cancelled Lessons</strong> tab and can be rescheduled at any time.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Reason for Cancellation (Optional):
              </label>
              <span className="text-[10px] text-[#48A5EE] font-semibold">
                Will be shown to student
              </span>
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Tutor unwell / Student sports clash / Emergency — will reschedule soon!"
              rows={3}
              maxLength={500}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-rose-400 resize-none"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              The student will see this reason immediately on their live dashboard.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
            >
              Keep Lesson
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Cancelling..." : "Confirm Cancellation"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
