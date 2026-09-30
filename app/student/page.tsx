"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import CountdownTimer from "@/components/countdown-timer";
import TeamsLauncher from "@/components/teams-launcher";
import AddToCalendar from "@/components/add-to-calendar";
import {
  Calendar,
  ArrowLeft,
  AlertCircle,
  FileText,
  UserCheck,
  CheckCircle2,
  Calculator,
  Mail,
  Copy,
  Check,
  X,
  XCircle,
  Info,
  BookOpen,
  Send,
  RefreshCw,
  Clock,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { formatTutorName } from "@/lib/format";
import FormulaSheetModal from "@/components/formula-sheet-modal";
import CasioCalculatorModal from "@/components/casio-calculator-modal";
import ExamCountdownModal from "@/components/exam-countdown-modal";
import CalendarSubscriptionModal from "@/components/calendar-subscription-modal";
import SharedResourcesModal from "@/components/shared-resources-modal";
import { resolveActiveSession } from "@/lib/session-utils";

function StudentLobbyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const magicKey = searchParams.get("key");

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [cancelledSessions, setCancelledSessions] = useState<any[]>([]);
  const [dismissedCancelledIds, setDismissedCancelledIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  // Formula Sheet, Casio Calculator, Exam Countdown & Shared Resources modal state
  const [isFormulaSheetOpen, setIsFormulaSheetOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isExamCountdownOpen, setIsExamCountdownOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isCalendarSubOpen, setIsCalendarSubOpen] = useState(false);
  const [copiedTutorEmail, setCopiedTutorEmail] = useState(false);

  // Student topic for lesson
  const [topicInput, setTopicInput] = useState("");
  const [topicSaved, setTopicSaved] = useState(false);
  const [isSavingTopic, setIsSavingTopic] = useState(false);
  const [allStudentSessions, setAllStudentSessions] = useState<any[]>([]);

  // Find extra notes & homework written in the previous lesson for this student
  const previousLessonNotes = useMemo(() => {
    if (!activeSession) return null;
    const currentStart = new Date(activeSession.scheduledStartTime).getTime();
    const past = allStudentSessions
      .filter((s) => {
        if (s.id === activeSession.id || s.status === "CANCELLED") return false;
        const sStart = new Date(s.scheduledStartTime).getTime();
        return sStart < currentStart && (s.status === "COMPLETED" || Boolean(s.feedbackNotes));
      })
      .sort((a, b) => new Date(b.scheduledStartTime).getTime() - new Date(a.scheduledStartTime).getTime());

    const prev = past[0];
    return prev?.feedbackNotes?.trim() || null;
  }, [activeSession, allStudentSessions]);

  const handleSaveTopic = async () => {
    if (!activeSession) return;
    setIsSavingTopic(true);
    try {
      const res = await fetch(`/api/sessions/${activeSession.id}/topic`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentTopic: topicInput.trim() || null }),
      });
      if (res.ok) {
        setTopicSaved(true);
        setTimeout(() => setTopicSaved(false), 2500);
      }
    } catch { }
    setIsSavingTopic(false);
  };

  const getTutorEmail = (tutorName?: string | null) => {
    const cleanName = (tutorName || "tutor").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${cleanName}@lbmathstuition.co.uk`;
  };

  useEffect(() => {
    async function init() {
      setLoading(true);

      // 1. If key is present in query, authenticate with magic key
      if (magicKey) {
        try {
          const res = await fetch("/api/auth/student-key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: magicKey }),
          });
          const data = await res.json();
          if (!res.ok) {
            setAuthError(data.error || "Invalid magic key");
            setLoading(false);
            return;
          }
          setCurrentUser({
            ...data.student,
            role: "TUTEE",
          });
          await loadStudentSessions(data.student.id);
          setLoading(false);
          return;
        } catch {
          setAuthError("Failed to authenticate with magic link.");
          setLoading(false);
          return;
        }
      }

      // 2. Otherwise, check existing auth session
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user) {
            setCurrentUser(meData.user);
            await loadStudentSessions(meData.user.id);
            setLoading(false);
            return;
          }
        }
      } catch { }

      // If neither magicKey nor auth session exists, redirect to home for PIN entry
      router.push("/");
      setLoading(false);
    }

    init();
  }, [magicKey, router]);

  const loadStudentSessions = async (tuteeId: string) => {
    try {
      const res = await fetch(`/api/sessions?tuteeId=${tuteeId}&active=true`);
      if (!res.ok) return;
      const data = await res.json();
      const sessions: any[] = data.sessions || [];
      setAllStudentSessions(sessions);

      const now = Date.now();
      const live = resolveActiveSession(sessions, now);
      setActiveSession(live || null);
      // Pre-fill topic input with whatever the student previously saved
      if (live?.studentTopic) setTopicInput(live.studentTopic);
      setUpcomingSessions(
        sessions.filter(
          (s) =>
            s.id !== live?.id &&
            s.status !== "COMPLETED" &&
            s.status !== "CANCELLED" &&
            new Date(s.scheduledEndTime).getTime() > now
        )
      );

      // Cancelled lessons (within the past 7 days or scheduled in the future)
      const cancelled = sessions.filter(
        (s) =>
          s.status === "CANCELLED" &&
          new Date(s.scheduledEndTime).getTime() > now - 7 * 24 * 3600 * 1000
      );
      setCancelledSessions(cancelled);
    } catch { }
  };

  // Real-time Server-Sent Events (SSE) listener: instant session and topic synchronization
  useEffect(() => {
    if (!currentUser?.id || typeof window === "undefined" || !("EventSource" in window)) return;

    let es: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        es = new EventSource("/api/events");
        es.addEventListener("session-update", () => {
          loadStudentSessions(currentUser.id);
        });
        es.onerror = () => {
          es?.close();
          es = null;
          retryTimeout = setTimeout(connectSSE, 10000);
        };
      } catch {
        // Fallback to polling
      }
    };

    connectSSE();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (es) es.close();
    };
  }, [currentUser?.id]);

  // Background fallback sync (SSE pushes real-time changes; polling acts as low-frequency safety net)
  useEffect(() => {
    if (!currentUser?.id) return;

    let timer: NodeJS.Timeout | null = null;

    const scheduleNextPoll = () => {
      if (timer) clearTimeout(timer);

      // Stop polling when tab is minimized or in the background to save CPU and battery
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      // Relaxed interval: 20s if a lesson is starting soon or in progress, otherwise 60s
      const now = Date.now();
      const isStartingSoonOrLive =
        activeSession &&
        (activeSession.status === "IN_PROGRESS" ||
          new Date(activeSession.scheduledStartTime).getTime() - now < 5 * 60 * 1000);

      const delay = isStartingSoonOrLive ? 20000 : 60000;

      timer = setTimeout(async () => {
        await loadStudentSessions(currentUser.id);
        scheduleNextPoll();
      }, delay);
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        // Immediate sync upon returning to tab
        loadStudentSessions(currentUser.id);
        scheduleNextPoll();
      } else if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    scheduleNextPoll();

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [currentUser?.id, activeSession?.status, activeSession?.scheduledStartTime]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b1120] transition-colors duration-200">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-3 border-[#48A5EE] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Loading maths lesson lobby...</p>
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b1120] transition-colors duration-200">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-sm transition-colors">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Authentication Failed</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{authError}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const unlockEarlyMinutes = activeSession?.unlockEarlyMinutes ?? 5;
  const unlockThresholdTime = activeSession
    ? new Date(activeSession.scheduledStartTime).getTime() - unlockEarlyMinutes * 60 * 1000
    : 0;

  const isMeetingUnlocked =
    activeSession?.status === "IN_PROGRESS" ||
    (activeSession && Date.now() >= unlockThresholdTime && activeSession.status !== "COMPLETED");

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b1120] transition-colors duration-200">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Welcome Header */}
        <div data-tour="student-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 px-5 py-3.5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100">
                Welcome, {currentUser?.name || "Student"}!
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                <UserCheck className="w-3 h-3" />
                <span>Verified</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your live maths lesson lobby. Meeting room &amp; countdown update in real time.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-tutorial"))}
              className="text-xs px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#48A5EE] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200/60 dark:border-blue-800/40"
              title="Open platform walkthrough guide"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Hub Guide</span>
            </button>
            <Link
              href="/"
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Switch Student</span>
            </Link>
          </div>
        </div>

        {/* Cancelled Lessons Notice Banner (if any) */}
        {cancelledSessions.filter((s) => !dismissedCancelledIds.includes(s.id)).length > 0 && (
          <div className="space-y-2">
            {cancelledSessions
              .filter((s) => !dismissedCancelledIds.includes(s.id))
              .map((session) => (
                <div
                  key={session.id}
                  className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 shadow-sm flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold">
                      <XCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-rose-800 dark:text-rose-300">
                          Lesson Cancelled by Tutor: {session.title || "Maths Lesson"}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {new Date(session.scheduledStartTime).toLocaleDateString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          at{" "}
                          {new Date(session.scheduledStartTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {session.notes && (
                        <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                          Reason: {session.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDismissedCancelledIds((prev) => [...prev, session.id])}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer shrink-0"
                    title="Dismiss cancellation notice"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* Live Lesson Section */}
        {activeSession ? (
          <div className="space-y-3">
            {/* Top Toolbar: All study tabs strictly on ONE line */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
                <button
                  type="button"
                  data-tour="student-exams"
                  onClick={() => setIsExamCountdownOpen(true)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                  title="Open Official GCSE & A-Level Maths Exam Countdown & Timetables"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Exam Countdown</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsResourcesOpen(true)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                  title="Open Shared Resources & Revision Library"
                >
                  <BookOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Shared Resources</span>
                </button>
                <button
                  type="button"
                  data-tour="student-formulas"
                  onClick={() => setIsFormulaSheetOpen(true)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                  title="Open GCSE & A-Level Maths Formula Sheet"
                >
                  <FileText className="w-3.5 h-3.5 text-[#48A5EE]" />
                  <span>Formula Sheet</span>
                </button>
                <button
                  type="button"
                  data-tour="student-calculator"
                  onClick={() => setIsCalculatorOpen(true)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                  title="Open Casio fx-83GTX Scientific Calculator"
                >
                  <Calculator className="w-3.5 h-3.5 text-[#48A5EE]" />
                  <span>Casio fx-83GTX</span>
                </button>
                <div data-tour="student-calendar" className="shrink-0">
                  <AddToCalendar session={activeSession} label="Add to Personal Calendar" />
                </div>
              </div>

              {/* Scheduled date/time tag on far right */}
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold shrink-0 ml-auto whitespace-nowrap">
                <Calendar className="w-3.5 h-3.5 text-[#48A5EE]" />
                <span>
                  {new Date(activeSession.scheduledStartTime).toLocaleDateString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(activeSession.scheduledStartTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
            </div>

            {/* 2-Column Responsive Dashboard Grid (Fits comfortably without scrolling!) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
              {/* Left Column (7 cols): Live Countdown Timer & InPrivate Teams Meeting Room */}
              <div data-tour="student-teams-card" className="lg:col-span-7 space-y-3.5">
                <CountdownTimer
                  initialSession={activeSession}
                  onStatusChange={(updated) => {
                    setActiveSession(updated);
                    if (currentUser?.id) {
                      loadStudentSessions(currentUser.id);
                    }
                  }}
                />

                <TeamsLauncher
                  meetingUrl={activeSession.teamsMeetingUrl}
                  isUnlocked={isMeetingUnlocked}
                  sessionTitle={activeSession.title}
                  tutorName={formatTutorName(activeSession.tutor?.name || "Tutor")}
                  unlockEarlyMinutes={unlockEarlyMinutes}
                />

                {/* Status if Lesson Completed */}
                {activeSession.status === "COMPLETED" && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-sm space-y-1.5 transition-colors">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Lesson Completed</span>
                    </span>
                    {activeSession.feedbackCovered && (
                      <p className="text-xs text-slate-700 dark:text-slate-200">
                        <strong>Covered:</strong> {activeSession.feedbackCovered}
                      </p>
                    )}
                    {activeSession.feedbackNotes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        <strong>Tutor Notes:</strong> {activeSession.feedbackNotes}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column (5 cols): What to Cover Today, Tutor Contact, & Upcoming Lessons */}
              <div className="lg:col-span-5 space-y-3.5">
                {/* Topic for Today's Lesson */}
                {(activeSession.status === "SCHEDULED" ||
                  activeSession.status === "DELAYED" ||
                  activeSession.status === "IN_PROGRESS") && (
                  <div data-tour="student-topic-box" className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-[#48A5EE]/10 text-[#48A5EE] flex items-center justify-center shrink-0">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          What would you like to cover today?
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Your tutor sees this instantly.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        id="student-topic-input"
                        type="text"
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveTopic()}
                        placeholder="e.g. Quadratics, Past paper Q5..."
                        maxLength={300}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-[#48A5EE] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleSaveTopic}
                        disabled={isSavingTopic}
                        className="px-3 py-1.5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {topicSaved ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Saved!</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3" />
                            <span>{isSavingTopic ? "..." : "Save"}</span>
                          </>
                        )}
                      </button>
                    </div>
                    {activeSession.studentTopic && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-0.5">
                        Current:{" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {activeSession.studentTopic}
                        </span>
                      </p>
                    )}

                    {/* Previous Lesson Extra Notes & Homework Label */}
                    {previousLessonNotes && (
                      <div className="mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2 text-xs">
                        <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-bold text-purple-800 dark:text-purple-300">
                            Previous lesson extra notes &amp; homework:
                          </span>
                          <p className="text-slate-700 dark:text-slate-300 text-xs">
                            {previousLessonNotes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tutor Contact Info & Email */}
                {activeSession.tutor && (
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#48A5EE]/10 text-[#48A5EE] flex items-center justify-center font-bold shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          Tutor: {formatTutorName(activeSession.tutor.name)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {getTutorEmail(activeSession.tutor.name)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`mailto:${getTutorEmail(activeSession.tutor.name)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] font-bold text-xs transition-colors"
                        title="Email tutor"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(getTutorEmail(activeSession.tutor?.name));
                          setCopiedTutorEmail(true);
                          setTimeout(() => setCopiedTutorEmail(false), 2000);
                        }}
                        className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Copy email"
                      >
                        {copiedTutorEmail ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Lesson Notes & Reschedule Reason (if present) */}
                {activeSession.notes && (
                  <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 space-y-1 shadow-sm transition-colors text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
                      <Info className="w-3.5 h-3.5 text-[#48A5EE]" />
                      <span>Note from Tutor:</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 leading-snug pl-5">
                      {activeSession.notes}
                    </p>
                  </div>
                )}

                {/* Other Upcoming Lessons in Right Column */}
                {upcomingSessions.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#48A5EE]" />
                        <span>Upcoming Lessons ({upcomingSessions.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCalendarSubOpen(true)}
                        className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Sync</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {upcomingSessions.map((session) => (
                        <div
                          key={session.id}
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                              {session.title}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {new Date(session.scheduledStartTime).toLocaleDateString([], {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              &bull;{" "}
                              {new Date(session.scheduledStartTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <AddToCalendar session={session} compact />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-4 shadow-sm transition-colors">
            <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
              <Calendar className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                No Lesson Scheduled Right Now
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                When your tutor books your next maths session, the countdown and meeting room will appear here automatically.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-1">
              <button
                type="button"
                onClick={() => setIsExamCountdownOpen(true)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Exam Countdown</span>
              </button>
              <button
                type="button"
                onClick={() => setIsResourcesOpen(true)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Shared Resources</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFormulaSheetOpen(true)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5 text-[#48A5EE]" />
                <span>Formula Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCalculatorOpen(true)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <Calculator className="w-3.5 h-3.5 text-[#48A5EE]" />
                <span>Casio fx-83GTX</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCalendarSubOpen(true)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#48A5EE] bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 border border-[#48A5EE]/30 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync to Calendar</span>
              </button>
            </div>

            {/* Upcoming sessions if any */}
            {upcomingSessions.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-left space-y-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Future Scheduled Lessons ({upcomingSessions.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {upcomingSessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{s.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
                        </p>
                      </div>
                      <AddToCalendar session={s} compact />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Official Maths Exam Countdown Modal */}
      <ExamCountdownModal
        isOpen={isExamCountdownOpen}
        onClose={() => setIsExamCountdownOpen(false)}
        studentName={currentUser?.name}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onOpenFormulaSheet={() => setIsFormulaSheetOpen(true)}
        onOpenResources={() => setIsResourcesOpen(true)}
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

      {/* Live Calendar Subscription Modal */}
      <CalendarSubscriptionModal
        isOpen={isCalendarSubOpen}
        onClose={() => setIsCalendarSubOpen(false)}
        title="My Maths Lessons Calendar"
        subtitle="Subscribe your phone, tablet, or computer to your maths lessons. Any timetable changes or rescheduled lessons update automatically."
        magicKey={magicKey || currentUser?.magicKey}
      />

      {/* Shared Resources & Revision Library Modal */}
      <SharedResourcesModal
        isOpen={isResourcesOpen}
        onClose={() => setIsResourcesOpen(false)}
        currentUser={{
          id: currentUser?.id || "",
          name: currentUser?.name || "Student",
          role: "TUTEE",
          magicKey: magicKey || currentUser?.magicKey,
        }}
      />

      <Footer />
    </div>
  );
}

export default function StudentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b1120] text-slate-500 text-xs">
          Loading student room...
        </div>
      }
    >
      <StudentLobbyContent />
    </Suspense>
  );
}
