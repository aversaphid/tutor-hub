"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  X,
  Users,
  GraduationCap,
  Video,
  Check,
  AlertCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { formatTutorName, TIME_OPTIONS_5MIN, addMinutesToTime } from "@/lib/format";
import TimeSelect from "@/components/time-select";

interface UserWeeklyCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: any; // Student or Tutor user object
  allSessions: any[];
  students: any[];
  tutors: any[];
  currentUserId?: string;
  isAdmin?: boolean;
  onSessionCreated?: () => void;
  onUserSelect?: (user: any) => void;
}

const START_HOUR = 8; // 8:00 AM
const END_HOUR = 24; // 12:00 AM (Midnight)
const HOUR_HEIGHT = 120; // 120px per hour (60px per 30 minutes for ample text room)

export default function UserWeeklyCalendarModal({
  isOpen,
  onClose,
  targetUser,
  allSessions,
  students,
  tutors,
  currentUserId,
  isAdmin = false,
  onSessionCreated,
  onUserSelect,
}: UserWeeklyCalendarModalProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [now, setNow] = useState(() => new Date());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Live timer to update current time indicator every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Quick Add 1-hour Lesson State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState("");
  const [quickAddStartTime, setQuickAddStartTime] = useState("09:00");
  const [quickAddEndTime, setQuickAddEndTime] = useState("10:00");
  const [quickAddStudentId, setQuickAddStudentId] = useState("");
  const [quickAddTutorId, setQuickAddTutorId] = useState("");
  const [quickAddNotes, setQuickAddNotes] = useState("");
  const [quickAddTeamsUrl, setQuickAddTeamsUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [quickAddError, setQuickAddError] = useState("");
  const [quickAddSuccess, setQuickAddSuccess] = useState("");

  // Active-only students and tutors for combo lists
  const activeStudents = useMemo(() => {
    return students.filter((s) => s.active !== false || s.id === targetUser?.id);
  }, [students, targetUser]);

  const activeTutors = useMemo(() => {
    return tutors.filter((t) => t.active !== false || t.id === targetUser?.id);
  }, [tutors, targetUser]);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedSession) {
          setSelectedSession(null);
        } else if (isQuickAddOpen) {
          setIsQuickAddOpen(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedSession, isQuickAddOpen, onClose]);

  // Compute Monday of the active week (Monday–Friday)
  const monday = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    // Monday is 1, Sunday is 0
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMonday + weekOffset * 7);
    mon.setHours(0, 0, 0, 0);
    return mon;
  }, [weekOffset]);

  // 7 days: Monday through Sunday
  const weekDays = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6].map((offset) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + offset);
      return d;
    });
  }, [monday]);

  const sunday = weekDays[6];

  // Hours array from START_HOUR to END_HOUR
  const hours = useMemo(() => {
    const list = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      list.push(h);
    }
    return list;
  }, []);

  // Determine if active calendar target is a student
  const isStudent = useMemo(() => {
    if (!targetUser) return false;
    return (
      targetUser.role === "TUTEE" ||
      !!targetUser.assignedTutorId ||
      (targetUser.role !== "TUTOR" && targetUser.role !== "HEAD_TUTOR")
    );
  }, [targetUser]);

  // Filter lessons for the active target user on this active week
  const userSessions = useMemo(() => {
    if (!targetUser) return [];
    const startMs = monday.getTime();
    const endMs = new Date(sunday).setHours(23, 59, 59, 999);

    return allSessions.filter((s) => {
      const sStart = new Date(s.scheduledStartTime).getTime();
      if (sStart < startMs || sStart > endMs) return false;
      if (isStudent) {
        return s.tuteeId === targetUser.id || s.tutee?.id === targetUser.id;
      } else {
        return s.tutorId === targetUser.id || s.tutor?.id === targetUser.id;
      }
    });
  }, [targetUser, allSessions, monday, sunday, isStudent]);

  // Current time calculations for live indicator
  const currentHourFloat = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const isCurrentTimeInBounds = currentHourFloat >= START_HOUR && currentHourFloat <= END_HOUR;
  const currentTimeTopPx = isCurrentTimeInBounds ? (currentHourFloat - START_HOUR) * HOUR_HEIGHT : null;
  const isViewingCurrentWeek = weekOffset === 0;
  const hasAutoScrolledRef = useRef(false);

  // Reset auto-scroll flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasAutoScrolledRef.current = false;
    }
  }, [isOpen]);

  // Auto-scroll ONLY ONCE when opening the modal on current week
  useEffect(() => {
    if (isOpen && isViewingCurrentWeek && scrollContainerRef.current && currentTimeTopPx !== null && !hasAutoScrolledRef.current) {
      hasAutoScrolledRef.current = true;
      const targetScroll = Math.max(0, currentTimeTopPx - 160);
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = targetScroll;
        }
      });
    }
  }, [isOpen, isViewingCurrentWeek]);

  if (!isOpen || !targetUser) return null;

  // Handle clicking on an empty 30-minute slot to autofill 1-hour lesson (ADMIN ONLY)
  const handleSlotClick = (dayDate: Date, hour: number, minute: number = 0) => {
    if (!isAdmin) return; // Tutors cannot schedule lessons directly
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${dayDate.getFullYear()}-${pad(dayDate.getMonth() + 1)}-${pad(dayDate.getDate())}`;
    const safeMin = Math.floor(minute / 5) * 5;
    const startStr = `${pad(hour)}:${pad(safeMin)}`;
    const endStr = addMinutesToTime(startStr, 60);

    setQuickAddDate(dateStr);
    setQuickAddStartTime(startStr);
    setQuickAddEndTime(endStr);
    setQuickAddNotes("");
    setQuickAddTeamsUrl("");
    setQuickAddError("");
    setQuickAddSuccess("");

    if (isStudent) {
      setQuickAddStudentId(targetUser.id);
      setQuickAddTutorId(targetUser.assignedTutorId || currentUserId || (activeTutors[0]?.id ?? ""));
    } else {
      setQuickAddTutorId(targetUser.id);
      setQuickAddStudentId(activeStudents[0]?.id ?? "");
    }

    setIsQuickAddOpen(true);
  };

  // Submit new 1-hour lesson
  const handleCreateQuickLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickAddError("");

    if (!quickAddDate || !quickAddStartTime || !quickAddEndTime) {
      setQuickAddError("Please specify date, start time, and end time.");
      return;
    }
    if (quickAddStartTime >= quickAddEndTime) {
      setQuickAddError("End time must be after start time.");
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedStudent = students.find((s) => s.id === quickAddStudentId);
      const studentName = selectedStudent?.name || "Student";

      const startIso = new Date(`${quickAddDate}T${quickAddStartTime}:00`).toISOString();
      const endIso = new Date(`${quickAddDate}T${quickAddEndTime}:00`).toISOString();

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${studentName} - Maths Lesson`,
          tutorId: quickAddTutorId,
          tuteeId: quickAddStudentId,
          scheduledStartTime: startIso,
          scheduledEndTime: endIso,
          notes: quickAddNotes || undefined,
          teamsMeetingUrl: quickAddTeamsUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setQuickAddError(data.error || "Failed to schedule lesson.");
        return;
      }

      setQuickAddSuccess("Lesson scheduled successfully!");
      if (onSessionCreated) onSessionCreated();
      setTimeout(() => {
        setIsQuickAddOpen(false);
        setQuickAddSuccess("");
      }, 1000);
    } catch {
      setQuickAddError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete lesson from calendar
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to permanently delete this lesson? This action cannot be undone.")) {
      return;
    }
    setIsDeletingSession(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedSession(null);
        if (onSessionCreated) onSessionCreated();
      } else {
        alert(data.error || "Failed to delete lesson.");
      }
    } catch {
      alert("Network error deleting lesson.");
    } finally {
      setIsDeletingSession(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1e293b] w-full max-w-6xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#48A5EE]/10 flex items-center justify-center text-[#48A5EE] shrink-0">
              {isStudent ? <GraduationCap className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-100">
                  {isStudent ? targetUser.name : formatTutorName(targetUser.name)}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isStudent
                      ? "bg-[#48A5EE]/10 text-[#48A5EE]"
                      : targetUser.role === "HEAD_TUTOR"
                      ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                      : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {isStudent ? "Student" : targetUser.role === "HEAD_TUTOR" ? "Admin / Tutor" : "Tutor"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#48A5EE]" />
                <span>Weekly Timetable &bull; Monday to Sunday</span>
                {isStudent && targetUser.assignedTutor && (
                  <>
                    <span>&bull;</span>
                    <span>Tutor: {formatTutorName(targetUser.assignedTutor.name)}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Quick Switch Dropdown & Week Nav */}
          <div className="flex flex-wrap items-center gap-2">
            {/* User Switcher */}
            {onUserSelect && (
              <select
                aria-label="Switch user timetable"
                value={targetUser.id}
                onChange={(e) => {
                  const id = e.target.value;
                  const found =
                    tutors.find((t) => t.id === id) ||
                    students.find((s) => s.id === id);
                  if (found) onUserSelect(found);
                }}
                className="py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {isAdmin ? (
                  <>
                    <optgroup label="Tutors">
                      {activeTutors.map((u) => (
                        <option key={u.id} value={u.id}>
                          {formatTutorName(u.name)} {u.active === false ? "(Inactive)" : ""}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Students">
                      {activeStudents.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} {u.active === false ? "(Inactive)" : ""}
                        </option>
                      ))}
                    </optgroup>
                  </>
                ) : (
                  <>
                    <optgroup label="My Timetable">
                      {activeTutors.map((u) => (
                        <option key={u.id} value={u.id}>
                          {formatTutorName(u.name)} (You)
                        </option>
                      ))}
                    </optgroup>
                    {activeStudents.length > 0 && (
                      <optgroup label="My Assigned Students">
                        {activeStudents.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                )}
              </select>
            )}

            {/* Week navigation */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                  weekOffset === 0
                    ? "bg-[#48A5EE] text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Calendar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WEEK SUBHEADER WITH LIVE DAY & TIME INDICATOR */}
        <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="font-semibold flex flex-wrap items-center gap-2">
            <span>
              {monday.toLocaleDateString([], { month: "short", day: "numeric" })} &ndash;{" "}
              {sunday.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">&bull;</span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Now:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
              </span>
              <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400">
                {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#48A5EE]">
              {userSessions.length} lesson{userSessions.length === 1 ? "" : "s"} this week
            </span>
            {isAdmin && (
              <span className="hidden sm:inline text-slate-400">
                (Click any 30-min slot to schedule a 1-hour lesson)
              </span>
            )}
          </div>
        </div>

        {/* CALENDAR BODY (SCROLLABLE MORNING TO MIDNIGHT) */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative bg-slate-50/30 dark:bg-slate-900/20">
          <div className="min-w-[920px]">
            {/* STICKY DAY HEADERS */}
            <div className="sticky top-0 z-40 bg-white dark:bg-[#1e293b] border-b border-slate-200 dark:border-slate-800 grid grid-cols-[64px_repeat(7,1fr)] shadow-sm">
              <div className="p-3 text-[11px] font-bold text-slate-400 uppercase text-center flex items-center justify-center">
                Time
              </div>
              {weekDays.map((day, idx) => {
                const isToday =
                  day.toDateString() === now.toDateString();
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={idx}
                    className={`p-2.5 sm:p-3 text-center border-l border-slate-200 dark:border-slate-800 transition-colors ${
                      isToday
                        ? "bg-[#48A5EE]/10 dark:bg-[#48A5EE]/15 border-b-2 border-b-[#48A5EE]"
                        : isWeekend
                        ? "bg-slate-100/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div className="text-xs font-extrabold uppercase tracking-wide flex items-center justify-center gap-1">
                      <span className={isToday ? "text-[#48A5EE] font-black" : ""}>
                        {day.toLocaleDateString([], { weekday: "short" })}
                      </span>
                      {isToday ? (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-[#48A5EE] text-white shadow-xs tracking-wider">
                          TODAY
                        </span>
                      ) : isWeekend ? (
                        <span className="text-[9px] font-semibold px-1 py-0.2 rounded-md bg-slate-200/70 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400">
                          Wknd
                        </span>
                      ) : null}
                    </div>
                    <div
                      className={`text-sm font-black mt-1 inline-block px-2 py-0.5 rounded-full ${
                        isToday ? "bg-[#48A5EE] text-white shadow-sm ring-2 ring-[#48A5EE]/30" : ""
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TIMETABLE GRID (8:00 AM TO 24:00 MIDNIGHT) */}
            <div className="relative grid grid-cols-[64px_repeat(7,1fr)]">
              {/* Left Column: Hour Labels with :00 and :30 marks */}
              <div className="relative">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 relative font-mono select-none"
                  >
                    <div className="text-right pr-2 pt-1.5 font-bold">
                      {hour === 24
                        ? "00:00"
                        : `${String(hour).padStart(2, "0")}:00`}
                    </div>
                    {hour < 24 && (
                      <div
                        style={{ top: `${HOUR_HEIGHT / 2}px` }}
                        className="absolute right-0 pr-2 text-[10px] font-medium text-slate-400/60 dark:text-slate-500/60 -translate-y-1/2"
                      >
                        :{30}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 7 Day Columns */}
              {weekDays.map((dayDate, dayIdx) => {
                const isToday = dayDate.toDateString() === now.toDateString();

                // Find sessions for this specific day
                const daySessions = userSessions.filter((s) => {
                  const sDate = new Date(s.scheduledStartTime);
                  return sDate.toDateString() === dayDate.toDateString();
                });

                return (
                  <div
                    key={dayIdx}
                    className={`relative border-l border-slate-200 dark:border-slate-800 ${
                      isToday ? "bg-[#48A5EE]/[0.02]" : ""
                    }`}
                  >
                    {/* LIVE CURRENT TIME INDICATOR (Shown on today's column) */}
                    {isToday && currentTimeTopPx !== null && (
                      <div
                        style={{ top: `${currentTimeTopPx}px` }}
                        className="absolute left-0 right-0 z-15 pointer-events-none flex items-center -translate-y-1/2"
                      >
                        {/* Glowing Dot on Left border */}
                        <div className="relative -ml-1 flex items-center justify-center">
                          <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 ring-2 ring-white dark:ring-[#1e293b] shadow-xs"></span>
                        </div>

                        {/* Horizontal Red Line */}
                        <div className="flex-1 h-[2px] bg-rose-500 shadow-xs"></div>

                        {/* Time Pill Badge */}
                        <div className="mr-1 px-1.5 py-0.5 rounded-md bg-rose-600 text-white font-mono text-[9px] font-extrabold shadow-sm flex items-center gap-0.5">
                          <span>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    )}
                    {/* Background 30-minute slot click targets */}
                    {hours.map((hour) => {
                      if (hour === 24) return null; // No 24-25 slot
                      return (
                        <div
                          key={hour}
                          style={{ height: `${HOUR_HEIGHT}px` }}
                          className="border-b border-slate-100 dark:border-slate-800/80 flex flex-col"
                        >
                          {/* 00 - 30 min slot */}
                          <div
                            style={{ height: `${HOUR_HEIGHT / 2}px` }}
                            onClick={() => isAdmin && handleSlotClick(dayDate, hour, 0)}
                            className={`border-b border-dashed border-slate-100 dark:border-slate-800/50 transition-colors relative ${
                              isAdmin
                                ? "hover:bg-[#48A5EE]/5 dark:hover:bg-[#48A5EE]/10 cursor-pointer group"
                                : "cursor-default"
                            }`}
                            title={isAdmin ? `Click to schedule 1-hour lesson starting at ${String(hour).padStart(2, "0")}:00` : undefined}
                          >
                            {isAdmin && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0.5 rounded-lg border border-dashed border-[#48A5EE]/60 flex items-center justify-center text-[10px] font-bold text-[#48A5EE] gap-1 pointer-events-none">
                                <Plus className="w-3 h-3" />
                                <span>+ 1h from {String(hour).padStart(2, "0")}:00</span>
                              </div>
                            )}
                          </div>

                          {/* 30 - 00 min slot */}
                          <div
                            style={{ height: `${HOUR_HEIGHT / 2}px` }}
                            onClick={() => isAdmin && handleSlotClick(dayDate, hour, 30)}
                            className={`transition-colors relative ${
                              isAdmin
                                ? "hover:bg-[#48A5EE]/5 dark:hover:bg-[#48A5EE]/10 cursor-pointer group"
                                : "cursor-default"
                            }`}
                            title={isAdmin ? `Click to schedule 1-hour lesson starting at ${String(hour).padStart(2, "0")}:30` : undefined}
                          >
                            {isAdmin && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0.5 rounded-lg border border-dashed border-[#48A5EE]/60 flex items-center justify-center text-[10px] font-bold text-[#48A5EE] gap-1 pointer-events-none">
                                <Plus className="w-3 h-3" />
                                <span>+ 1h from {String(hour).padStart(2, "0")}:30</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Lesson Blocks */}
                    {daySessions.map((session) => {
                      const start = new Date(session.scheduledStartTime);
                      const end = new Date(session.scheduledEndTime);

                      const startHour = start.getHours() + start.getMinutes() / 60;
                      const endHour = end.getHours() + end.getMinutes() / 60;
                      const durationHours = Math.max(0.5, endHour - startHour);

                      // Relative position inside the column
                      const topPx = (startHour - START_HOUR) * HOUR_HEIGHT;
                      const heightPx = Math.max(48, durationHours * HOUR_HEIGHT - 4);

                      // Color based on status
                      let bgClass = "bg-blue-600 text-white hover:bg-blue-500";
                      if (session.status === "IN_PROGRESS") {
                        bgClass = "bg-emerald-600 text-white hover:bg-emerald-500 animate-pulse";
                      } else if (session.status === "COMPLETED") {
                        bgClass = session.tutorPaid
                          ? "bg-slate-700 text-slate-100 hover:bg-slate-600"
                          : "bg-amber-600 text-white hover:bg-amber-500";
                      } else if (session.status === "CANCELLED") {
                        bgClass = "bg-rose-600 text-white line-through opacity-70";
                      }

                      return (
                        <div
                          key={session.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(session);
                          }}
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                          }}
                          className={`absolute left-1 right-1 rounded-2xl p-2.5 shadow-md cursor-pointer transition-transform hover:scale-[1.01] z-10 overflow-hidden flex flex-col justify-between ${bgClass}`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-xs flex items-center gap-1.5 leading-tight">
                              <span className="truncate">
                                {isStudent
                                  ? formatTutorName(session.tutor?.name)
                                  : session.tutee?.name}
                              </span>
                            </div>
                            <div className="text-[11px] opacity-90 font-medium leading-snug line-clamp-2">
                              {session.title || "Maths Lesson"}
                            </div>
                          </div>

                          <div className="text-[10px] font-mono opacity-90 flex items-center justify-between mt-auto pt-1 border-t border-white/15">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>
                                {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                &ndash;
                                {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </span>
                            {session.tutorPaid ? (
                              <span className="font-bold text-emerald-300 text-[9px] uppercase tracking-wider">Paid</span>
                            ) : (
                              session.teamsMeetingUrl && (
                                <span className="p-0.5 rounded bg-white/20">
                                  <Video className="w-3 h-3" />
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs bg-white dark:bg-[#1e293b]">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Scheduled
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Live
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" /> Completed (Unpaid)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" /> Archived
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* QUICK ADD 1-HOUR LESSON MODAL (ADMIN ONLY) */}
      {isQuickAddOpen && isAdmin && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Sparkles className="w-5 h-5 text-[#48A5EE]" />
                <h4 className="font-extrabold text-base">Schedule 1-Hour Lesson</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quickAddError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{quickAddError}</span>
              </div>
            )}

            {quickAddSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{quickAddSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateQuickLesson} className="space-y-3.5 text-xs">
              {/* Student Selector */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Student
                </label>
                <select
                  disabled={isStudent}
                  value={quickAddStudentId}
                  onChange={(e) => setQuickAddStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:border-[#48A5EE] disabled:opacity-80"
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
                  disabled={!isStudent}
                  value={quickAddTutorId}
                  onChange={(e) => setQuickAddTutorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:border-[#48A5EE] disabled:opacity-80"
                >
                  {activeTutors.map((t) => (
                    <option key={t.id} value={t.id}>
                      {formatTutorName(t.name)}
                    </option>
                  ))}
                </select>
              </div>              {/* Date & Start/End Times (strictly 5-minute intervals) */}
              <div className="space-y-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                    Lesson Date
                  </label>
                  <input
                    type="date"
                    value={quickAddDate}
                    onChange={(e) => setQuickAddDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs focus:outline-none focus:border-[#48A5EE]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                      Start Time
                    </label>
                    <TimeSelect
                      value={quickAddStartTime}
                      onChange={(newStart) => {
                        setQuickAddStartTime(newStart);
                        setQuickAddEndTime(addMinutesToTime(newStart, 60));
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                      End Time
                    </label>
                    <TimeSelect
                      value={quickAddEndTime}
                      onChange={(newEnd) => setQuickAddEndTime(newEnd)}
                    />
                  </div>
                </div>
              </div>

              {/* Optional Teams Link */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Teams Meeting URL <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://teams.microsoft.com/l/meetup-join/..."
                  value={quickAddTeamsUrl}
                  onChange={(e) => setQuickAddTeamsUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-[#48A5EE]"
                />
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Lesson Notes <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Topics, homework, or instructions..."
                  value={quickAddNotes}
                  onChange={(e) => setQuickAddNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-[#48A5EE]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Scheduling..." : "Schedule Lesson"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SESSION DETAILS INSPECT MODAL */}
      {selectedSession && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                Lesson Details
              </h4>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Student:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {selectedSession.tutee?.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Tutor:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {formatTutorName(selectedSession.tutor?.name)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Scheduled:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {new Date(selectedSession.scheduledStartTime).toLocaleDateString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  {new Date(selectedSession.scheduledStartTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  &ndash;{" "}
                  {new Date(selectedSession.scheduledEndTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#48A5EE]/10 text-[#48A5EE]">
                  {selectedSession.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Tutor Payout:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {selectedSession.tutorPaid ? (
                    <span className="text-emerald-600 font-bold">Paid / Settled</span>
                  ) : (
                    <span className="text-amber-600 font-bold">Unpaid</span>
                  )}
                </span>
              </div>

              {selectedSession.notes && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-semibold block mb-1">Notes:</span>
                  <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    {selectedSession.notes}
                  </p>
                </div>
              )}

              {selectedSession.teamsMeetingUrl && (
                <div className="pt-2">
                  <a
                    href={selectedSession.teamsMeetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join Microsoft Teams</span>
                  </a>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteSession(selectedSession.id)}
                disabled={isDeletingSession}
                className="py-2 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200 dark:border-rose-800 disabled:opacity-50"
                title="Delete this lesson permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingSession ? "Deleting..." : "Delete Lesson"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
