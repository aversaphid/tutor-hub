"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Calendar, Clock, AlertCircle, Check, CalendarClock } from "lucide-react";
import { formatTutorName, TIME_OPTIONS_5MIN, addMinutesToTime } from "@/lib/format";
import TimeSelect from "@/components/time-select";

interface RescheduleModalProps {
  isOpen: boolean;
  session: any | null;
  onClose: () => void;
  onSuccess: (updatedSession: any) => void;
  allSessions?: any[];
}

export default function RescheduleModal({
  isOpen,
  session,
  onClose,
  onSuccess,
  allSessions = [],
}: RescheduleModalProps) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [allowOverlap, setAllowOverlap] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session) {
      const start = new Date(session.scheduledStartTime);
      const end = new Date(session.scheduledEndTime);

      // Local date YYYY-MM-DD
      const year = start.getFullYear();
      const month = String(start.getMonth() + 1).padStart(2, "0");
      const day = String(start.getDate()).padStart(2, "0");
      setDate(`${year}-${month}-${day}`);

      // Local time HH:MM (rounded to 5-min interval)
      const startHours = String(start.getHours()).padStart(2, "0");
      const startMinutes = String(Math.floor(start.getMinutes() / 5) * 5).padStart(2, "0");
      setStartTime(`${startHours}:${startMinutes}`);

      const endHours = String(end.getHours()).padStart(2, "0");
      const endMinutes = String(Math.floor(end.getMinutes() / 5) * 5).padStart(2, "0");
      setEndTime(`${endHours}:${endMinutes}`);

      setNotes(session.notes || "");
      setAllowOverlap(false);
      setError("");
    }
  }, [session]);

  // Real-time conflict detection across other active sessions
  const conflictInfo = useMemo(() => {
    if (!allSessions || allSessions.length === 0 || !date || !startTime || !endTime || !session) return null;
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const [year, month, day] = date.split("-").map(Number);
    const newStart = new Date(year, month - 1, day, startH, startM, 0, 0);
    const newEnd = new Date(year, month - 1, day, endH, endM, 0, 0);
    if (newEnd <= newStart) return null;

    const conflict = allSessions.find((s) => {
      if (s.id === session.id || s.status === "CANCELLED") return false;
      const sStart = new Date(s.scheduledStartTime);
      const sEnd = new Date(s.scheduledEndTime);
      const overlaps = sStart < newEnd && sEnd > newStart;
      if (!overlaps) return false;
      return s.tutorId === session.tutorId || s.tuteeId === session.tuteeId;
    });

    if (!conflict) return null;
    const isTutorConflict = conflict.tutorId === session.tutorId;
    const sStartStr = new Date(conflict.scheduledStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const sEndStr = new Date(conflict.scheduledEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return isTutorConflict
      ? `Tutor ${formatTutorName(conflict.tutor?.name || session.tutor?.name)} is already teaching ${conflict.tutee?.name || "a student"} (${sStartStr} – ${sEndStr}).`
      : `Student ${conflict.tutee?.name || session.tutee?.name} already has an active lesson with ${formatTutorName(conflict.tutor?.name)} (${sStartStr} – ${sEndStr}).`;
  }, [allSessions, date, startTime, endTime, session]);

  if (!isOpen || !session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!date || !startTime || !endTime) {
      setError("Please specify date, start time, and end time.");
      return;
    }

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const [year, month, day] = date.split("-").map(Number);
    const newStartDate = new Date(year, month - 1, day, startH, startM, 0, 0);
    const newEndDate = new Date(year, month - 1, day, endH, endM, 0, 0);

    if (newEndDate.getTime() <= newStartDate.getTime()) {
      setError("End time must be after start time.");
      return;
    }

    if (conflictInfo && !allowOverlap) {
      setError("Schedule conflict detected. Please pick another time or check 'Allow overlap anyway'.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledStartTime: newStartDate.toISOString(),
          scheduledEndTime: newEndDate.toISOString(),
          status: "SCHEDULED",
          notes: notes.trim() || null,
          allowOverlap,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reschedule lesson.");
        setIsSubmitting(false);
        return;
      }

      onSuccess(data.session);
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-modal-title"
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
            <div className="w-9 h-9 rounded-2xl bg-[#48A5EE]/10 text-[#48A5EE] flex items-center justify-center font-bold">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 id="reschedule-modal-title" className="text-base font-extrabold tracking-tight">
                Reschedule Lesson
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

        {/* Current Schedule Summary */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Currently booked:</span>
            {session.status === "CANCELLED" ? (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                ● Cancelled
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                ● {session.status}
              </span>
            )}
          </div>
          <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#48A5EE]" />
            <span>
              {new Date(session.scheduledStartTime).toLocaleDateString([], {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>&bull;</span>
            <Clock className="w-3.5 h-3.5 text-[#48A5EE]" />
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
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Tutor: <strong>{formatTutorName(session.tutor?.name)}</strong>
          </div>
        </div>

        {/* Error / Conflict Alert */}
        {error && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Reschedule Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* New Date */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#48A5EE]" />
              <span>New Lesson Date:</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE] cursor-pointer"
            />
          </div>

          {/* Time pickers (strictly 5-minute intervals) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#48A5EE]" />
                <span>Start Time:</span>
              </label>
              <TimeSelect
                value={startTime}
                onChange={(newStart) => {
                  setStartTime(newStart);
                  setEndTime(addMinutesToTime(newStart, 60));
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#48A5EE]" />
                <span>End Time:</span>
              </label>
              <TimeSelect
                value={endTime}
                onChange={(newEnd) => setEndTime(newEnd)}
              />
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Reason for Rescheduling &amp; Notes (Optional):
              </label>
              <span className="text-[10px] text-[#48A5EE] font-semibold">
                Shown to student
              </span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Rescheduled from Monday due to school exam. See you on Wednesday at 5pm!"
              rows={2}
              maxLength={500}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#48A5EE]"
            />
          </div>

          {session.status === "CANCELLED" && (
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
              💡 Confirming this will reactivate the lesson to <strong>Scheduled</strong> at the new date and time.
            </div>
          )}

          {/* Real-time Conflict Alert Box */}
          {conflictInfo && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Schedule Conflict Detected</span>
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                {conflictInfo}
              </p>
              <label className="flex items-center gap-2 pt-1 font-semibold text-[11px] cursor-pointer text-amber-900 dark:text-amber-200 select-none">
                <input
                  type="checkbox"
                  checked={allowOverlap}
                  onChange={(e) => setAllowOverlap(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span>Allow overlap anyway (group session / intentional conflict)</span>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Checking Conflicts..." : "Confirm Reschedule"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
