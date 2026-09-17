"use client";

import React, { useState, useEffect, Suspense } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { formatTutorName } from "@/lib/format";
import FormulaSheetModal from "@/components/formula-sheet-modal";

function StudentLobbyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const magicKey = searchParams.get("key");

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  // Formula Sheet modal & copy tutor email state
  const [isFormulaSheetOpen, setIsFormulaSheetOpen] = useState(false);
  const [copiedTutorEmail, setCopiedTutorEmail] = useState(false);

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
          setCurrentUser(data.student);
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
      } catch {}

      // If neither magicKey nor auth session exists, redirect to home for PIN entry
      router.push("/");
      setLoading(false);
    }

    init();
  }, [magicKey, router]);

  const loadStudentSessions = async (tuteeId: string) => {
    try {
      const res = await fetch(`/api/sessions?tuteeId=${tuteeId}`);
      if (!res.ok) return;
      const data = await res.json();
      const sessions: any[] = data.sessions || [];

      const now = Date.now();
      const live =
        sessions.find(
          (s) =>
            s.status === "IN_PROGRESS" &&
            new Date(s.scheduledEndTime).getTime() > now - 2 * 3600 * 1000
        ) ||
        sessions.find(
          (s) =>
            (s.status === "DELAYED" || s.status === "SCHEDULED") &&
            new Date(s.scheduledEndTime).getTime() > now
        );
      setActiveSession(live || null);
      setUpcomingSessions(
        sessions.filter(
          (s) =>
            s.id !== live?.id &&
            s.status !== "COMPLETED" &&
            s.status !== "CANCELLED" &&
            new Date(s.scheduledEndTime).getTime() > now
        )
      );
    } catch {}
  };

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

  const fiveMinutesBefore = activeSession
    ? new Date(activeSession.scheduledStartTime).getTime() - 5 * 60 * 1000
    : 0;

  const isMeetingUnlocked =
    activeSession?.status === "IN_PROGRESS" ||
    (activeSession && Date.now() >= fiveMinutesBefore && activeSession.status !== "COMPLETED");

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b1120] transition-colors duration-200">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Student Room Verified</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100">
              Welcome, {currentUser?.name || "Student"}!
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your live lesson lobby. The countdown and Teams room update in real time.
            </p>
          </div>

          <Link
            href="/"
            className="self-start sm:self-auto text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Switch Student</span>
          </Link>
        </div>

        {/* Live Lesson Section */}
        {activeSession ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#48A5EE]" />
                <span>
                  Lesson Scheduled for{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {new Date(activeSession.scheduledStartTime).toLocaleDateString([], {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </strong>{" "}
                  at{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {new Date(activeSession.scheduledStartTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                </span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormulaSheetOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 shadow-xs transition-colors cursor-pointer"
                  title="Open GCSE & A-Level Maths Formula Sheet"
                >
                  <Calculator className="w-3.5 h-3.5 text-[#48A5EE]" />
                  <span>Formula Sheet</span>
                </button>
                <AddToCalendar session={activeSession} />
              </div>
            </div>

            {/* Countdown Box */}
            <CountdownTimer
              initialSession={activeSession}
              onStatusChange={(updated) => setActiveSession(updated)}
            />

            {/* InPrivate Teams Launcher */}
            <TeamsLauncher
              meetingUrl={activeSession.teamsMeetingUrl}
              isUnlocked={isMeetingUnlocked}
              sessionTitle={activeSession.title}
              tutorName={formatTutorName(activeSession.tutor?.name || "Tutor")}
            />

            {/* Tutor Contact Info & Email */}
            {activeSession.tutor && (
              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-[#48A5EE]/10 text-[#48A5EE] flex items-center justify-center font-bold">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span>Tutor: {formatTutorName(activeSession.tutor.name)}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                        LB Maths Tuition
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Need to get in touch before your lesson? Email your tutor directly.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <a
                    href={`mailto:${getTutorEmail(activeSession.tutor.name)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] font-bold text-xs transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{getTutorEmail(activeSession.tutor.name)}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(getTutorEmail(activeSession.tutor?.name));
                      setCopiedTutorEmail(true);
                      setTimeout(() => setCopiedTutorEmail(false), 2000);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Copy tutor email"
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

            {/* Status if Lesson Completed */}
            {activeSession.status === "COMPLETED" && (
              <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-sm space-y-2 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Lesson Completed</span>
                  </span>
                </div>
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

            {/* Lesson Notes & Preparation */}
            {activeSession.notes && (
              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm transition-colors">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <FileText className="w-4 h-4 text-[#48A5EE]" />
                  <span>Lesson Prep &amp; Notes from Tutor</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {activeSession.notes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm transition-colors">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
              <Calendar className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              No Lesson Scheduled Right Now
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              When your tutor books your next maths session, the countdown and meeting room will appear here automatically.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsFormulaSheetOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] text-xs font-bold transition-colors cursor-pointer"
              >
                <Calculator className="w-4 h-4" />
                <span>Open Maths Formula Sheet</span>
              </button>
            </div>
          </div>
        )}

        {/* Other Upcoming Lessons */}
        {upcomingSessions.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#48A5EE]" />
              <span>Upcoming Maths Lessons</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{session.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                      {new Date(session.scheduledStartTime).toLocaleDateString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Tutor: {formatTutorName(session.tutor?.name || "Tutor")}</span>
                    <a
                      href={`mailto:${getTutorEmail(session.tutor?.name)}`}
                      className="text-[#48A5EE] hover:underline text-[11px] font-semibold"
                    >
                      {getTutorEmail(session.tutor?.name)}
                    </a>
                  </div>
                  <div className="pt-1 flex justify-end">
                    <AddToCalendar session={session} compact />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Maths Formula Sheet Modal */}
      <FormulaSheetModal
        isOpen={isFormulaSheetOpen}
        onClose={() => setIsFormulaSheetOpen(false)}
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
