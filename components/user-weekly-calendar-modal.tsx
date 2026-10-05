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
  AlertTriangle,
  Sparkles,
  Trash2,
  Palmtree,
  Ban,
  Copy,
  GripVertical,
  Move,
  Loader2,
  CalendarClock,
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
  const [quickAddUnlockMinutes, setQuickAddUnlockMinutes] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [quickAddError, setQuickAddError] = useState("");
  const [quickAddSuccess, setQuickAddSuccess] = useState("");

  // Tutor Unavailability & Holiday State
  const [unavailabilities, setUnavailabilities] = useState<any[]>([]);
  const [isSetUnavailableOpen, setIsSetUnavailableOpen] = useState(false);
  const [unavailType, setUnavailType] = useState<"BUSY" | "HOLIDAY">("BUSY");
  const [unavailTutorId, setUnavailTutorId] = useState("");
  const [unavailDate, setUnavailDate] = useState("");
  const [unavailStartTime, setUnavailStartTime] = useState("09:00");
  const [unavailEndTime, setUnavailEndTime] = useState("17:00");
  const [holidayStartDate, setHolidayStartDate] = useState("");
  const [holidayEndDate, setHolidayEndDate] = useState("");
  const [unavailReason, setUnavailReason] = useState("");
  const [unavailError, setUnavailError] = useState("");
  const [unavailSuccess, setUnavailSuccess] = useState("");
  const [isSubmittingUnavail, setIsSubmittingUnavail] = useState(false);
  const [unavailRepeatWeeks, setUnavailRepeatWeeks] = useState(0);
  const [isCopyingWeek, setIsCopyingWeek] = useState(false);

  // Selected Unavailability block for viewing / deleting
  const [selectedUnavailability, setSelectedUnavailability] = useState<any | null>(null);
  const [isDeletingUnavail, setIsDeletingUnavail] = useState(false);

  // Drag and drop reschedule state
  const [draggedSession, setDraggedSession] = useState<any | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ dateStr: string; hour: number; minute: number } | null>(null);
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const [isReschedulingDrag, setIsReschedulingDrag] = useState(false);
  const [dragToast, setDragToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [clashConfirmation, setClashConfirmation] = useState<{
    session: any;
    newStart: Date;
    newEnd: Date;
    conflictReason: string;
  } | null>(null);
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, { scheduledStartTime: string; scheduledEndTime: string }>>({});

  // Edit time state for selected session
  const [isEditingSelectedTime, setIsEditingSelectedTime] = useState(false);
  const [editSelectedDate, setEditSelectedDate] = useState("");
  const [editSelectedStartTime, setEditSelectedStartTime] = useState("");
  const [editSelectedEndTime, setEditSelectedEndTime] = useState("");
  const [editSelectedError, setEditSelectedError] = useState("");
  const [isSubmittingEditTime, setIsSubmittingEditTime] = useState(false);

  useEffect(() => {
    if (selectedSession) {
      const sStart = new Date(selectedSession.scheduledStartTime);
      const sEnd = new Date(selectedSession.scheduledEndTime);
      const pad = (n: number) => String(n).padStart(2, "0");
      setEditSelectedDate(`${sStart.getFullYear()}-${pad(sStart.getMonth() + 1)}-${pad(sStart.getDate())}`);
      setEditSelectedStartTime(`${pad(sStart.getHours())}:${pad(Math.floor(sStart.getMinutes() / 5) * 5)}`);
      setEditSelectedEndTime(`${pad(sEnd.getHours())}:${pad(Math.floor(sEnd.getMinutes() / 5) * 5)}`);
      setIsEditingSelectedTime(false);
      setEditSelectedError("");
    }
  }, [selectedSession]);

  // Active-only students and tutors for combo lists
  const activeStudents = useMemo(() => {
    return students.filter((s) => s.active !== false || s.id === targetUser?.id);
  }, [students, targetUser]);

  const activeTutors = useMemo(() => {
    return tutors.filter((t) => t.active !== false || t.id === targetUser?.id);
  }, [tutors, targetUser]);

  // Determine if active calendar target is a student
  const isStudent = useMemo(() => {
    if (!targetUser) return false;
    return (
      targetUser.role === "TUTEE" ||
      (targetUser.role !== "TUTOR" && targetUser.role !== "HEAD_TUTOR")
    );
  }, [targetUser]);

  // Fetch tutor unavailabilities & holidays (tutors only - never for students)
  const fetchUnavailabilities = async () => {
    // A student calendar must never show tutor unavailabilities or holidays
    if (isStudent || !targetUser) {
      setUnavailabilities([]);
      return;
    }

    try {
      const url = `/api/tutor/unavailability?tutorId=${targetUser.id}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUnavailabilities(data.unavailabilities || []);
      }
    } catch (err) {
      console.error("Failed to load unavailabilities:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUnavailabilities();
    }
  }, [isOpen, targetUser, isStudent]);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedSession) {
          setSelectedSession(null);
        } else if (selectedUnavailability) {
          setSelectedUnavailability(null);
        } else if (isQuickAddOpen) {
          setIsQuickAddOpen(false);
        } else if (isSetUnavailableOpen) {
          setIsSetUnavailableOpen(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedSession, selectedUnavailability, isQuickAddOpen, isSetUnavailableOpen, onClose]);

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

  // Human-readable week offset label (e.g. "This Week", "Next Week", "+2 Weeks Ahead")
  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return "This Week";
    if (weekOffset === 1) return "Next Week";
    if (weekOffset === -1) return "Last Week";
    if (weekOffset > 1) return `+${weekOffset} Wks`;
    return `${weekOffset} Wks`;
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

  // Filter lessons for the active target user on this active week (with optimistic overrides for smooth drag & drop)
  const userSessions = useMemo(() => {
    if (!targetUser) return [];
    const startMs = monday.getTime();
    const endMs = new Date(sunday).setHours(23, 59, 59, 999);

    return allSessions
      .map((s) => {
        if (optimisticOverrides[s.id]) {
          return {
            ...s,
            ...optimisticOverrides[s.id],
          };
        }
        return s;
      })
      .filter((s) => {
        const sStart = new Date(s.scheduledStartTime).getTime();
        if (sStart < startMs || sStart > endMs) return false;
        if (isStudent) {
          return s.tuteeId === targetUser.id || s.tutee?.id === targetUser.id;
        } else {
          return s.tutorId === targetUser.id || s.tutor?.id === targetUser.id;
        }
      });
  }, [targetUser, allSessions, monday, sunday, isStudent, optimisticOverrides]);

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

  // Handle clicking on an empty 30-minute slot
  const handleSlotClick = (dayDate: Date, hour: number, minute: number = 0) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${dayDate.getFullYear()}-${pad(dayDate.getMonth() + 1)}-${pad(dayDate.getDate())}`;
    const safeMin = Math.floor(minute / 5) * 5;
    const startStr = `${pad(hour)}:${pad(safeMin)}`;
    const endStr = addMinutesToTime(startStr, 60);

    if (!isAdmin) {
      if (isStudent) {
        // Regular tutors cannot set unavailability on a student's timetable or schedule lessons directly
        return;
      }
      // Tutor clicking directly on their own calendar -> immediately open Set Unavailability for this slot
      const tutorId = targetUser?.id || currentUserId || (activeTutors[0]?.id ?? "");
      openSetUnavailableModal({
        date: dateStr,
        startTime: startStr,
        endTime: endStr,
        tutorId,
      });
      return;
    }

    // Admin clicking on calendar: prefill Quick Add lesson modal
    setQuickAddDate(dateStr);
    setQuickAddStartTime(startStr);
    setQuickAddEndTime(endStr);
    setQuickAddNotes("");
    setQuickAddTeamsUrl("");
    setQuickAddUnlockMinutes(5);
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

  // Helper to show floating drag toast notification
  const showDragToast = (type: "success" | "error", message: string) => {
    setDragToast({ type, message });
    setTimeout(() => {
      setDragToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Drag & drop lesson rescheduling handlers (Head Tutor / Admin only)
  const handleDragStart = (e: React.DragEvent, session: any) => {
    if (!isAdmin || session.status === "COMPLETED" || session.status === "CANCELLED") {
      e.preventDefault();
      return;
    }
    setDraggedSession(session);
    setIsDraggingActive(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", session.id);
  };

  const handleDragEnd = () => {
    setDraggedSession(null);
    setDragOverTarget(null);
    // Keep isDraggingActive true briefly so that onClick doesn't immediately open the details modal
    setTimeout(() => {
      setIsDraggingActive(false);
    }, 120);
  };

  const handleDragOverSlot = (e: React.DragEvent, dateStr: string, hour: number, minute: number) => {
    if (!draggedSession || !isAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (
      !dragOverTarget ||
      dragOverTarget.dateStr !== dateStr ||
      dragOverTarget.hour !== hour ||
      dragOverTarget.minute !== minute
    ) {
      setDragOverTarget({ dateStr, hour, minute });
    }
  };

  const executeReschedule = async (
    session: any,
    newStart: Date,
    newEnd: Date,
    allowOverlap: boolean = false
  ) => {
    setIsReschedulingDrag(true);

    // Apply optimistic override for instant feedback
    setOptimisticOverrides((prev) => ({
      ...prev,
      [session.id]: {
        scheduledStartTime: newStart.toISOString(),
        scheduledEndTime: newEnd.toISOString(),
      },
    }));

    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledStartTime: newStart.toISOString(),
          scheduledEndTime: newEnd.toISOString(),
          allowOverlap,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Revert optimistic override
        setOptimisticOverrides((prev) => {
          const next = { ...prev };
          delete next[session.id];
          return next;
        });

        if (res.status === 409 && data.conflict) {
          // Schedule clash / blackout conflict -> prompt for confirmation
          setClashConfirmation({
            session,
            newStart,
            newEnd,
            conflictReason: data.error || "A scheduling conflict or tutor unavailability was detected.",
          });
          return;
        } else {
          showDragToast("error", data.error || "Failed to reschedule lesson");
          return;
        }
      }

      showDragToast(
        "success",
        `Lesson moved to ${newStart.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} at ${newStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      );

      // Trigger calendar/dashboard reload
      if (onSessionCreated) {
        onSessionCreated();
      }
    } catch (err: any) {
      // Revert optimistic override
      setOptimisticOverrides((prev) => {
        const next = { ...prev };
        delete next[session.id];
        return next;
      });
      showDragToast("error", err?.message || "Failed to reschedule lesson due to network error");
    } finally {
      setIsReschedulingDrag(false);
    }
  };

  const handleDropOnSlot = async (e: React.DragEvent, dayDate: Date, hour: number, minute: number) => {
    e.preventDefault();
    if (!draggedSession || !isAdmin) return;

    const currentSession = draggedSession;
    setDraggedSession(null);
    setDragOverTarget(null);

    // Compute original duration in ms
    const origStart = new Date(currentSession.scheduledStartTime).getTime();
    const origEnd = new Date(currentSession.scheduledEndTime).getTime();
    const durationMs = Math.max(30 * 60 * 1000, origEnd - origStart);

    // Construct new start Date
    const targetDate = new Date(dayDate);
    targetDate.setHours(hour, minute, 0, 0);

    const newStart = targetDate;
    const newEnd = new Date(targetDate.getTime() + durationMs);

    // If dropped onto the exact same time, do nothing
    if (newStart.getTime() === origStart) {
      return;
    }

    await executeReschedule(currentSession, newStart, newEnd, false);
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
          unlockEarlyMinutes: quickAddUnlockMinutes,
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

  // Save edited time from selected session modal
  const handleSaveSelectedTime = async () => {
    if (!editSelectedDate || !editSelectedStartTime || !editSelectedEndTime || !selectedSession) return;
    setEditSelectedError("");

    const [startH, startM] = editSelectedStartTime.split(":").map(Number);
    const [endH, endM] = editSelectedEndTime.split(":").map(Number);
    const [year, month, day] = editSelectedDate.split("-").map(Number);

    const newStart = new Date(year, month - 1, day, startH, startM, 0, 0);
    const newEnd = new Date(year, month - 1, day, endH, endM, 0, 0);

    if (newEnd.getTime() <= newStart.getTime()) {
      setEditSelectedError("End time must be after start time.");
      return;
    }

    setIsSubmittingEditTime(true);
    try {
      const res = await fetch(`/api/sessions/${selectedSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledStartTime: newStart.toISOString(),
          scheduledEndTime: newEnd.toISOString(),
          allowOverlap: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.conflict) {
          setClashConfirmation({
            session: selectedSession,
            newStart,
            newEnd,
            conflictReason: data.error || "A scheduling conflict or tutor unavailability was detected.",
          });
          setIsEditingSelectedTime(false);
          return;
        }
        setEditSelectedError(data.error || "Failed to update lesson time.");
        return;
      }

      setOptimisticOverrides((prev) => ({
        ...prev,
        [selectedSession.id]: {
          scheduledStartTime: newStart.toISOString(),
          scheduledEndTime: newEnd.toISOString(),
        },
      }));

      setSelectedSession((prev: any) => ({
        ...prev,
        scheduledStartTime: newStart.toISOString(),
        scheduledEndTime: newEnd.toISOString(),
      }));

      setIsEditingSelectedTime(false);
      showDragToast(
        "success",
        `Lesson time updated to ${newStart.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} at ${newStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      );

      if (onSessionCreated) {
        onSessionCreated();
      }
    } catch (err: any) {
      setEditSelectedError(err?.message || "Failed to reschedule lesson.");
    } finally {
      setIsSubmittingEditTime(false);
    }
  };

  // Open the Set Unavailable / Book Holiday form
  const openSetUnavailableModal = (initial?: {
    date?: string;
    startTime?: string;
    endTime?: string;
    tutorId?: string;
  }) => {
    const todayStr = initial?.date || new Date().toISOString().split("T")[0];
    setUnavailDate(todayStr);
    setHolidayStartDate(todayStr);
    setHolidayEndDate(todayStr);
    setUnavailStartTime(initial?.startTime || "09:00");
    setUnavailEndTime(initial?.endTime || "10:00");
    setUnavailReason("");
    setUnavailError("");
    setUnavailSuccess("");
    setUnavailType("BUSY");
    setUnavailRepeatWeeks(0);

    const defaultTutorId =
      initial?.tutorId ||
      (!isStudent
        ? targetUser?.id
        : targetUser?.assignedTutorId || currentUserId || (activeTutors[0]?.id ?? ""));

    setUnavailTutorId(defaultTutorId || (isAdmin ? "ALL" : ""));
    setIsSetUnavailableOpen(true);
  };

  // Submit new Unavailability / Holiday
  const handleCreateUnavailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnavailError("");
    setUnavailSuccess("");

    let startIso = "";
    let endIso = "";

    if (unavailType === "BUSY") {
      if (!unavailDate || !unavailStartTime || !unavailEndTime) {
        setUnavailError("Please specify date, start time, and end time.");
        return;
      }
      if (unavailStartTime >= unavailEndTime) {
        setUnavailError("End time must be after start time.");
        return;
      }
      startIso = new Date(`${unavailDate}T${unavailStartTime}:00`).toISOString();
      endIso = new Date(`${unavailDate}T${unavailEndTime}:00`).toISOString();
    } else {
      if (!holidayStartDate || !holidayEndDate) {
        setUnavailError("Please select both start and end dates for the holiday.");
        return;
      }
      if (holidayStartDate > holidayEndDate) {
        setUnavailError("Holiday end date must be on or after start date.");
        return;
      }
      startIso = new Date(`${holidayStartDate}T00:00:00`).toISOString();
      endIso = new Date(`${holidayEndDate}T23:59:59.999`).toISOString();
    }

    setIsSubmittingUnavail(true);
    try {
      const res = await fetch("/api/tutor/unavailability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: unavailTutorId,
          startTime: startIso,
          endTime: endIso,
          type: unavailType,
          reason: unavailReason.trim() || undefined,
          repeatWeeks: unavailType === "BUSY" && unavailRepeatWeeks > 0 ? unavailRepeatWeeks : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUnavailError(data.error || "Failed to set unavailability.");
        return;
      }

      setUnavailSuccess(
        data.message ||
          (unavailType === "HOLIDAY"
            ? "Holiday booked successfully!"
            : "Unavailability block saved!")
      );
      await fetchUnavailabilities();
      setTimeout(() => {
        setIsSetUnavailableOpen(false);
        setUnavailSuccess("");
      }, 1000);
    } catch {
      setUnavailError("Network error. Please try again.");
    } finally {
      setIsSubmittingUnavail(false);
    }
  };

  // Delete an Unavailability or Holiday block
  const handleDeleteUnavailability = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this unavailability / holiday block?"
      )
    ) {
      return;
    }
    setIsDeletingUnavail(true);
    try {
      const res = await fetch(`/api/tutor/unavailability?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedUnavailability(null);
        await fetchUnavailabilities();
      } else {
        alert(data.error || "Failed to delete unavailability block.");
      }
    } catch {
      alert("Network error deleting unavailability block.");
    } finally {
      setIsDeletingUnavail(false);
    }
  };

  // Copy all hourly blackouts from this active week into the following week
  const handleCopyWeekUnavailability = async () => {
    const isTargetStudent =
      targetUser?.role === "TUTEE" ||
      !!targetUser?.assignedTutorId ||
      (targetUser?.role !== "TUTOR" && targetUser?.role !== "HEAD_TUTOR");
    const targetTutorId = !isTargetStudent ? targetUser?.id : targetUser?.assignedTutorId || currentUserId;

    if (!targetTutorId) return;

    const nextMonday = new Date(monday.getTime() + 7 * 24 * 3600 * 1000);
    const confirmMsg = `Copy all hourly blackout blocks from this week (${monday.toLocaleDateString([], { month: "short", day: "numeric" })}) into next week (${nextMonday.toLocaleDateString([], { month: "short", day: "numeric" })})?`;
    if (!confirm(confirmMsg)) return;

    setIsCopyingWeek(true);
    try {
      const res = await fetch("/api/tutor/unavailability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "copy-week",
          tutorId: targetTutorId,
          sourceMonday: monday.toISOString(),
          targetMonday: nextMonday.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to copy unavailabilities.");
        return;
      }
      alert(data.message || "Copied unavailabilities successfully!");
      fetchUnavailabilities();
    } catch {
      alert("Network error copying unavailabilities.");
    } finally {
      setIsCopyingWeek(false);
    }
  };

  // Copy a single selected blackout block into subsequent weeks
  const handleCopySingleBlackout = async (weeksAhead: number) => {
    if (!selectedUnavailability) return;
    const start = new Date(new Date(selectedUnavailability.startTime).getTime() + weeksAhead * 7 * 24 * 3600 * 1000);
    const end = new Date(new Date(selectedUnavailability.endTime).getTime() + weeksAhead * 7 * 24 * 3600 * 1000);

    try {
      const res = await fetch("/api/tutor/unavailability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: selectedUnavailability.tutorId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          type: "BUSY",
          reason: selectedUnavailability.reason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to copy blackout block.");
        return;
      }
      alert(`Blackout block copied to ${start.toLocaleDateString([], { month: "short", day: "numeric" })}!`);
      fetchUnavailabilities();
    } catch {
      alert("Network error copying blackout block.");
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
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors select-none ${
                  weekOffset === 0
                    ? "bg-[#48A5EE] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold"
                }`}
              >
                {weekLabel}
              </div>
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Jump to Current Week button if navigating other weeks */}
            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                title="Return to current week"
              >
                Current Week
              </button>
            )}

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
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-bold text-[#48A5EE]">
              {userSessions.length} lesson{userSessions.length === 1 ? "" : "s"}{" "}
              {weekOffset === 0
                ? "this week"
                : weekOffset === 1
                ? "next week"
                : weekOffset === -1
                ? "last week"
                : `for this week (${weekLabel})`}
            </span>
            {!isStudent && (isAdmin || targetUser?.role === "TUTOR" || targetUser?.role === "HEAD_TUTOR" || currentUserId) && (
              <>
                <button
                  type="button"
                  onClick={() => openSetUnavailableModal()}
                  className="py-1 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Mark unavailable hours or book multi-day holidays"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>+ Set Unavailable / Holiday</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyWeekUnavailability}
                  disabled={isCopyingWeek}
                  className="py-1 px-2.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer border border-slate-300/80 dark:border-slate-700 disabled:opacity-50"
                  title="Copy all hourly blackout slots from this week to next week"
                >
                  <Copy className="w-3.5 h-3.5 text-[#48A5EE]" />
                  <span>{isCopyingWeek ? "Copying..." : "Copy Week → Next"}</span>
                </button>
              </>
            )}
            {isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#48A5EE] border border-blue-200 dark:border-blue-900 text-[10px] font-bold tracking-wide shadow-2xs">
                <Move className="w-3 h-3 animate-pulse" />
                <span>Drag lessons to reschedule</span>
              </span>
            )}
            {isAdmin ? (
              <span className="hidden sm:inline text-slate-400">
                {isStudent
                  ? "(Click any slot to schedule a lesson for this student)"
                  : "(Click any slot to schedule a lesson or set unavailability for all)"}
              </span>
            ) : !isStudent ? (
              <span className="hidden sm:inline text-slate-400">
                (Click any slot on the calendar to mark your unavailable hours)
              </span>
            ) : null}
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

                    {/* Holiday Badges for this Day (Tutors only) */}
                    {(() => {
                      if (isStudent) return null;
                      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0).getTime();
                      const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime();
                      const holidays = unavailabilities.filter((u) => {
                        if (u.type !== "HOLIDAY") return false;
                        const s = new Date(u.startTime).getTime();
                        const e = new Date(u.endTime).getTime();
                        return s <= dayEnd && e >= dayStart;
                      });
                      if (holidays.length === 0) return null;
                      return (
                        <div className="mt-1 flex flex-col gap-1">
                          {holidays.map((hol) => (
                            <button
                              key={hol.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUnavailability(hol);
                              }}
                              className="px-1.5 py-0.5 rounded-md bg-amber-500/20 dark:bg-amber-500/30 border border-amber-500/50 text-amber-800 dark:text-amber-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-amber-500/40 transition-colors shadow-2xs truncate w-full"
                              title={`🌴 Holiday: ${hol.reason || "Out of Office"} (${new Date(hol.startTime).toLocaleDateString([], { month: "short", day: "numeric" })} - ${new Date(hol.endTime).toLocaleDateString([], { month: "short", day: "numeric" })}). Click to view/manage.`}
                            >
                              <Palmtree className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="truncate">{hol.reason || "Holiday"}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
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

                const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0).getTime();
                const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999).getTime();

                // Check if this day is marked as a Holiday (tutors only)
                const isDayHoliday = !isStudent && unavailabilities.some((u) => {
                  if (u.type !== "HOLIDAY") return false;
                  const s = new Date(u.startTime).getTime();
                  const e = new Date(u.endTime).getTime();
                  return s <= dayEnd && e >= dayStart;
                });

                // Find busy hourly blackout blocks for this specific day (tutors only)
                const dayBusySlots = isStudent
                  ? []
                  : unavailabilities.filter((u) => {
                      if (u.type === "HOLIDAY") return false;
                      const s = new Date(u.startTime);
                      return s.toDateString() === dayDate.toDateString();
                    });

                // Find sessions for this specific day
                const daySessions = userSessions.filter((s) => {
                  const sDate = new Date(s.scheduledStartTime);
                  return sDate.toDateString() === dayDate.toDateString();
                });

                const pad = (n: number) => String(n).padStart(2, "0");
                const dayDateStr = `${dayDate.getFullYear()}-${pad(dayDate.getMonth() + 1)}-${pad(dayDate.getDate())}`;

                return (
                  <div
                    key={dayIdx}
                    className={`relative border-l border-slate-200 dark:border-slate-800 ${
                      isDayHoliday
                        ? "bg-amber-50/40 dark:bg-amber-950/20"
                        : isToday
                        ? "bg-[#48A5EE]/[0.02]"
                        : ""
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

                    {/* GHOST DROP PREVIEW FOR DRAG & DROP RESCHEDULING */}
                    {draggedSession && dragOverTarget?.dateStr === dayDateStr && (() => {
                      const origStart = new Date(draggedSession.scheduledStartTime).getTime();
                      const origEnd = new Date(draggedSession.scheduledEndTime).getTime();
                      const durationHours = Math.max(0.5, (origEnd - origStart) / (1000 * 60 * 60));
                      const previewStartHour = dragOverTarget.hour + dragOverTarget.minute / 60;
                      const previewTopPx = (previewStartHour - START_HOUR) * HOUR_HEIGHT;
                      const previewHeightPx = Math.max(48, durationHours * HOUR_HEIGHT - 4);

                      return (
                        <div
                          style={{
                            top: `${previewTopPx}px`,
                            height: `${previewHeightPx}px`,
                          }}
                          className="absolute left-1.5 right-1.5 rounded-2xl border-2 border-dashed border-[#48A5EE] bg-[#48A5EE]/20 backdrop-blur-xs z-30 pointer-events-none p-2.5 flex flex-col justify-between shadow-lg shadow-blue-500/10 transition-all duration-75 animate-pulse"
                        >
                          <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-100 font-extrabold text-xs">
                            <Move className="w-3.5 h-3.5 text-[#48A5EE]" />
                            <span className="truncate">Move &ldquo;{draggedSession.title || "Lesson"}&rdquo; here</span>
                          </div>
                          <div className="text-[10px] font-mono text-blue-900 dark:text-blue-200 font-bold bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-md inline-block w-fit">
                            {String(dragOverTarget.hour).padStart(2, "0")}:{String(dragOverTarget.minute).padStart(2, "0")}
                            {" → "}
                            {addMinutesToTime(`${String(dragOverTarget.hour).padStart(2, "0")}:${String(dragOverTarget.minute).padStart(2, "0")}`, Math.round(durationHours * 60))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Background 30-minute slot click targets & drag targets */}
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
                            onClick={() => {
                              if (isDraggingActive) return;
                              handleSlotClick(dayDate, hour, 0);
                            }}
                            onDragOver={(e) => handleDragOverSlot(e, dayDateStr, hour, 0)}
                            onDrop={(e) => handleDropOnSlot(e, dayDate, hour, 0)}
                            className={`border-b border-dashed border-slate-100 dark:border-slate-800/50 transition-colors relative group ${
                              dragOverTarget?.dateStr === dayDateStr && dragOverTarget?.hour === hour && dragOverTarget?.minute === 0
                                ? "bg-blue-100/60 dark:bg-blue-900/40"
                                : isAdmin || !isStudent
                                ? "cursor-pointer hover:bg-[#48A5EE]/5 dark:hover:bg-[#48A5EE]/10"
                                : "cursor-default"
                            }`}
                            title={
                              isAdmin
                                ? isStudent
                                  ? `Click to schedule lesson for this student at ${String(hour).padStart(2, "0")}:00`
                                  : `Click to schedule lesson or set unavailability starting at ${String(hour).padStart(2, "0")}:00`
                                : !isStudent
                                ? `Click to mark unavailable starting at ${String(hour).padStart(2, "0")}:00`
                                : undefined
                            }
                          >
                            {(isAdmin || !isStudent) && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0.5 rounded-lg border border-dashed border-[#48A5EE]/60 flex items-center justify-center text-[10px] font-bold text-[#48A5EE] gap-1 pointer-events-none">
                                {isAdmin ? (
                                  isStudent ? (
                                    <>
                                      <Plus className="w-3 h-3" />
                                      <span>+ Schedule Lesson ({String(hour).padStart(2, "0")}:00)</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3" />
                                      <span>+ Lesson / Unavailable ({String(hour).padStart(2, "0")}:00)</span>
                                    </>
                                  )
                                ) : (
                                  <>
                                    <Ban className="w-3 h-3 text-amber-500" />
                                    <span className="text-amber-600 dark:text-amber-400">+ Mark Unavailable ({String(hour).padStart(2, "0")}:00)</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 30 - 00 min slot */}
                          <div
                            style={{ height: `${HOUR_HEIGHT / 2}px` }}
                            onClick={() => {
                              if (isDraggingActive) return;
                              handleSlotClick(dayDate, hour, 30);
                            }}
                            onDragOver={(e) => handleDragOverSlot(e, dayDateStr, hour, 30)}
                            onDrop={(e) => handleDropOnSlot(e, dayDate, hour, 30)}
                            className={`transition-colors relative group ${
                              dragOverTarget?.dateStr === dayDateStr && dragOverTarget?.hour === hour && dragOverTarget?.minute === 30
                                ? "bg-blue-100/60 dark:bg-blue-900/40"
                                : isAdmin || !isStudent
                                ? "cursor-pointer hover:bg-[#48A5EE]/5 dark:hover:bg-[#48A5EE]/10"
                                : "cursor-default"
                            }`}
                            title={
                              isAdmin
                                ? isStudent
                                  ? `Click to schedule lesson for this student at ${String(hour).padStart(2, "0")}:30`
                                  : `Click to schedule lesson or set unavailability starting at ${String(hour).padStart(2, "0")}:30`
                                : !isStudent
                                ? `Click to mark unavailable starting at ${String(hour).padStart(2, "0")}:30`
                                : undefined
                            }
                          >
                            {(isAdmin || !isStudent) && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0.5 rounded-lg border border-dashed border-[#48A5EE]/60 flex items-center justify-center text-[10px] font-bold text-[#48A5EE] gap-1 pointer-events-none">
                                {isAdmin ? (
                                  isStudent ? (
                                    <>
                                      <Plus className="w-3 h-3" />
                                      <span>+ Schedule Lesson ({String(hour).padStart(2, "0")}:30)</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3" />
                                      <span>+ Lesson / Unavailable ({String(hour).padStart(2, "0")}:30)</span>
                                    </>
                                  )
                                ) : (
                                  <>
                                    <Ban className="w-3 h-3 text-amber-500" />
                                    <span className="text-amber-600 dark:text-amber-400">+ Mark Unavailable ({String(hour).padStart(2, "0")}:30)</span>
                                  </>
                                )}
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

                      const isDraggable = isAdmin && session.status !== "COMPLETED" && session.status !== "CANCELLED";
                      const isBeingDragged = draggedSession?.id === session.id;

                      return (
                        <div
                          key={session.id}
                          draggable={isDraggable}
                          onDragStart={(e) => handleDragStart(e, session)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isDraggingActive) return;
                            setSelectedSession(session);
                          }}
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                          }}
                          className={`absolute left-1 right-1 rounded-2xl p-2.5 shadow-md transition-all z-10 overflow-hidden flex flex-col justify-between ${bgClass} ${
                            isDraggable ? "cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-white/50" : "cursor-pointer"
                          } ${isBeingDragged ? "opacity-30 scale-95 border-2 border-dashed border-white shadow-none" : "hover:scale-[1.01]"}`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-xs flex items-center justify-between gap-1.5 leading-tight">
                              <span className="truncate">
                                {isStudent
                                  ? formatTutorName(session.tutor?.name)
                                  : session.tutee?.name}
                              </span>
                              {isDraggable && (
                                <span className="opacity-60 hover:opacity-100 shrink-0 cursor-grab" title="Drag to reschedule">
                                  <GripVertical className="w-3.5 h-3.5" />
                                </span>
                              )}
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

                    {/* Tutor Hourly Unavailability Blocks */}
                    {dayBusySlots.map((unavail) => {
                      const start = new Date(unavail.startTime);
                      const end = new Date(unavail.endTime);
                      const startHour = start.getHours() + start.getMinutes() / 60;
                      const endHour = end.getHours() + end.getMinutes() / 60;
                      const durationHours = Math.max(0.5, endHour - startHour);

                      const topPx = (startHour - START_HOUR) * HOUR_HEIGHT;
                      const heightPx = Math.max(40, durationHours * HOUR_HEIGHT - 4);

                      return (
                        <div
                          key={unavail.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUnavailability(unavail);
                          }}
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                          }}
                          className="absolute left-1 right-1 rounded-2xl p-2.5 shadow-md cursor-pointer transition-transform hover:scale-[1.01] z-20 overflow-hidden flex flex-col justify-between border-2 border-dashed border-rose-500/70 bg-rose-50/95 dark:bg-rose-950/80 text-rose-800 dark:text-rose-100 backdrop-blur-xs group"
                          title="Tutor Unavailable (Click to view or remove)"
                        >
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-xs flex items-center justify-between gap-1 leading-tight text-rose-700 dark:text-rose-300">
                              <span className="flex items-center gap-1">
                                <Ban className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                <span className="truncate">Unavailable</span>
                              </span>
                              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-200/80 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200">
                                Blackout
                              </span>
                            </div>
                            {unavail.reason && (
                              <div className="text-[11px] font-semibold text-rose-900 dark:text-rose-100 truncate">
                                {unavail.reason}
                              </div>
                            )}
                          </div>

                          <div className="text-[10px] font-mono font-bold text-rose-700 dark:text-rose-300 flex items-center justify-between mt-auto pt-1 border-t border-rose-300/40 dark:border-rose-800/60">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>
                                {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                &ndash;
                                {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </span>
                            <span className="text-[9px] font-semibold underline opacity-75 group-hover:opacity-100">
                              Manage
                            </span>
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
          <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400">
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
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Unavailable
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Holiday
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

            {/* Mode Switcher for Admin: Schedule Lesson vs Set Unavailability */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                className="py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs flex items-center justify-center gap-1.5 cursor-default"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#48A5EE]" />
                <span>Schedule Lesson</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsQuickAddOpen(false);
                  openSetUnavailableModal({
                    date: quickAddDate,
                    startTime: quickAddStartTime,
                    endTime: quickAddEndTime,
                    tutorId: quickAddTutorId || (isAdmin ? "ALL" : ""),
                  });
                }}
                className="py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Switch to set tutor unavailability for this slot"
              >
                <Ban className="w-3.5 h-3.5 text-amber-500" />
                <span>Set Unavailability</span>
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

              {/* Show Teams Link Early Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-600 dark:text-slate-300 font-bold">
                    Show Teams Link Early
                  </label>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {quickAddUnlockMinutes} mins before start
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 15].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setQuickAddUnlockMinutes(mins)}
                      className={`py-1.5 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        quickAddUnlockMinutes === mins
                          ? "bg-[#48A5EE] text-white border-[#48A5EE] shadow-xs shadow-[#48A5EE]/30"
                          : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <span>{mins} mins</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Controls how early the &quot;Join Lesson&quot; button unlocks for the student.
                </p>
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
              {!isEditingSelectedTime ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Scheduled:</span>
                  <div className="flex items-center gap-2">
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
                    {isAdmin && selectedSession.status !== "COMPLETED" && selectedSession.status !== "CANCELLED" && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingSelectedTime(true);
                          setEditSelectedError("");
                        }}
                        className="px-2 py-0.5 rounded-lg bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                        title="Edit exact date and time (5-minute precision)"
                      >
                        <CalendarClock className="w-3 h-3" />
                        <span>Edit Time</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                      <CalendarClock className="w-3.5 h-3.5 text-[#48A5EE]" />
                      <span>Edit Date &amp; Time (5-min precision)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingSelectedTime(false)}
                      className="text-slate-400 hover:text-slate-600 text-[11px] font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {editSelectedError && (
                    <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-[11px] font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{editSelectedError}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold text-[10px] mb-0.5">
                        Date
                      </label>
                      <input
                        type="date"
                        value={editSelectedDate}
                        onChange={(e) => setEditSelectedDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs focus:outline-none focus:border-[#48A5EE]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-semibold text-[10px] mb-0.5">
                          Start Time
                        </label>
                        <TimeSelect
                          value={editSelectedStartTime}
                          onChange={(newStart) => {
                            setEditSelectedStartTime(newStart);
                            const [sH, sM] = editSelectedStartTime.split(":").map(Number);
                            const [eH, eM] = editSelectedEndTime.split(":").map(Number);
                            const dur = Math.max(30, (eH * 60 + eM) - (sH * 60 + sM));
                            setEditSelectedEndTime(addMinutesToTime(newStart, isNaN(dur) ? 60 : dur));
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-semibold text-[10px] mb-0.5">
                          End Time
                        </label>
                        <TimeSelect
                          value={editSelectedEndTime}
                          onChange={(newEnd) => setEditSelectedEndTime(newEnd)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingSelectedTime(false)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSubmittingEditTime}
                        onClick={handleSaveSelectedTime}
                        className="px-3.5 py-1.5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isSubmittingEditTime ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Save New Time</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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

      {/* SELECTED UNAVAILABILITY / HOLIDAY DETAILS MODAL */}
      {selectedUnavailability && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {selectedUnavailability.type === "HOLIDAY" ? (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Palmtree className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Ban className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                    {selectedUnavailability.type === "HOLIDAY"
                      ? "Tutor Holiday Details"
                      : "Unavailability Block"}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tutor: {formatTutorName(selectedUnavailability.tutor?.name)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUnavailability(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Type</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      selectedUnavailability.type === "HOLIDAY"
                        ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                        : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    {selectedUnavailability.type === "HOLIDAY"
                      ? "🌴 Holiday / Away"
                      : "⛔ Hourly Blackout"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Date &amp; Time</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-right">
                    {selectedUnavailability.type === "HOLIDAY" ? (
                      <>
                        {new Date(selectedUnavailability.startTime).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        &ndash;{" "}
                        {new Date(selectedUnavailability.endTime).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </>
                    ) : (
                      <>
                        {new Date(selectedUnavailability.startTime).toLocaleDateString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        &bull;{" "}
                        {new Date(selectedUnavailability.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        &ndash;{" "}
                        {new Date(selectedUnavailability.endTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </>
                    )}
                  </span>
                </div>

                {selectedUnavailability.reason && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 font-medium block mb-1">
                      Reason / Notes
                    </span>
                    <p className="font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
                      {selectedUnavailability.reason}
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Copy to Future Weeks (Hourly Blackout Only) */}
              {selectedUnavailability.type === "BUSY" && (isAdmin || currentUserId === selectedUnavailability.tutorId) && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <Copy className="w-3.5 h-3.5 text-[#48A5EE]" />
                    <span>Copy Blackout to Future Weeks</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopySingleBlackout(1)}
                      className="py-1 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
                    >
                      +1 Week Ahead
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopySingleBlackout(2)}
                      className="py-1 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
                    >
                      +2 Weeks Ahead
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopySingleBlackout(3)}
                      className="py-1 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
                    >
                      +3 Weeks Ahead
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopySingleBlackout(4)}
                      className="py-1 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
                    >
                      +4 Weeks Ahead
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {(isAdmin || currentUserId === selectedUnavailability.tutorId) ? (
                <button
                  type="button"
                  onClick={() => handleDeleteUnavailability(selectedUnavailability.id)}
                  disabled={isDeletingUnavail}
                  className="py-2 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200 dark:border-rose-800 disabled:opacity-50"
                  title="Remove this unavailability or holiday block"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingUnavail ? "Removing..." : "Remove Block"}</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setSelectedUnavailability(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SET UNAVAILABLE / BOOK HOLIDAY MODAL */}
      {isSetUnavailableOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                    Set Availability / Holiday
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Block out your calendar to prevent admin bookings
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSetUnavailableOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Switcher: Hourly Blackout vs Book Holiday */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUnavailType("BUSY")}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  unavailType === "BUSY"
                    ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                <span>Hourly Blackout</span>
              </button>
              <button
                type="button"
                onClick={() => setUnavailType("HOLIDAY")}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  unavailType === "HOLIDAY"
                    ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Palmtree className="w-3.5 h-3.5 text-amber-500" />
                <span>Book Holiday</span>
              </button>
            </div>

            {unavailError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{unavailError}</span>
              </div>
            )}

            {unavailSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{unavailSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUnavailability} className="space-y-3.5 text-xs">
              {/* Tutor Selector */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Tutor
                </label>
                <select
                  disabled={!isAdmin && activeTutors.length <= 1}
                  value={unavailTutorId}
                  onChange={(e) => setUnavailTutorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:border-[#48A5EE] disabled:opacity-80"
                >
                  {isAdmin && (
                    <option value="ALL">⭐ All Tutors (Entire Platform)</option>
                  )}
                  {activeTutors.map((t) => (
                    <option key={t.id} value={t.id}>
                      {formatTutorName(t.name)}
                    </option>
                  ))}
                </select>
                {isAdmin && unavailTutorId === "ALL" && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold flex items-center gap-1">
                    <span>⚡ This unavailability will apply across all active tutors on the platform simultaneously.</span>
                  </p>
                )}
              </div>

              {/* HOURLY BLACKOUT FIELDS */}
              {unavailType === "BUSY" ? (
                <div className="space-y-2">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={unavailDate}
                      onChange={(e) => setUnavailDate(e.target.value)}
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
                        value={unavailStartTime}
                        onChange={(val) => setUnavailStartTime(val)}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                        End Time
                      </label>
                      <TimeSelect
                        value={unavailEndTime}
                        onChange={(val) => setUnavailEndTime(val)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* MULTI-DAY HOLIDAY FIELDS */
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={holidayStartDate}
                      onChange={(e) => setHolidayStartDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs focus:outline-none focus:border-[#48A5EE]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={holidayEndDate}
                      onChange={(e) => setHolidayEndDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs focus:outline-none focus:border-[#48A5EE]"
                    />
                  </div>
                </div>
              )}

              {/* Repeat across weeks (Hourly Blackout Only) */}
              {unavailType === "BUSY" && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                    Repeat across weeks
                  </label>
                  <select
                    value={unavailRepeatWeeks}
                    onChange={(e) => setUnavailRepeatWeeks(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs focus:outline-none focus:border-[#48A5EE]"
                  >
                    <option value={0}>One-off (This week only)</option>
                    <option value={1}>Repeat for Next 1 Week (+7 days)</option>
                    <option value={2}>Repeat for Next 2 Weeks</option>
                    <option value={3}>Repeat for Next 3 Weeks</option>
                    <option value={4}>Repeat for Next 4 Weeks (1 month)</option>
                    <option value={8}>Repeat for Next 8 Weeks (2 months)</option>
                    <option value={12}>Repeat for Next 12 Weeks (Whole term)</option>
                  </select>
                </div>
              )}

              {/* Reason / Notes */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Reason / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder={
                    unavailType === "HOLIDAY"
                      ? "e.g., Summer Vacation, Family holiday"
                      : "e.g., Doctor appointment, University lecture, Errands"
                  }
                  value={unavailReason}
                  onChange={(e) => setUnavailReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium text-xs focus:outline-none focus:border-[#48A5EE]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSetUnavailableOpen(false)}
                  className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUnavail}
                  className={`py-2 px-5 rounded-xl text-white font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    unavailType === "HOLIDAY"
                      ? "bg-amber-600 hover:bg-amber-500"
                      : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {isSubmittingUnavail ? (
                    <span>Saving...</span>
                  ) : unavailType === "HOLIDAY" ? (
                    <>
                      <Palmtree className="w-3.5 h-3.5" />
                      <span>Book Holiday</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>Block Out Time</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLASH CONFIRMATION MODAL */}
      {clashConfirmation && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-3xl p-6 border border-amber-300 dark:border-amber-700 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Schedule Conflict Detected</h4>
                <p className="text-[11px] text-slate-500 font-medium">Head Tutor Overlap Confirmation</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {clashConfirmation.conflictReason}
            </p>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Target Reschedule Slot:</span>
                <span className="font-mono text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  {clashConfirmation.newStart.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </div>
              <div className="font-mono text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                {clashConfirmation.newStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {" – "}
                {clashConfirmation.newEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setClashConfirmation(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const { session, newStart, newEnd } = clashConfirmation;
                  setClashConfirmation(null);
                  executeReschedule(session, newStart, newEnd, true);
                }}
                className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Reschedule Anyway (Allow Overlap)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAG & RESCHEDULE FLOATING TOAST / INDICATOR */}
      {(dragToast || isReschedulingDrag) && (
        <div className="fixed bottom-6 right-6 z-70 animate-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-semibold ${
              isReschedulingDrag
                ? "bg-slate-900 text-white border-slate-700 shadow-slate-900/30"
                : dragToast?.type === "success"
                ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/25"
                : "bg-rose-600 text-white border-rose-500 shadow-rose-500/25"
            }`}
          >
            {isReschedulingDrag ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#48A5EE]" />
                <span>Rescheduling lesson...</span>
              </>
            ) : dragToast?.type === "success" ? (
              <>
                <Check className="w-4 h-4 shrink-0 text-emerald-200" />
                <span>{dragToast.message}</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-200" />
                <span>{dragToast?.message}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
