"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Calendar,
  Clock,
  Sparkles,
  X,
  CheckCircle2,
  ChevronRight,
  Filter,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { formatTutorName } from "@/lib/format";

interface FindOpenSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: any[];
  tutors: any[];
  preselectedStudentId?: string;
  onSelectSlot: (slot: {
    studentId: string;
    tutorId: string;
    date: string;
    startTime: string;
    endTime: string;
  }) => void;
}

export default function FindOpenSlotModal({
  isOpen,
  onClose,
  students,
  tutors,
  preselectedStudentId,
  onSelectSlot,
}: FindOpenSlotModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedTutorId, setSelectedTutorId] = useState("");
  const [daysAhead, setDaysAhead] = useState<7 | 14>(7);
  const [timeWindow, setTimeWindow] = useState<"ALL" | "AFTERNOON" | "MORNING" | "WEEKEND">("AFTERNOON");
  const [slotDuration, setSlotDuration] = useState<60 | 30 | 90>(60);

  const [isLoading, setIsLoading] = useState(false);
  const [existingSessions, setExistingSessions] = useState<any[]>([]);
  const [unavailabilities, setUnavailabilities] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const activeStudents = useMemo(() => {
    return students.filter((s) => s.active !== false);
  }, [students]);

  const activeTutors = useMemo(() => {
    return tutors.filter((t) => t.active !== false);
  }, [tutors]);

  // Sync initial student and tutor selection when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialStudent =
        activeStudents.find((s) => s.id === preselectedStudentId) || activeStudents[0];
      if (initialStudent) {
        setSelectedStudentId(initialStudent.id);
        const assigned =
          activeTutors.find((t) => t.id === initialStudent.assignedTutorId) || activeTutors[0];
        if (assigned) setSelectedTutorId(assigned.id);
      } else if (activeTutors.length > 0) {
        setSelectedTutorId(activeTutors[0].id);
      }
    }
  }, [isOpen, preselectedStudentId, activeStudents, activeTutors]);

  // When student changes, auto-switch to their assigned tutor if set
  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    const stud = activeStudents.find((s) => s.id === id);
    if (stud?.assignedTutorId) {
      setSelectedTutorId(stud.assignedTutorId);
    }
  };

  // Fetch tutor's and student's booked sessions & unavailabilities
  useEffect(() => {
    if (!isOpen || !selectedTutorId) return;

    const loadData = async () => {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const [sessRes, unavailRes] = await Promise.all([
          fetch(`/api/sessions?tutorId=${selectedTutorId}`),
          fetch(`/api/tutor/unavailability?tutorId=${selectedTutorId}`),
        ]);

        if (sessRes.ok) {
          const sData = await sessRes.json();
          setExistingSessions(sData.sessions || []);
        }
        if (unavailRes.ok) {
          const uData = await unavailRes.json();
          setUnavailabilities(uData.unavailabilities || []);
        }
      } catch (err) {
        console.error("Error finding open slots:", err);
        setErrorMsg("Failed to load schedule data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOpen, selectedTutorId]);

  // Compute available slots
  const openSlotsByDay = useMemo(() => {
    if (!selectedTutorId || !selectedStudentId) return [];

    const results: {
      dateStr: string;
      displayDate: string;
      isToday: boolean;
      slots: { startTime: string; endTime: string }[];
    }[] = [];

    const now = new Date();
    const activeStatuses = ["SCHEDULED", "DELAYED", "IN_PROGRESS"];

    for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
      const d = new Date();
      d.setDate(now.getDate() + dayOffset);
      const isToday = dayOffset === 0;

      const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (timeWindow === "WEEKEND" && !isWeekend) continue;

      const pad = (n: number) => String(n).padStart(2, "0");
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      // Operating hours bounds
      let startHour = 8;
      let endHour = 22;

      if (timeWindow === "AFTERNOON") {
        startHour = 15;
        endHour = 21;
      } else if (timeWindow === "MORNING") {
        startHour = 9;
        endHour = 13;
      }

      const daySlots: { startTime: string; endTime: string }[] = [];

      // Loop through candidate start times in 30-min intervals
      for (let h = startHour; h < endHour; h++) {
        for (const m of [0, 30]) {
          const startMinsTotal = h * 60 + m;
          const endMinsTotal = startMinsTotal + slotDuration;
          if (endMinsTotal > endHour * 60) continue;

          const slotStart = new Date(d);
          slotStart.setHours(h, m, 0, 0);

          // If today, skip times that have already passed
          if (isToday && slotStart.getTime() <= now.getTime() + 15 * 60 * 1000) {
            continue;
          }

          const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);
          const startMs = slotStart.getTime();
          const endMs = slotEnd.getTime();

          // 1. Clash check with Tutor's booked sessions
          const tutorClash = existingSessions.some((s) => {
            if (!activeStatuses.includes(s.status)) return false;
            if (s.tutorId !== selectedTutorId && s.tutor?.id !== selectedTutorId) return false;
            const sStart = new Date(s.scheduledStartTime).getTime();
            const sEnd = new Date(s.scheduledEndTime).getTime();
            return sStart < endMs && sEnd > startMs;
          });
          if (tutorClash) continue;

          // 2. Clash check with Student's booked sessions
          const studentClash = existingSessions.some((s) => {
            if (!activeStatuses.includes(s.status)) return false;
            if (s.tuteeId !== selectedStudentId && s.tutee?.id !== selectedStudentId) return false;
            const sStart = new Date(s.scheduledStartTime).getTime();
            const sEnd = new Date(s.scheduledEndTime).getTime();
            return sStart < endMs && sEnd > startMs;
          });
          if (studentClash) continue;

          // 3. Clash check with Tutor's Unavailability / Holiday blocks
          const unavailClash = unavailabilities.some((u) => {
            if (u.tutorId !== selectedTutorId) return false;
            const uStart = new Date(u.startTime).getTime();
            const uEnd = new Date(u.endTime).getTime();
            return uStart < endMs && uEnd > startMs;
          });
          if (unavailClash) continue;

          const endH = Math.floor(endMinsTotal / 60);
          const endM = endMinsTotal % 60;
          const startFormatted = `${pad(h)}:${pad(m)}`;
          const endFormatted = `${pad(endH)}:${pad(endM)}`;

          daySlots.push({
            startTime: startFormatted,
            endTime: endFormatted,
          });
        }
      }

      if (daySlots.length > 0) {
        results.push({
          dateStr,
          displayDate: d.toLocaleDateString([], {
            weekday: "short",
            day: "numeric",
            month: "short",
          }),
          isToday,
          slots: daySlots,
        });
      }
    }

    return results;
  }, [
    selectedTutorId,
    selectedStudentId,
    daysAhead,
    timeWindow,
    slotDuration,
    existingSessions,
    unavailabilities,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* HEADER */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#48A5EE]/10 text-[#48A5EE] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>Find Open Slot</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  Smart Matcher
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Matches mutual availability against lessons, blackouts &amp; holidays
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FILTERS TOOLBAR */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Student Selector */}
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
              Student
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:border-[#48A5EE]"
            >
              {activeStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tutor Selector */}
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
              Tutor
            </label>
            <select
              value={selectedTutorId}
              onChange={(e) => setSelectedTutorId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:border-[#48A5EE]"
            >
              {activeTutors.map((t) => (
                <option key={t.id} value={t.id}>
                  {formatTutorName(t.name)}
                </option>
              ))}
            </select>
          </div>

          {/* Time Window Preference */}
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
              Time of Day
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTimeWindow("AFTERNOON")}
                className={`py-1.5 rounded-lg text-center font-bold text-[11px] transition-colors cursor-pointer ${
                  timeWindow === "AFTERNOON"
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Afternoon
              </button>
              <button
                type="button"
                onClick={() => setTimeWindow("MORNING")}
                className={`py-1.5 rounded-lg text-center font-bold text-[11px] transition-colors cursor-pointer ${
                  timeWindow === "MORNING"
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Morning
              </button>
              <button
                type="button"
                onClick={() => setTimeWindow("ALL")}
                className={`py-1.5 rounded-lg text-center font-bold text-[11px] transition-colors cursor-pointer ${
                  timeWindow === "ALL"
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All Day
              </button>
            </div>
          </div>

          {/* Search Horizon & Duration */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                Horizon
              </label>
              <select
                value={daysAhead}
                onChange={(e) => setDaysAhead(parseInt(e.target.value, 10) as 7 | 14)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:border-[#48A5EE]"
              >
                <option value={7}>Next 7 Days</option>
                <option value={14}>Next 14 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                Duration
              </label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(parseInt(e.target.value, 10) as 60 | 30 | 90)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:border-[#48A5EE]"
              >
                <option value={60}>1 Hour</option>
                <option value={30}>30 Mins</option>
                <option value={90}>1.5 Hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* RESULTS BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#48A5EE] border-t-transparent rounded-full animate-spin"></div>
              <span>Scanning timetable &amp; unavailability blocks...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : openSlotsByDay.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                No open slots found matching your criteria.
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try switching &quot;Time of Day&quot; to &quot;All Day&quot; or extending the horizon to &quot;Next 14 Days&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Found available slots across{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {openSlotsByDay.length} day{openSlotsByDay.length === 1 ? "" : "s"}
                  </strong>
                </span>
                <span className="text-[11px] text-slate-400">Click any slot to schedule</span>
              </div>

              {openSlotsByDay.map((dayGroup) => (
                <div
                  key={dayGroup.dateStr}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-slate-800 dark:text-slate-100">
                      <Calendar className="w-3.5 h-3.5 text-[#48A5EE]" />
                      <span>{dayGroup.displayDate}</span>
                      {dayGroup.isToday && (
                        <span className="px-1.5 py-0.2 rounded-md bg-[#48A5EE] text-white text-[9px] font-black">
                          TODAY
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {dayGroup.slots.length} available
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {dayGroup.slots.map((slot, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => {
                          onSelectSlot({
                            studentId: selectedStudentId,
                            tutorId: selectedTutorId,
                            date: dayGroup.dateStr,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                          });
                          onClose();
                        }}
                        className="group py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#48A5EE] hover:text-white dark:hover:bg-[#48A5EE] text-slate-700 dark:text-slate-200 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700 hover:border-[#48A5EE] shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Click to schedule lesson for this slot"
                      >
                        <Clock className="w-3 h-3 text-[#48A5EE] group-hover:text-white transition-colors" />
                        <span>
                          {slot.startTime} &ndash; {slot.endTime}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-slate-50/50 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
