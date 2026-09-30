"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ChangePasswordModal from "@/components/change-password-modal";
import TutorCompletionModal from "@/components/tutor-completion-modal";
import AddToCalendar from "@/components/add-to-calendar";
import { exportSessionsToCSV } from "@/lib/csv-export";
import { downloadMultiEventICS, CalendarEvent } from "@/lib/calendar";
import FormulaSheetModal from "@/components/formula-sheet-modal";
import CasioCalculatorModal from "@/components/casio-calculator-modal";
import CalendarSubscriptionModal from "@/components/calendar-subscription-modal";
import LessonCountdownBadge from "@/components/lesson-countdown-badge";
import {
  Calendar,
  Users,
  Key,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Play,
  Video,
  Save,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  FileText,
  ShieldCheck,
  RefreshCw,
  Search,
  ArrowUpDown,
  Star,
  DollarSign,
  Archive,
  Filter,
  Edit3,
  Lock,
  Settings,
  Download,
  Calculator,
  CalendarClock,
  XCircle,
  ChevronDown,
  X,
  BookOpen,
  Palmtree,
  FastForward,
  RotateCcw,
  ShieldAlert,
  Unlock,
  Loader2,
  Info,
} from "lucide-react";
import CancelLessonModal from "@/components/cancel-lesson-modal";
import DelayReasonModal from "@/components/delay-reason-modal";
import SharedResourcesHub from "@/components/shared-resources-hub";
import { playSessionStartChime, playDelayAlertChime } from "@/lib/audio-cues";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatTutorName } from "@/lib/format";
import UserWeeklyCalendarModal from "@/components/user-weekly-calendar-modal";
import { resolveActiveSession } from "@/lib/session-utils";

export default function TutorDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"active" | "students" | "lessons" | "resources" | "settings">("active");

  const [assignedStudents, setAssignedStudents] = useState<any[]>([]);
  const [mySessions, setMySessions] = useState<any[]>([]);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");

  // User Weekly Calendar Modal
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarModalUser, setCalendarModalUser] = useState<any>(null);

  const handleOpenCalendar = async (user: any) => {
    setCalendarModalUser(user);
    setIsCalendarModalOpen(true);
    await Promise.all([loadMySessions(), loadAssignedStudents()]);
  };

  // Formula Sheet & Casio Calculator Modals
  const [isFormulaSheetOpen, setIsFormulaSheetOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Cancel Lesson Modal
  const [cancelTargetLesson, setCancelTargetLesson] = useState<any>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Quick Controls
  const [teamsUrlInput, setTeamsUrlInput] = useState("");
  const [isUpdatingTeams, setIsUpdatingTeams] = useState(false);
  const [teamsSuccess, setTeamsSuccess] = useState("");

  // Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Copied Key State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Student PIN Lock Reset State
  const [unlockingStudentId, setUnlockingStudentId] = useState<string | null>(null);
  const [pinResetSuccessMessage, setPinResetSuccessMessage] = useState("");

  // Tutor Completion Modal
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [sessionToComplete, setSessionToComplete] = useState<any>(null);

  // Delay Reason Modal
  const [delayModal, setDelayModal] = useState<{
    isOpen: boolean;
    minutes: number;
    sessionId?: string;
    studentName?: string;
  }>({
    isOpen: false,
    minutes: 5,
  });
  const [isSubmittingDelay, setIsSubmittingDelay] = useState(false);

  // Teams Meeting URL for Next Upcoming Lesson
  const [nextTeamsUrlInput, setNextTeamsUrlInput] = useState("");
  const [isUpdatingNextTeams, setIsUpdatingNextTeams] = useState(false);
  const [nextTeamsSuccess, setNextTeamsSuccess] = useState("");

  // Lesson Search, Filter & Sort
  const [lessonSearchTerm, setLessonSearchTerm] = useState("");
  const [lessonStudentFilter, setLessonStudentFilter] = useState("ALL");
  const [lessonSortBy, setLessonSortBy] = useState<
    "soonest" | "newest" | "oldest" | "student" | "rating"
  >("soonest");
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Count strictly upcoming lessons (unpaid, not completed/cancelled, and end time in future)
  const upcomingLessonsCount = useMemo(() => {
    return mySessions.filter((s) => {
      const endMs = new Date(s.scheduledEndTime).getTime();
      const isDone = s.status === "COMPLETED" || s.status === "CANCELLED";
      return !s.tutorPaid && !isDone && endMs > currentTime;
    }).length;
  }, [mySessions, currentTime]);

  // Uncompleted previous lessons that ended in the past but were never marked completed
  const uncompletedPastLessons = useMemo(() => {
    const now = currentTime;
    return mySessions.filter(
      (s: any) =>
        s.status === "IN_PROGRESS" &&
        new Date(s.scheduledEndTime).getTime() <= now
    );
  }, [mySessions, currentTime]);

  // The next upcoming scheduled or delayed lesson after the active/live lesson
  const nextLesson = useMemo(() => {
    const now = currentTime;
    if (!activeLesson) return null;
    const activeStartMs = new Date(activeLesson.scheduledStartTime).getTime();

    const upcoming = mySessions
      .filter((s: any) => {
        if (s.status === "COMPLETED" || s.status === "CANCELLED") return false;
        if (s.id === activeLesson.id) return false;
        const endMs = new Date(s.scheduledEndTime).getTime();
        const startMs = new Date(s.scheduledStartTime).getTime();
        if (endMs <= now) return false;
        if (startMs < activeStartMs) return false;
        return true;
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.scheduledStartTime).getTime() -
          new Date(b.scheduledStartTime).getTime()
      );

    return upcoming[0] || null;
  }, [mySessions, activeLesson?.id, activeLesson?.scheduledStartTime, currentTime]);

  // Keep nextTeamsUrlInput in sync when nextLesson changes
  useEffect(() => {
    setNextTeamsUrlInput(nextLesson?.teamsMeetingUrl || "");
  }, [nextLesson?.id, nextLesson?.teamsMeetingUrl]);

  // Helper to retrieve extra notes & homework from the previous lesson for a student
  const getPreviousLessonNotes = useCallback(
    (session: any): string | null => {
      if (!session) return null;
      const tuteeId = session.tuteeId || session.tutee?.id;
      if (!tuteeId) return null;

      const currentStart = new Date(session.scheduledStartTime).getTime();

      const pastForStudent = mySessions
        .filter((s: any) => {
          const sTuteeId = s.tuteeId || s.tutee?.id;
          if (sTuteeId !== tuteeId || s.id === session.id) return false;
          if (s.status === "CANCELLED") return false;
          const sStart = new Date(s.scheduledStartTime).getTime();
          return sStart < currentStart && (s.status === "COMPLETED" || Boolean(s.feedbackNotes));
        })
        .sort(
          (a: any, b: any) =>
            new Date(b.scheduledStartTime).getTime() - new Date(a.scheduledStartTime).getTime()
        );

      const previousLesson = pastForStudent[0];
      return previousLesson?.feedbackNotes?.trim() || null;
    },
    [mySessions]
  );

  const activeLessonPrevNotes = useMemo(
    () => getPreviousLessonNotes(activeLesson),
    [activeLesson, getPreviousLessonNotes]
  );

  const nextLessonPrevNotes = useMemo(
    () => getPreviousLessonNotes(nextLesson),
    [nextLesson, getPreviousLessonNotes]
  );

  const [studentSearchTerm, setStudentSearchTerm] = useState("");

  // Collapsible Lesson Sections state (Upcoming expanded by default, others collapsed)
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(true);
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [isCancelledOpen, setIsCancelledOpen] = useState(false);
  const [isArchivedOpen, setIsArchivedOpen] = useState(false);

  // Tutor Settings & Password state
  const [tutorCurrentPassword, setTutorCurrentPassword] = useState("");
  const [tutorNewPassword, setTutorNewPassword] = useState("");
  const [tutorConfirmPassword, setTutorConfirmPassword] = useState("");
  const [tutorPasswordError, setTutorPasswordError] = useState("");
  const [tutorPasswordSuccess, setTutorPasswordSuccess] = useState("");
  const [isSubmittingTutorPassword, setIsSubmittingTutorPassword] = useState(false);
  const [isCalendarSubOpen, setIsCalendarSubOpen] = useState(false);

  useEffect(() => {
    initTutorData();
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    const handleSwitchTab = (e: any) => {
      if (e.detail) setActiveTab(e.detail);
    };
    window.addEventListener("switch-tab", handleSwitchTab);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "settings") {
        setActiveTab("settings");
      } else if (params.get("tab") === "resources") {
        setActiveTab("resources");
      }
    }

    return () => {
      clearInterval(timer);
      window.removeEventListener("switch-tab", handleSwitchTab);
    };
  }, []);

  // In-flight guard to prevent duplicate concurrent session refreshes
  const isLoadingSessionsRef = useRef(false);

  // When an active lesson is upcoming, schedule a single precision timer to sync at exact start time
  useEffect(() => {
    if (!activeLesson || (activeLesson.status !== "SCHEDULED" && activeLesson.status !== "DELAYED")) return;
    const startMs = new Date(activeLesson.scheduledStartTime).getTime();
    const endMs = new Date(activeLesson.scheduledEndTime).getTime();
    const now = Date.now();

    if (now >= endMs) return;

    // Calculate delay until start time with a 500ms grace buffer
    const delay = Math.max(0, startMs - now) + 500;

    const timer = setTimeout(() => {
      loadMySessions();
    }, delay);

    return () => clearTimeout(timer);
  }, [activeLesson?.id, activeLesson?.status, activeLesson?.scheduledStartTime, activeLesson?.scheduledEndTime]);

  // Real-time Server-Sent Events (SSE) listener: instant sync with zero polling overhead
  useEffect(() => {
    if (!currentUser?.id || typeof window === "undefined" || !("EventSource" in window)) return;

    let es: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        es = new EventSource("/api/events");
        es.addEventListener("session-update", () => {
          loadMySessions();
        });
        es.onerror = () => {
          es?.close();
          es = null;
          retryTimeout = setTimeout(connectSSE, 10000);
        };
      } catch {
        // Graceful fallback to background polling
      }
    };

    connectSSE();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (es) es.close();
    };
  }, [currentUser?.id]);

  // Background fallback sync (SSE handles real-time updates instantly; polling is a low-frequency safety net)
  useEffect(() => {
    if (!currentUser?.id) return;

    let pollTimer: NodeJS.Timeout | null = null;

    const scheduleNextPoll = () => {
      if (pollTimer) clearTimeout(pollTimer);
      // Don't poll when tab is hidden
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      // Relaxed interval: 20s when active/soon, 60s when idle
      const now = Date.now();
      const isLiveOrSoon =
        activeLesson &&
        (activeLesson.status === "IN_PROGRESS" ||
          new Date(activeLesson.scheduledStartTime).getTime() - now < 10 * 60 * 1000);

      const delay = isLiveOrSoon ? 20000 : 60000;

      pollTimer = setTimeout(async () => {
        await loadMySessions();
        scheduleNextPoll();
      }, delay);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadMySessions();
        scheduleNextPoll();
      } else if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
    };

    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    scheduleNextPoll();

    return () => {
      if (pollTimer) clearTimeout(pollTimer);
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [currentUser?.id, activeLesson?.status, activeLesson?.scheduledStartTime]);

  const initTutorData = async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }

      const meData = await meRes.json();
      setCurrentUser(meData.user);

      await Promise.all([
        loadAssignedStudents(),
        loadMySessions(),
      ]);
    } catch (err) {
      console.error("Tutor init error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedStudents = async () => {
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setAssignedStudents(data.users || []);
    } catch (err) {
      console.error("Error loading assigned students:", err);
    }
  };

  const loadMySessions = async () => {
    if (isLoadingSessionsRef.current) return;
    isLoadingSessionsRef.current = true;
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) return;
      const data = await res.json();
      const sessions = data.sessions || [];
      setMySessions(sessions);

      // Derive active lesson without issuing a duplicate network call
      const live = resolveActiveSession(sessions, Date.now());
      if (live) {
        setActiveLesson(live);
        setTeamsUrlInput(live.teamsMeetingUrl || "");
      } else {
        setActiveLesson(null);
      }
    } catch (err) {
      console.error("Error loading sessions:", err);
    } finally {
      isLoadingSessionsRef.current = false;
    }
  };

  const loadLiveSession = async () => {
    try {
      const res = await fetch("/api/sessions/live");
      if (!res.ok) return;
      const data = await res.json();
      if (data.session) {
        setActiveLesson(data.session);
        setTeamsUrlInput(data.session.teamsMeetingUrl || "");
      } else {
        const fallbackActive = resolveActiveSession(mySessions, Date.now());
        if (fallbackActive) {
          setActiveLesson(fallbackActive);
          setTeamsUrlInput(fallbackActive.teamsMeetingUrl || "");
        } else {
          setActiveLesson(null);
        }
      }
    } catch (err) {
      console.error("Error loading live session:", err);
    }
  };

  const handleCopyLink = async (key: string, magicKey?: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullUrl = magicKey ? `${origin}/student?key=${magicKey}` : `${origin}/student`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch { }
  };

  const handleCopyPin = async (key: string, pin: string) => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch { }
  };

  const handleUpdateTeamsUrl = async () => {
    if (!activeLesson) return;
    setIsUpdatingTeams(true);
    setTeamsSuccess("");

    try {
      const res = await fetch(`/api/sessions/${activeLesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamsMeetingUrl: teamsUrlInput }),
      });

      const data = await res.json();
      if (res.ok) {
        setTeamsSuccess("Teams meeting link saved and student alerted!");
        setActiveLesson(data.session);
        loadMySessions();
        setTimeout(() => setTeamsSuccess(""), 3500);
      } else {
        alert(data.error || "Failed to update Teams URL");
      }
    } catch {
      alert("Network error updating Teams URL");
    } finally {
      setIsUpdatingTeams(false);
    }
  };

  const handleUpdateNextTeamsUrl = async () => {
    if (!nextLesson) return;
    setIsUpdatingNextTeams(true);
    setNextTeamsSuccess("");

    try {
      const res = await fetch(`/api/sessions/${nextLesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamsMeetingUrl: nextTeamsUrlInput }),
      });

      const data = await res.json();
      if (res.ok) {
        setNextTeamsSuccess("Teams link saved for upcoming lesson!");
        loadMySessions();
        setTimeout(() => setNextTeamsSuccess(""), 3500);
      } else {
        alert(data.error || "Failed to update Teams URL");
      }
    } catch {
      alert("Network error updating Teams URL");
    } finally {
      setIsUpdatingNextTeams(false);
    }
  };

  const handleResetPinLock = async (student: any) => {
    if (!student?.id) return;
    setUnlockingStudentId(student.id);
    try {
      const res = await fetch(`/api/students/${student.id}/reset-pin`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setPinResetSuccessMessage(data.message || `PIN lock reset for ${student.name}`);
        setTimeout(() => setPinResetSuccessMessage(""), 4000);
        // Immediately update state locally
        setAssignedStudents((prev) =>
          prev.map((s) =>
            s.id === student.id
              ? { ...s, pinLockedUntil: null, failedPinAttempts: 0 }
              : s
          )
        );
        setActiveLesson((prev: any) => {
          if (prev?.tutee?.id === student.id) {
            return {
              ...prev,
              tutee: { ...prev.tutee, pinLockedUntil: null, failedPinAttempts: 0 },
            };
          }
          return prev;
        });
        loadAssignedStudents();
      } else {
        alert(data.error || "Failed to reset PIN lock.");
      }
    } catch {
      alert("Network error resetting PIN lock.");
    } finally {
      setUnlockingStudentId(null);
    }
  };

  const handleStartLessonNow = async (targetSession?: any) => {
    const s = targetSession || activeLesson;
    if (!s) return;
    try {
      const res = await fetch(`/api/sessions/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });

      if (res.ok) {
        playSessionStartChime();
        setActionMessage(`Lesson for ${s.tutee?.name || "student"} started! Chime played.`);
        loadLiveSession();
        loadMySessions();
        setTimeout(() => setActionMessage(""), 4000);
      }
    } catch { }
  };

  const handleOpenDelayModal = (mins: number, targetSession?: any) => {
    const s = targetSession || activeLesson;
    if (!s) return;
    setDelayModal({
      isOpen: true,
      minutes: mins,
      sessionId: s.id,
      studentName: s.tutee?.name,
    });
  };

  const handleConfirmDelay = async (mins: number, reason?: string) => {
    const targetId = delayModal.sessionId || activeLesson?.id;
    if (!targetId) return;
    setIsSubmittingDelay(true);
    try {
      const res = await fetch(`/api/sessions/${targetId}/delay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delayMinutes: mins,
          reason: reason?.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delay lesson.");
        return;
      }

      playDelayAlertChime();
      const reasonMsg = reason?.trim() ? ` (${reason.trim()})` : "";
      setActionMessage(`Delayed by ${mins} minutes${reasonMsg}. Student notification updated.`);
      setDelayModal({ isOpen: false, minutes: 5 });
      loadLiveSession();
      loadMySessions();
      setTimeout(() => setActionMessage(""), 4000);
    } catch {
      alert("Network error while delaying lesson.");
    } finally {
      setIsSubmittingDelay(false);
    }
  };

  // Backwards compatible alias
  const handleDelayLesson = (mins: number, targetSession?: any) => handleOpenDelayModal(mins, targetSession);

  const [isResettingStartTime, setIsResettingStartTime] = useState(false);

  const handleResetStartTime = async (targetSession?: any) => {
    const s = targetSession || activeLesson;
    if (!s) return;
    const delayInfo = s.delayMinutes > 0 ? ` (removes ${s.delayMinutes}m delay)` : "";
    if (!confirm(`Reset start time for "${s.title}" back to original schedule${delayInfo}?`)) return;

    setIsResettingStartTime(true);
    try {
      const res = await fetch(`/api/sessions/${s.id}/reset-start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to reset start time.");
        return;
      }
      setActionMessage(data.message || "Start time reset to original schedule.");
      setDelayModal((prev) => ({ ...prev, isOpen: false }));
      loadLiveSession();
      loadMySessions();
      setTimeout(() => setActionMessage(""), 4000);
    } catch {
      alert("Network error while resetting start time.");
    } finally {
      setIsResettingStartTime(false);
    }
  };

  const handleCompleteLesson = async () => {
    if (!activeLesson) return;
    if (!confirm("Are you sure you want to mark this lesson as completed?")) return;

    try {
      const res = await fetch(`/api/sessions/${activeLesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      if (res.ok) {
        setActionMessage("Lesson marked as completed.");
        loadLiveSession();
        loadMySessions();
        setTimeout(() => setActionMessage(""), 4000);
      }
    } catch { }
  };

  // Export tutor's current week schedule to .ics
  const handleExportWeekSchedule = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekSessions = mySessions.filter((s) => {
      const t = new Date(s.scheduledStartTime).getTime();
      return t >= monday.getTime() && t <= sunday.getTime() && s.status !== "CANCELLED";
    });

    if (weekSessions.length === 0) {
      alert(
        `No lessons scheduled for this week (${monday.toLocaleDateString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
        })} - ${sunday.toLocaleDateString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}).`
      );
      return;
    }

    const portalUrl = window.location.origin;
    const events: CalendarEvent[] = weekSessions.map((s) => ({
      id: s.id,
      title: `${s.title} (${s.tutee?.name || "Student"})`,
      description: `LB Maths Tuition Lesson.\nStudent: ${s.tutee?.name || "Student"}\nMeeting: ${s.teamsMeetingUrl || "See portal lobby"}\nNotes: ${s.notes || "None"}`,
      location: s.teamsMeetingUrl || `${portalUrl}/tutor`,
      startTime: s.scheduledStartTime,
      endTime: s.scheduledEndTime,
      tutorName: currentUser?.name,
      studentName: s.tutee?.name,
    }));

    const dateSlug = monday.toISOString().slice(0, 10);
    downloadMultiEventICS(events, `my-tutor-schedule-${dateSlug}.ics`);
    setActionMessage(`Exported ${events.length} lessons for this week to your calendar (.ics).`);
    setTimeout(() => setActionMessage(""), 4000);
  };

  // Cancel Lesson Handler - opens modal for optional cancellation reason
  const handleCancelSession = (session: any) => {
    if (!session) return;
    setCancelTargetLesson(session);
    setIsCancelModalOpen(true);
  };

  const handleChangeTutorPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setTutorPasswordError("");
    setTutorPasswordSuccess("");

    if (!tutorCurrentPassword) {
      setTutorPasswordError("Current password is required.");
      return;
    }
    if (tutorNewPassword.length < 5) {
      setTutorPasswordError("New password must be at least 5 characters.");
      return;
    }
    if (tutorNewPassword !== tutorConfirmPassword) {
      setTutorPasswordError("New passwords do not match.");
      return;
    }

    setIsSubmittingTutorPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: tutorCurrentPassword,
          newPassword: tutorNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTutorPasswordError(data.error || "Failed to change password.");
        return;
      }

      setTutorPasswordSuccess("Password updated successfully!");
      setTutorCurrentPassword("");
      setTutorNewPassword("");
      setTutorConfirmPassword("");
    } catch {
      setTutorPasswordError("Network error. Please try again.");
    } finally {
      setIsSubmittingTutorPassword(false);
    }
  };

  const isLessonLive =
    activeLesson &&
    (activeLesson.status === "IN_PROGRESS" ||
      (currentTime >= new Date(activeLesson.scheduledStartTime).getTime() &&
        currentTime < new Date(activeLesson.scheduledEndTime).getTime() &&
        activeLesson.status !== "COMPLETED" &&
        activeLesson.status !== "CANCELLED"));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b1120] transition-colors duration-200">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Banner */}
        <div data-tour="tutor-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#48A5EE]/10 text-[#48A5EE] dark:bg-[#48A5EE]/20">
                Tutor Workspace
              </span>
              {currentUser?.role === "HEAD_TUTOR" && (
                <Link
                  href="/admin"
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:underline"
                >
                  Switch to Admin Hub →
                </Link>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              Welcome, {formatTutorName(currentUser?.name) || "Tutor"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage your assigned students, launch Teams sessions, and view student PINs &amp; magic links.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700"
              title="Open Casio fx-83GTX Scientific Calculator"
            >
              <Calculator className="w-3.5 h-3.5 text-[#48A5EE]" />
              <span className="hidden sm:inline">fx-83GTX</span>
            </button>
            <button
              onClick={() => setIsFormulaSheetOpen(true)}
              className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700"
              title="Open quick GCSE & A-Level Maths Formula Reference"
            >
              <FileText className="w-3.5 h-3.5 text-[#48A5EE]" />
              <span className="hidden sm:inline">Formula Sheet</span>
            </button>
            <button
              data-tour="tutor-timetable"
              onClick={() => currentUser && handleOpenCalendar(currentUser)}
              className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700"
              title="Open My Weekly Timetable"
            >
              <Calendar className="w-3.5 h-3.5 text-[#48A5EE]" />
              <span className="hidden sm:inline">My Timetable</span>
            </button>
            <button
              onClick={() => {
                loadAssignedStudents();
                loadMySessions();
                loadLiveSession();
              }}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4 text-[#48A5EE]" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Action feedback message */}
        {actionMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === "active"
                ? "bg-[#48A5EE] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Next Meeting &amp; Live Deck</span>
          </button>
          <button
            data-tour="tutor-tab-students"
            onClick={() => setActiveTab("students")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === "students"
                ? "bg-[#48A5EE] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>My Assigned Students ({assignedStudents.length})</span>
          </button>
          <button
            data-tour="tutor-tab-lessons"
            onClick={() => setActiveTab("lessons")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === "lessons"
                ? "bg-[#48A5EE] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            title={`${upcomingLessonsCount} upcoming lessons scheduled`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Upcoming Lessons ({upcomingLessonsCount})</span>
          </button>
          <button
            onClick={() => setActiveTab("resources")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === "resources"
                ? "bg-[#48A5EE] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Shared Resources</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === "settings"
                ? "bg-[#48A5EE] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>

        {/* TAB 1: NEXT MEETING & LIVE CONTROLS */}
        {activeTab === "active" && (
          <div className="space-y-6">
            {/* Alert banner for previous uncompleted lessons */}
            {uncompletedPastLessons.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      Uncompleted Previous Lesson{uncompletedPastLessons.length > 1 ? `s (${uncompletedPastLessons.length})` : ""}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>{uncompletedPastLessons[0].title}</strong> with <strong className="font-semibold">{uncompletedPastLessons[0].tutee?.name}</strong> (scheduled end was {new Date(uncompletedPastLessons[0].scheduledEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}) has not been marked as complete.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setSessionToComplete(uncompletedPastLessons[0]);
                      setIsCompletionModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Lesson &amp; Report</span>
                  </button>
                </div>
              </div>
            )}

            {activeLesson ? (
              <>
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-6 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${isLessonLive
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                            : activeLesson.status === "DELAYED"
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                              : "bg-[#48A5EE]/10 text-[#48A5EE] dark:bg-[#48A5EE]/20"
                          }`}
                      >
                        ● {isLessonLive ? "Live Now" : activeLesson.status === "DELAYED" ? `Delayed (+${activeLesson.delayMinutes}m)` : activeLesson.status}
                      </span>
                      {activeLesson.status === "DELAYED" && activeLesson.delayReason && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold">
                          Reason: {activeLesson.delayReason}
                        </span>
                      )}
                      <LessonCountdownBadge
                        startTime={activeLesson.scheduledStartTime}
                        currentTime={currentTime}
                        status={activeLesson.status}
                        isLive={isLessonLive}
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {new Date(activeLesson.scheduledStartTime).toLocaleDateString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span>&bull;</span>
                        <Clock className="w-3.5 h-3.5 text-[#48A5EE]" />
                        {new Date(activeLesson.scheduledStartTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        –{" "}
                        {new Date(activeLesson.scheduledEndTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                      {activeLesson.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Student: <strong className="text-slate-700 dark:text-slate-200">{activeLesson.tutee?.name}</strong>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {activeLesson.studentTopic && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          <span>Today&apos;s topic: {activeLesson.studentTopic}</span>
                        </div>
                      )}
                      {activeLesson.notes && (
                        <div
                          className="inline-flex items-start sm:items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs font-medium shadow-2xs"
                          title="Manually set admin notes for tutor"
                        >
                          <Info className="w-3.5 h-3.5 text-[#48A5EE] shrink-0 mt-0.5 sm:mt-0" />
                          <span>
                            <strong className="font-semibold text-blue-800 dark:text-blue-300">Admin Notes:</strong> {activeLesson.notes}
                          </span>
                        </div>
                      )}
                      {activeLessonPrevNotes && (
                        <div
                          className="inline-flex items-start sm:items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs font-medium shadow-2xs"
                          title="Extra notes & homework set in the previous lesson"
                        >
                          <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5 sm:mt-0" />
                          <span>
                            <strong className="font-semibold text-purple-800 dark:text-purple-300">Previous extra notes &amp; homework:</strong> {activeLessonPrevNotes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* VISIBLE PIN & MAGIC LINK FOR NEXT MEETING */}
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                    {/* Visible PIN or Locked Warning */}
                    {activeLesson.tutee?.pinLockedUntil && new Date(activeLesson.tutee.pinLockedUntil).getTime() > Date.now() ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold shadow-2xs">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-pulse shrink-0" />
                        <span>PIN Locked ({Math.max(1, Math.ceil((new Date(activeLesson.tutee.pinLockedUntil).getTime() - Date.now()) / 60000))}m)</span>
                        <button
                          onClick={() => handleResetPinLock(activeLesson.tutee)}
                          disabled={unlockingStudentId === activeLesson.tutee?.id}
                          className="ml-1 px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Reset student PIN lock"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>{unlockingStudentId === activeLesson.tutee?.id ? "Unlocking..." : "Unlock"}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <Key className="w-3.5 h-3.5 text-[#48A5EE]" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">PIN:</span>
                        <strong className="text-xs font-mono font-extrabold text-slate-800 dark:text-slate-100">
                          {activeLesson.tutee?.pin || "----"}
                        </strong>
                      </div>
                    )}

                    <button
                      onClick={() =>
                        handleCopyLink(`next-link-${activeLesson.id}`, activeLesson.tutee?.magicKey)
                      }
                      className="px-3 py-1.5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="1-Click Copy Magic Link"
                    >
                      {copiedKey === `next-link-${activeLesson.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Copy Magic Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Teams Meeting URL Setup (~10 minutes before) */}
                <div data-tour="tutor-teams-input" className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                      <Video className="w-4 h-4 text-[#48A5EE] shrink-0" />
                      <span>Teams Meeting Link</span>
                      <span
                        className="font-normal text-slate-400 cursor-help hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        title={`This link will be displayed to the student ${activeLesson?.unlockEarlyMinutes ?? 5} minutes before the lesson`}
                      >
                        (Enter ~{(activeLesson?.unlockEarlyMinutes ?? 5) + 5} mins before lesson)
                      </span>
                    </label>
                    {activeLesson.teamsMeetingUrl && (
                      <a
                        href={activeLesson.teamsMeetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#48A5EE] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Open Teams</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={teamsUrlInput}
                      onChange={(e) => setTeamsUrlInput(e.target.value)}
                      placeholder="https://teams.microsoft.com/l/meetup-join/..."
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-[#48A5EE]"
                    />
                    <button
                      onClick={handleUpdateTeamsUrl}
                      disabled={isUpdatingTeams}
                      className="px-4 py-2 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isUpdatingTeams ? "Saving..." : "Save Link"}</span>
                    </button>
                  </div>
                  {teamsSuccess && (
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {teamsSuccess}
                    </p>
                  )}
                </div>

                {/* Real-time Session Action Triggers */}
                <div data-tour="tutor-lesson-controls" className="flex flex-wrap items-center gap-3 pt-2">
                  {!isLessonLive && (
                    <button
                      onClick={handleStartLessonNow}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Start Lesson Now (Play Chime)</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelayLesson(5)}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold transition-all cursor-pointer"
                      title="Delay this lesson by 5 minutes"
                    >
                      +5m Delay
                    </button>
                    <button
                      onClick={() => handleDelayLesson(10)}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold transition-all cursor-pointer"
                      title="Delay this lesson by 10 minutes"
                    >
                      +10m Delay
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelayModal(10, activeLesson)}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      title="Custom delay duration or add explanation for student"
                    >
                      <FastForward className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Custom / Reason...</span>
                    </button>
                    {(activeLesson.delayMinutes > 0 || activeLesson.status === "DELAYED") && (
                      <button
                        type="button"
                        onClick={() => handleResetStartTime(activeLesson)}
                        disabled={isResettingStartTime}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        title={`Reset start time back to original schedule (removes ${activeLesson.delayMinutes}m delay)`}
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>Reset Start Time</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleCancelSession(activeLesson)}
                    className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Cancel this lesson"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Cancel</span>
                  </button>

                  <button
                    onClick={() => {
                      setSessionToComplete(activeLesson);
                      setIsCompletionModalOpen(true);
                    }}
                    className="ml-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Lesson &amp; Report</span>
                  </button>
                </div>
              </div>

              {/* UP NEXT / FOLLOWING LESSON SECTION */}
              {nextLesson && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-blue-200 dark:border-blue-900/50 p-6 sm:p-7 shadow-sm space-y-6 transition-colors relative overflow-hidden">
                  {/* Top gradient highlight bar */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#48A5EE] via-indigo-500 to-cyan-400" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#48A5EE]/15 text-[#48A5EE] dark:bg-[#48A5EE]/25 flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5" />
                          <span>{isLessonLive ? "Up Next: Following Lesson" : "Following Lesson in Queue"}</span>
                        </span>

                        {nextLesson.status === "DELAYED" ? (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            ● Delayed (+{nextLesson.delayMinutes}m)
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            ● Scheduled
                          </span>
                        )}

                        {nextLesson.status === "DELAYED" && nextLesson.delayReason && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold">
                            Reason: {nextLesson.delayReason}
                          </span>
                        )}

                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {new Date(nextLesson.scheduledStartTime).toLocaleDateString([], {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span>&bull;</span>
                          <Clock className="w-3.5 h-3.5 text-[#48A5EE]" />
                          {new Date(nextLesson.scheduledStartTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          –{" "}
                          {new Date(nextLesson.scheduledEndTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        {/* Countdown indicator */}
                        <LessonCountdownBadge
                          startTime={nextLesson.scheduledStartTime}
                          currentTime={currentTime}
                          status={nextLesson.status}
                        />
                      </div>

                      <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100">
                        {nextLesson.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Student: <strong className="text-slate-700 dark:text-slate-200">{nextLesson.tutee?.name}</strong>
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {nextLesson.studentTopic && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                            <BookOpen className="w-3.5 h-3.5 shrink-0" />
                            <span>Today&apos;s topic: {nextLesson.studentTopic}</span>
                          </div>
                        )}
                        {nextLesson.notes && (
                          <div
                            className="inline-flex items-start sm:items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs font-medium shadow-2xs"
                            title="Manually set admin notes for tutor"
                          >
                            <Info className="w-3.5 h-3.5 text-[#48A5EE] shrink-0 mt-0.5 sm:mt-0" />
                            <span>
                              <strong className="font-semibold text-blue-800 dark:text-blue-300">Admin Notes:</strong> {nextLesson.notes}
                            </span>
                          </div>
                        )}
                        {nextLessonPrevNotes && (
                          <div
                            className="inline-flex items-start sm:items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs font-medium shadow-2xs"
                            title="Extra notes & homework set in the previous lesson"
                          >
                            <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5 sm:mt-0" />
                            <span>
                              <strong className="font-semibold text-purple-800 dark:text-purple-300">Previous extra notes &amp; homework:</strong> {nextLessonPrevNotes}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Visible PIN & Magic Link for next lesson */}
                    <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <Key className="w-3.5 h-3.5 text-[#48A5EE]" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">PIN:</span>
                        <strong className="text-xs font-mono font-extrabold text-slate-800 dark:text-slate-100">
                          {nextLesson.tutee?.pin || "----"}
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleCopyLink(`next-queue-${nextLesson.id}`, nextLesson.tutee?.magicKey)
                        }
                        className="px-3 py-1.5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        title="1-Click Copy Magic Link for Next Student"
                      >
                        {copiedKey === `next-queue-${nextLesson.id}` ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Copy Magic Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Teams Meeting URL Setup for Next Lesson */}
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                        <Video className="w-4 h-4 text-[#48A5EE] shrink-0" />
                        <span>Teams Meeting Link for Next Lesson</span>
                        <span
                          className="font-normal text-slate-400 cursor-help hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          title={`This link will be displayed to the student ${nextLesson?.unlockEarlyMinutes ?? 5} minutes before the lesson`}
                        >
                          (Enter ~{(nextLesson?.unlockEarlyMinutes ?? 5) + 5} mins before lesson)
                        </span>
                      </label>
                      {nextLesson.teamsMeetingUrl && (
                        <a
                          href={nextLesson.teamsMeetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#48A5EE] hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>Open Teams</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={nextTeamsUrlInput}
                        onChange={(e) => setNextTeamsUrlInput(e.target.value)}
                        placeholder="https://teams.microsoft.com/l/meetup-join/..."
                        className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-[#48A5EE]"
                      />
                      <button
                        type="button"
                        onClick={handleUpdateNextTeamsUrl}
                        disabled={isUpdatingNextTeams}
                        className="px-4 py-2 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isUpdatingNextTeams ? "Saving..." : "Save Link"}</span>
                      </button>
                    </div>
                    {nextTeamsSuccess && (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        {nextTeamsSuccess}
                      </p>
                    )}
                  </div>

                  {/* Action Controls for Next Lesson */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {/* Delay Action Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenDelayModal(5, nextLesson)}
                        className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title="Delay this upcoming lesson by 5 minutes"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>+5m Delay</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDelayModal(10, nextLesson)}
                        className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title="Delay this upcoming lesson by 10 minutes"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>+10m Delay</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDelayModal(15, nextLesson)}
                        className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title="Custom delay or add explanation for student"
                      >
                        <FastForward className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Custom / Reason...</span>
                      </button>

                      {(nextLesson.delayMinutes > 0 || nextLesson.status === "DELAYED") && (
                        <button
                          type="button"
                          onClick={() => handleResetStartTime(nextLesson)}
                          disabled={isResettingStartTime}
                          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          title={`Reset start time back to original schedule (removes ${nextLesson.delayMinutes}m delay)`}
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Reset Start</span>
                        </button>
                      )}
                    </div>

                    {/* Start Lesson Early */}
                    <button
                      type="button"
                      onClick={() => handleStartLessonNow(nextLesson)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                      title="Start this upcoming lesson right now"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Start Lesson Early</span>
                    </button>

                    {/* Cancel */}
                    <button
                      type="button"
                      onClick={() => handleCancelSession(nextLesson)}
                      className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      title="Cancel this upcoming lesson"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span>Cancel</span>
                    </button>

                    {/* Add to Calendar */}
                    <div className="ml-auto">
                      <AddToCalendar session={nextLesson} compact />
                    </div>
                  </div>
                </div>
              )}

              {/* Subtitle banner when live and no subsequent lesson */}
              {isLessonLive && !nextLesson && (
                <div className="bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-300">No subsequent lessons scheduled</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">You are all clear after your current ongoing lesson.</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
              <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
                <Clock className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  No Active Lesson Right Now
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  When the admin schedules a lesson for you, it will appear here with live controls and the student&apos;s PIN &amp; magic link.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY ASSIGNED STUDENTS */}
        {activeTab === "students" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Students Assigned to You
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You can see your assigned students&apos; PINs and copy their direct magic access links.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#48A5EE]/10 text-[#48A5EE] shrink-0 self-start sm:self-auto">
                {assignedStudents.length} Students
              </span>
            </div>

            {/* PIN Reset Success Toast / Message */}
            {pinResetSuccessMessage && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{pinResetSuccessMessage}</span>
              </div>
            )}

            {/* Alert Banner for any Locked Students */}
            {(() => {
              const lockedStudents = assignedStudents.filter(
                (s) => s.pinLockedUntil && new Date(s.pinLockedUntil).getTime() > Date.now()
              );
              if (lockedStudents.length === 0) return null;
              return (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
                    <div>
                      <p className="font-bold text-rose-800 dark:text-rose-200">
                        {lockedStudents.length} student{lockedStudents.length > 1 ? "s" : ""} locked out due to incorrect PIN guesses:
                      </p>
                      <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                        {lockedStudents.map((s) => s.name).join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {lockedStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleResetPinLock(s)}
                        disabled={unlockingStudentId === s.id}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                        title={`Reset PIN lock for ${s.name}`}
                      >
                        {unlockingStudentId === s.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Unlocking...</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Unlock {s.name.split(" ")[0]}</span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Student Search Box */}
            {assignedStudents.length > 0 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  placeholder="Search your students by name, PIN, email..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#48A5EE] text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
                {studentSearchTerm && (
                  <button
                    onClick={() => setStudentSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading assigned students...</div>
            ) : assignedStudents.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No Students Assigned Yet
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  The admin assigns students to tutors. Once assigned, their PIN and magic link will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {assignedStudents
                  .filter((student) => {
                    if (!studentSearchTerm.trim()) return true;
                    const q = studentSearchTerm.toLowerCase();
                    return (
                      student.name.toLowerCase().includes(q) ||
                      (student.pin || "").toLowerCase().includes(q) ||
                      (student.email || "").toLowerCase().includes(q)
                    );
                  })
                  .map((student) => {
                    const isLocked = Boolean(
                      student.pinLockedUntil && new Date(student.pinLockedUntil).getTime() > Date.now()
                    );
                    const lockMinutes = isLocked
                      ? Math.max(1, Math.ceil((new Date(student.pinLockedUntil).getTime() - Date.now()) / 60000))
                      : 0;

                    return (
                    <div
                      key={student.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                            {student.name}
                          </span>
                          {isLocked && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] font-bold animate-pulse">
                              <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>PIN Locked ({lockMinutes}m remaining)</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          {student.email ? <span>{student.email}</span> : <span>Student Profile</span>}
                          <span>•</span>
                          <span className="text-[#48A5EE] font-medium">Assigned to You</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Weekly Calendar Modal Button */}
                        <button
                          onClick={() => handleOpenCalendar(student)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/70 dark:border-slate-700"
                          title="Open Weekly Timetable"
                        >
                          <Calendar className="w-3.5 h-3.5 text-[#48A5EE]" />
                          <span>Weekly Calendar</span>
                        </button>

                        {/* Visible PIN */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <Key className="w-3.5 h-3.5 text-[#48A5EE]" />
                          <span className="text-xs text-slate-500 dark:text-slate-400">PIN:</span>
                          <strong className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                            {student.pin || "----"}
                          </strong>
                          <button
                            onClick={() => handleCopyPin(`stu-pin-${student.id}`, student.pin)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            title="Copy PIN"
                          >
                            {copiedKey === `stu-pin-${student.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Unlock PIN Button (prominently shown if locked) */}
                        {isLocked && (
                          <button
                            type="button"
                            onClick={() => handleResetPinLock(student)}
                            disabled={unlockingStudentId === student.id}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                            title={`Reset PIN lock for ${student.name}`}
                          >
                            {unlockingStudentId === student.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Unlocking...</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Unlock PIN</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* 1-Click Copy Magic Link */}
                        <button
                          onClick={() => handleCopyLink(`stu-magic-${student.id}`, student.magicKey)}
                          className="px-3 py-1.5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          title="Copy Student Magic Link"
                        >
                          {copiedKey === `stu-magic-${student.id}` ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Link Copied!</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Copy Magic Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MY SCHEDULED LESSONS (3-Tier Breakdown: Upcoming, Completed Unpaid, Archived Paid) */}
        {activeTab === "lessons" && (() => {
          const nowMs = currentTime;

          // Filter by search term and student
          const filtered = mySessions.filter((s) => {
            if (lessonStudentFilter !== "ALL" && s.tuteeId !== lessonStudentFilter) return false;
            if (lessonSearchTerm.trim()) {
              const q = lessonSearchTerm.toLowerCase();
              const stName = (s.tutee?.name || "").toLowerCase();
              const title = (s.title || "").toLowerCase();
              const covered = (s.feedbackCovered || "").toLowerCase();
              if (!stName.includes(q) && !title.includes(q) && !covered.includes(q)) {
                return false;
              }
            }
            return true;
          });

          // Sort function
          const sortList = (list: any[]) => {
            return [...list].sort((a, b) => {
              if (lessonSortBy === "soonest") {
                return new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime();
              }
              if (lessonSortBy === "newest") {
                return new Date(b.scheduledStartTime).getTime() - new Date(a.scheduledStartTime).getTime();
              }
              if (lessonSortBy === "oldest") {
                return new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime();
              }
              if (lessonSortBy === "student") {
                return (a.tutee?.name || "").localeCompare(b.tutee?.name || "");
              }
              if (lessonSortBy === "rating") {
                return (b.feedbackRating || 0) - (a.feedbackRating || 0);
              }
              return 0;
            });
          };

          // 1. Upcoming: strictly unpaid, NOT completed/cancelled, and scheduled end time is in the future
          const upcomingList = sortList(
            filtered.filter((s) => {
              const endMs = new Date(s.scheduledEndTime).getTime();
              const isDone = s.status === "COMPLETED" || s.status === "CANCELLED";
              return !s.tutorPaid && !isDone && endMs > nowMs;
            })
          );

          // 2. Completed (Tutor Not Paid): strictly unpaid, NOT cancelled, and (completed OR scheduled end time has passed)
          const completedUnpaidList = sortList(
            filtered.filter((s) => {
              const endMs = new Date(s.scheduledEndTime).getTime();
              const isDoneOrPassed = s.status === "COMPLETED" || endMs <= nowMs;
              return !s.tutorPaid && s.status !== "CANCELLED" && isDoneOrPassed;
            })
          );

          // 3. Archived (Tutor Paid): tutorPaid === true
          const archivedPaidList = sortList(
            filtered.filter((s) => s.tutorPaid)
          );

          // 4. Cancelled: status === "CANCELLED"
          const cancelledList = sortList(
            filtered.filter((s) => s.status === "CANCELLED")
          );

          // Extract unique students for filter
          const studentFilterOptions = Array.from(
            new Map(
              mySessions
                .filter((s) => s.tutee)
                .map((s) => [s.tutee.id, s.tutee.name])
            ).entries()
          );

          return (
            <div className="space-y-6">
              {/* Search, Filter & Sort Toolbar */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search by student, topic, or topics covered..."
                      value={lessonSearchTerm}
                      onChange={(e) => setLessonSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-[#48A5EE]"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Student Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      <Users className="w-3.5 h-3.5 text-[#48A5EE]" />
                      <select
                        value={lessonStudentFilter}
                        onChange={(e) => setLessonStudentFilter(e.target.value)}
                        className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">All Students</option>
                        {studentFilterOptions.map(([id, name]) => (
                          <option key={id} value={id}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#48A5EE]" />
                      <select
                        value={lessonSortBy}
                        onChange={(e) => setLessonSortBy(e.target.value as any)}
                        className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="soonest">Soonest First</option>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="student">Student (A-Z)</option>
                        <option value="rating">Rating (Highest)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCalendarSubOpen(true)}
                      className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 text-xs font-bold transition-colors cursor-pointer"
                      title="Subscribe your phone or computer to auto-syncing WebCal feed"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-purple-500" />
                      <span>Live Calendar (WebCal)</span>
                    </button>
                    <button
                      onClick={handleExportWeekSchedule}
                      className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      title="Export this week's scheduled lessons to .ics"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#48A5EE]" />
                      <span>Export Week (.ics)</span>
                    </button>
                    <button
                      onClick={() => exportSessionsToCSV(filtered, "lb-maths-my-lessons")}
                      className="flex items-center gap-1.5 bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] px-3 py-1.5 rounded-xl border border-[#48A5EE]/30 text-xs font-bold transition-colors cursor-pointer"
                      title="Download your lessons as CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Status Summary Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsUpcomingOpen(!isUpcomingOpen)}
                    className="px-3 py-1 rounded-xl bg-[#48A5EE]/10 text-[#48A5EE] font-bold hover:bg-[#48A5EE]/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title={isUpcomingOpen ? "Click to collapse" : "Click to expand"}
                  >
                    <span>Upcoming: {upcomingList.length}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isUpcomingOpen ? "rotate-180" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCompletedOpen(!isCompletedOpen)}
                    className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title={isCompletedOpen ? "Click to collapse" : "Click to expand"}
                  >
                    <span>Awaiting Payment: {completedUnpaidList.length}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCompletedOpen ? "rotate-180" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCancelledOpen(!isCancelledOpen)}
                    className="px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title={isCancelledOpen ? "Click to collapse" : "Click to expand"}
                  >
                    <span>Cancelled: {cancelledList.length}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCancelledOpen ? "rotate-180" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsArchivedOpen(!isArchivedOpen)}
                    className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title={isArchivedOpen ? "Click to collapse" : "Click to expand"}
                  >
                    <span>Paid &amp; Archived: {archivedPaidList.length}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isArchivedOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>

              {/* 1. UPCOMING LESSONS (Shown at top) */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
                <button
                  type="button"
                  onClick={() => setIsUpcomingOpen(!isUpcomingOpen)}
                  className={`w-full p-5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer ${isUpcomingOpen ? "border-b border-slate-100 dark:border-slate-800" : ""
                    }`}
                >
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#48A5EE]" />
                      <span>Upcoming Lessons</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Future scheduled or in-progress lessons. Past lessons automatically move to Completed below.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-[#48A5EE]/15 text-[#48A5EE] text-xs font-bold">
                      {upcomingList.length} Scheduled
                    </span>
                    <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isUpcomingOpen ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </button>

                {isUpcomingOpen && (
                  <div className="space-y-3 pt-3">

                    {upcomingList.length === 0 ? (
                      <div className="text-center py-10 px-4 space-y-2">
                        <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Upcoming Lessons</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Your upcoming scheduled lessons will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="px-4 py-3">Student &amp; Lesson</th>
                              <th className="px-3 py-3">Date &amp; Time</th>
                              <th className="px-2 py-3 text-center">Status</th>
                              <th className="px-3 py-3">PIN &amp; Link</th>
                              <th className="px-3 py-3 text-center">Cancel / Complete</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {upcomingList.map((s) => {
                              const isRowLive =
                                s.status === "IN_PROGRESS" ||
                                (currentTime >= new Date(s.scheduledStartTime).getTime() &&
                                  currentTime < new Date(s.scheduledEndTime).getTime() &&
                                  s.status !== "COMPLETED" &&
                                  s.status !== "CANCELLED");

                              return (
                              <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                                <td className="px-4 py-3">
                                  <div className="font-bold text-slate-800 dark:text-slate-100">
                                    {s.tutee?.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {s.title}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    {s.studentTopic && (
                                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[10px] font-semibold">
                                        <BookOpen className="w-2.5 h-2.5 shrink-0" />
                                        <span>{s.studentTopic}</span>
                                      </div>
                                    )}
                                    {s.notes && (
                                      <div
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-[10px] font-medium max-w-[280px] truncate"
                                        title={`Admin note: ${s.notes}`}
                                      >
                                        <Info className="w-2.5 h-2.5 shrink-0 text-[#48A5EE]" />
                                        <span className="truncate">Admin note: {s.notes}</span>
                                      </div>
                                    )}
                                    {getPreviousLessonNotes(s) && (
                                      <div
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-[10px] font-medium max-w-[280px] truncate"
                                        title={`Previous extra notes & homework: ${getPreviousLessonNotes(s)}`}
                                      >
                                        <FileText className="w-2.5 h-2.5 shrink-0 text-purple-600 dark:text-purple-400" />
                                        <span className="truncate">Prev notes: {getPreviousLessonNotes(s)}</span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                  <div className="font-semibold text-slate-700 dark:text-slate-200">
                                    {new Date(s.scheduledStartTime).toLocaleDateString([], {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                    })}{" "}
                                    &bull;{" "}
                                    {new Date(s.scheduledStartTime).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 font-sans">
                                    {s.teamsMeetingUrl ? (
                                      <a
                                        href={s.teamsMeetingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#48A5EE] font-semibold hover:underline inline-flex items-center gap-1 text-[11px]"
                                      >
                                        <Video className="w-3 h-3" />
                                        <span>Teams</span>
                                      </a>
                                    ) : (
                                      <span className="text-slate-400 italic text-[10px]">No Teams</span>
                                    )}
                                    <AddToCalendar session={s} compact />
                                  </div>
                                </td>
                                <td className="px-2 py-3 text-center whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isRowLive
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                        : s.status === "DELAYED"
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                          : "bg-[#48A5EE]/15 text-[#48A5EE]"
                                      }`}
                                  >
                                    {isRowLive
                                      ? "IN_PROGRESS"
                                      : s.status === "DELAYED" && s.delayMinutes
                                      ? `DELAYED (+${s.delayMinutes}m)`
                                      : s.status}
                                  </span>
                                  {s.delayReason && (
                                    <div
                                      className="text-[10px] text-amber-700 dark:text-amber-400 truncate max-w-[110px] mx-auto mt-0.5"
                                      title={s.delayReason}
                                    >
                                      {s.delayReason}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                                    <span className="px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px]">
                                      PIN: {s.tutee?.pin || "----"}
                                    </span>
                                    <button
                                      onClick={() => handleCopyLink(`sess-${s.id}`, s.tutee?.magicKey)}
                                      className="px-2 py-0.5 rounded-lg bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] font-bold text-[10px] transition-colors cursor-pointer"
                                      title="Copy Magic Link"
                                    >
                                      {copiedKey === `sess-${s.id}` ? "Copied!" : "Link"}
                                    </button>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <div className="flex flex-col items-center gap-1 min-w-[90px]">
                                    <button
                                      onClick={() => {
                                        setSessionToComplete(s);
                                        setIsCompletionModalOpen(true);
                                      }}
                                      className="w-full px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                                      title="Complete Lesson & Submit Report"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Complete</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDelayModal(10, s)}
                                      className="w-full px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold text-[10px] inline-flex items-center justify-center gap-1 transition-all cursor-pointer border border-amber-200 dark:border-amber-800 whitespace-nowrap"
                                      title="Delay this lesson (+5m, +10m, custom mins, or with reason)"
                                    >
                                      <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                      <span>{s.status === "DELAYED" ? `Delayed (+${s.delayMinutes}m)` : "+ Delay / Reason"}</span>
                                    </button>
                                    {s.delayMinutes > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleResetStartTime(s)}
                                        className="w-full px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] inline-flex items-center justify-center gap-1 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                                        title={`Reset start time back to original schedule (removes ${s.delayMinutes}m delay)`}
                                      >
                                        <RotateCcw className="w-2.5 h-2.5 text-slate-500" />
                                        <span>Reset Start</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleCancelSession(s)}
                                      className="w-full px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold text-[10px] inline-flex items-center justify-center gap-1 transition-all cursor-pointer border border-rose-200 dark:border-rose-800 whitespace-nowrap"
                                      title="Cancel this lesson"
                                    >
                                      <XCircle className="w-2.5 h-2.5 text-rose-500" />
                                      <span>Cancel</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. COMPLETED (AWAITING PAYMENT) */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-amber-200 dark:border-amber-800/80 overflow-hidden shadow-sm transition-colors">
                <button
                  type="button"
                  onClick={() => setIsCompletedOpen(!isCompletedOpen)}
                  className={`w-full p-5 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-100/40 dark:hover:bg-amber-900/30 transition-colors text-left cursor-pointer ${isCompletedOpen ? "border-b border-amber-200 dark:border-amber-800/80" : ""
                    }`}
                >
                  <div>
                    <h3 className="text-base font-extrabold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Completed Lessons &bull; Payment Pending ({completedUnpaidList.length})</span>
                      {completedUnpaidList.filter((s) => !s.feedbackCovered).length > 0 && (
                        <span className="ml-1 px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-xs font-bold border border-red-200 dark:border-red-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          <span>
                            {completedUnpaidList.filter((s) => !s.feedbackCovered).length} Report
                            {completedUnpaidList.filter((s) => !s.feedbackCovered).length > 1 ? "s" : ""} Needed
                          </span>
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                      Finished sessions with student feedback and ratings. The admin will mark these as paid once processed.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:flex-row sm:items-center">
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      {isCompletedOpen ? "Hide" : "Show"}
                    </span>
                    <div className="p-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCompletedOpen ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </button>

                {isCompletedOpen && (
                  <div className="space-y-3">

                    {completedUnpaidList.length === 0 ? (
                      <div className="text-center py-10 px-4 space-y-1">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Pending Payouts</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          All your completed lessons have been paid or none are pending.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {completedUnpaidList.map((s) => (
                          <div
                            key={s.id}
                            className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition-colors"
                          >
                            <div className="space-y-1.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                                  {s.tutee?.name}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">&bull;</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                  {new Date(s.scheduledStartTime).toLocaleDateString([], {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })}{" "}
                                  {new Date(s.scheduledStartTime).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>

                                {/* 5-Star Rating Badge */}
                                {s.feedbackRating ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    <span>{s.feedbackRating}/5 Stars</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">No rating submitted</span>
                                )}

                                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                                  Payment Pending
                                </span>

                                {!s.feedbackCovered && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 text-[10px] font-bold flex items-center gap-1 border border-red-200 dark:border-red-800">
                                    <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                                    <span>Report Needed</span>
                                  </span>
                                )}
                              </div>

                              {/* What was covered & notes */}
                              {s.feedbackCovered ? (
                                <div className="text-xs bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                  <span className="font-bold text-[#48A5EE] mr-1">Covered:</span>
                                  {s.feedbackCovered}
                                  {s.feedbackNotes && (
                                    <p className="text-slate-500 dark:text-slate-400 mt-1 italic">
                                      Notes: &quot;{s.feedbackNotes}&quot;
                                    </p>
                                  )}
                                  {s.notes && (
                                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-[11px]">
                                      <strong className="text-blue-600 dark:text-blue-400 font-semibold">Admin Notes:</strong> &quot;{s.notes}&quot;
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold italic flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  Lesson report pending &mdash; click Submit Report to record topics covered.
                                </p>
                              )}
                            </div>

                            {/* Submit / Edit Report Button */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  setSessionToComplete(s);
                                  setIsCompletionModalOpen(true);
                                }}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer ${
                                  !s.feedbackCovered
                                    ? "bg-amber-500 hover:bg-amber-600 text-white border border-amber-600"
                                    : "bg-slate-100 dark:bg-slate-800 hover:bg-[#48A5EE] text-slate-700 dark:text-slate-200 hover:text-white border border-slate-200 dark:border-slate-700"
                                }`}
                                title={!s.feedbackCovered ? "Submit Lesson Report" : "Edit Covered Topics, Rating & Notes"}
                              >
                                {s.feedbackCovered ? (
                                  <Edit3 className="w-3.5 h-3.5" />
                                ) : (
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                )}
                                <span>{!s.feedbackCovered ? "Submit Report" : "Edit Report"}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. CANCELLED LESSONS */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 overflow-hidden shadow-sm transition-colors">
                <button
                  type="button"
                  onClick={() => setIsCancelledOpen(!isCancelledOpen)}
                  className={`w-full p-5 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-rose-100/40 dark:hover:bg-rose-900/30 transition-colors text-left cursor-pointer ${isCancelledOpen ? "border-b border-rose-200 dark:border-rose-900/60" : ""
                    }`}
                >
                  <div>
                    <h3 className="text-base font-extrabold text-rose-950 dark:text-rose-200 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <span>Cancelled Lessons ({cancelledList.length})</span>
                    </h3>
                    <p className="text-xs text-rose-800/80 dark:text-rose-300/80">
                      Lessons that were cancelled. Contact the Head Tutor if you need to reschedule a session.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {cancelledList.length > 0 && (
                      <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold">
                        {cancelledList.length} Cancelled
                      </span>
                    )}
                    <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                      {isCancelledOpen ? "Hide" : "Show"}
                    </span>
                    <div className="p-1 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCancelledOpen ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </button>

                {isCancelledOpen && (
                  <div className="p-6 pt-2 space-y-3 border-t border-rose-100 dark:border-rose-900/50">
                    {cancelledList.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400">
                        No cancelled lessons.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {cancelledList.map((s) => (
                          <div
                            key={s.id}
                            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-80 hover:opacity-100 transition-opacity"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                  {s.tutee?.name}
                                </span>
                                <span className="text-xs text-slate-400">&bull;</span>
                                <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                                  {s.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                  {new Date(s.scheduledStartTime).toLocaleDateString([], {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })}{" "}
                                  {new Date(s.scheduledStartTime).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                                  ● Cancelled
                                </span>
                              </div>

                              {s.notes && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  <strong>Notes:</strong> &quot;{s.notes}&quot;
                                </p>
                              )}
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 italic">
                                Contact Head Tutor to reschedule
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. ARCHIVED (TUTOR PAID) */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
                <button
                  type="button"
                  onClick={() => setIsArchivedOpen(!isArchivedOpen)}
                  className={`w-full p-5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer ${isArchivedOpen ? "border-b border-slate-100 dark:border-slate-800" : ""
                    }`}
                >
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Archive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Archived Lessons &bull; Paid ({archivedPaidList.length})</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Settled lessons marked as paid by the admin.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {isArchivedOpen ? "Hide" : "Show"}
                    </span>
                    <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isArchivedOpen ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </button>

                {isArchivedOpen && (
                  <div className="space-y-3">

                    {archivedPaidList.length === 0 ? (
                      <div className="text-center py-10 px-4 space-y-1 text-xs text-slate-400">
                        No archived paid lessons yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {archivedPaidList.map((s) => (
                          <div
                            key={s.id}
                            className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <div className="space-y-1.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                                  {s.tutee?.name}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">&bull;</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                  {new Date(s.scheduledStartTime).toLocaleDateString([], {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>

                                {s.feedbackRating && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    <span>{s.feedbackRating}/5</span>
                                  </span>
                                )}

                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                                  Paid &amp; Archived
                                </span>
                              </div>

                              {s.feedbackCovered && (
                                <div className="text-xs bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                  <span className="font-bold text-slate-600 dark:text-slate-400 mr-1">Covered:</span>
                                  {s.feedbackCovered}
                                  {s.feedbackNotes && (
                                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 italic">
                                      Notes: &quot;{s.feedbackNotes}&quot;
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Paid Lock Indicator */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-xs font-semibold shrink-0 border border-slate-200 dark:border-slate-700">
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Report Locked (Paid)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* TAB: SHARED RESOURCES */}
        {activeTab === "resources" && currentUser && (
          <div className="animate-in fade-in">
            <SharedResourcesHub currentUser={currentUser} />
          </div>
        )}

        {/* TAB 4: TUTOR SETTINGS & SECURITY */}
        {activeTab === "settings" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6 transition-colors">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#48A5EE]" />
                  <span>Tutor Settings &amp; Security</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage your account credentials, view your profile details, and update your password.
                </p>
              </div>

              {/* Account Information Card */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Account Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Tutor Name</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {formatTutorName(currentUser?.name) || "Tutor"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Login Email</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200 text-xs">
                      {currentUser?.email || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Assigned Students</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs">
                      {assignedStudents.length} student(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* Change Password Form */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#48A5EE]/15 text-[#48A5EE] flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Change Account Password
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enter your current password and choose a new one (minimum 5 characters).
                    </p>
                  </div>
                </div>

                {tutorPasswordError && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{tutorPasswordError}</span>
                  </div>
                )}

                {tutorPasswordSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{tutorPasswordSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleChangeTutorPassword} className="space-y-4 max-w-md text-xs">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Current Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={tutorCurrentPassword}
                      onChange={(e) => setTutorCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-[#48A5EE]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      New Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={5}
                      value={tutorNewPassword}
                      onChange={(e) => setTutorNewPassword(e.target.value)}
                      placeholder="Enter new password (min 5 characters)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-[#48A5EE]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={5}
                      value={tutorConfirmPassword}
                      onChange={(e) => setTutorConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-[#48A5EE]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingTutorPassword}
                    className="py-2.5 px-5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSubmittingTutorPassword ? "Updating Password..." : "Update Password"}</span>
                  </button>
                </form>
              </div>

              {/* Schedule & Calendar Export Card */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#48A5EE]/15 text-[#48A5EE] flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Calendar &amp; Schedule Export
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Export your scheduled lessons into an .ics calendar file for Apple Calendar, Google Calendar, or Microsoft Outlook.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Download this week&apos;s teaching timetable with student names and start/end times.
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsCalendarSubOpen(true)}
                      className="py-2 px-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-purple-200 dark:border-purple-800 shrink-0"
                      title="Subscribe your phone or computer to auto-syncing WebCal feed"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-purple-500" />
                      <span>Live Calendar (WebCal)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportWeekSchedule}
                      className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700 shrink-0"
                      title="Export all my lessons for this week to .ics calendar"
                    >
                      <Download className="w-3.5 h-3.5 text-[#48A5EE]" />
                      <span>Export Week (.ics)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Tutor Completion Modal */}
      <TutorCompletionModal
        isOpen={isCompletionModalOpen}
        onClose={() => {
          setIsCompletionModalOpen(false);
          setSessionToComplete(null);
        }}
        session={sessionToComplete}
        onCompleted={(updated) => {
          setActionMessage(`Lesson report for ${updated?.tutee?.name || "student"} saved successfully!`);
          loadLiveSession();
          loadMySessions();
          setTimeout(() => setActionMessage(""), 4000);
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      {/* Maths Formula Sheet Modal */}
      <FormulaSheetModal
        isOpen={isFormulaSheetOpen}
        onClose={() => setIsFormulaSheetOpen(false)}
      />

      {/* Casio fx-83GTX Scientific Calculator Modal */}
      <CasioCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />

      {/* Cancel Lesson Modal */}
      <CancelLessonModal
        isOpen={isCancelModalOpen}
        session={cancelTargetLesson}
        onClose={() => {
          setIsCancelModalOpen(false);
          setCancelTargetLesson(null);
        }}
        onSuccess={async () => {
          setActionMessage("Lesson marked as cancelled. Contact Head Tutor if you need to reschedule.");
          loadMySessions();
          loadLiveSession();
          setTimeout(() => setActionMessage(""), 4000);
        }}
      />

      {/* Delay Lesson with Reason Modal */}
      <DelayReasonModal
        isOpen={delayModal.isOpen}
        minutes={delayModal.minutes}
        studentName={delayModal.studentName}
        currentDelayMinutes={
          (delayModal.sessionId === activeLesson?.id
            ? activeLesson?.delayMinutes
            : mySessions.find((s) => s.id === delayModal.sessionId)?.delayMinutes) || 0
        }
        onReset={() => {
          const s =
            delayModal.sessionId === activeLesson?.id
              ? activeLesson
              : mySessions.find((s) => s.id === delayModal.sessionId);
          if (s) handleResetStartTime(s);
        }}
        onClose={() => setDelayModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelay}
        isSubmitting={isSubmittingDelay}
      />

      {/* User Weekly Calendar Timetable Modal */}
      <UserWeeklyCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => {
          setIsCalendarModalOpen(false);
          setCalendarModalUser(null);
        }}
        targetUser={calendarModalUser}
        allSessions={mySessions}
        students={assignedStudents}
        tutors={currentUser ? [currentUser] : []}
        currentUserId={currentUser?.id}
        isAdmin={false}
        onSessionCreated={() => {
          loadMySessions();
          loadLiveSession();
        }}
        onUserSelect={(u) => setCalendarModalUser(u)}
      />

      {/* Live Calendar Subscription Modal */}
      <CalendarSubscriptionModal
        isOpen={isCalendarSubOpen}
        onClose={() => setIsCalendarSubOpen(false)}
        title="My Teaching Schedule Feed"
        subtitle="Subscribe your phone or computer calendar to your teaching schedule. Changes, reschedules, or new bookings sync automatically."
      />

      <Footer />
    </div>
  );
}
