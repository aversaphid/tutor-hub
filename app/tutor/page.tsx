"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/navbar";
import ChangePasswordModal from "@/components/change-password-modal";
import TutorCompletionModal from "@/components/tutor-completion-modal";
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
} from "lucide-react";
import { playSessionStartChime, playDelayAlertChime } from "@/lib/audio-cues";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TutorDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"active" | "students" | "lessons">("active");

  const [assignedStudents, setAssignedStudents] = useState<any[]>([]);
  const [mySessions, setMySessions] = useState<any[]>([]);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Quick Controls
  const [teamsUrlInput, setTeamsUrlInput] = useState("");
  const [isUpdatingTeams, setIsUpdatingTeams] = useState(false);
  const [teamsSuccess, setTeamsSuccess] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Copied Key State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Tutor Completion Modal
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [sessionToComplete, setSessionToComplete] = useState<any>(null);

  // Lesson Search, Filter & Sort
  const [lessonSearchTerm, setLessonSearchTerm] = useState("");
  const [lessonStudentFilter, setLessonStudentFilter] = useState("ALL");
  const [lessonSortBy, setLessonSortBy] = useState<
    "soonest" | "newest" | "oldest" | "student" | "rating"
  >("soonest");
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    initTutorData();
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

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
        loadLiveSession(),
      ]);
    } catch (err) {
      console.error("Tutor init error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedStudents = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) return;
      const data = await res.json();
      setAssignedStudents(data.users || []);
    } catch (err) {
      console.error("Error loading assigned students:", err);
    }
  };

  const loadMySessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) return;
      const data = await res.json();
      setMySessions(data.sessions || []);
    } catch (err) {
      console.error("Error loading sessions:", err);
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
        const now = Date.now();
        const fallbackActive = mySessions.find(
          (s) =>
            s.status === "IN_PROGRESS" &&
            new Date(s.scheduledEndTime).getTime() > now - 2 * 3600 * 1000
        );
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
    } catch {}
  };

  const handleCopyPin = async (key: string, pin: string) => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
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

  const handleStartLessonNow = async () => {
    if (!activeLesson) return;
    try {
      const res = await fetch(`/api/sessions/${activeLesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });

      if (res.ok) {
        playSessionStartChime();
        setActionMessage("Lesson started early! Chime played.");
        loadLiveSession();
        loadMySessions();
        setTimeout(() => setActionMessage(""), 4000);
      }
    } catch {}
  };

  const handleDelayLesson = async (mins: number) => {
    if (!activeLesson) return;
    try {
      const res = await fetch(`/api/sessions/${activeLesson.id}/delay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delayMinutes: mins }),
      });

      if (res.ok) {
        playDelayAlertChime();
        setActionMessage(`Delayed by ${mins} minutes. Student notification updated.`);
        loadLiveSession();
        loadMySessions();
        setTimeout(() => setActionMessage(""), 4000);
      }
    } catch {}
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
    } catch {}
  };

  const handleConfirmTutorAttendance = async (sessionId: string) => {
    // Optimistic update
    setMySessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, tutorConfirmed: true } : s))
    );
    if (activeLesson?.id === sessionId) {
      setActiveLesson((prev: any) => (prev ? { ...prev, tutorConfirmed: true } : null));
    }
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorConfirmed: true }),
      });
      if (res.ok) {
        setActionMessage("Attendance confirmed!");
        setTimeout(() => setActionMessage(""), 3000);
      } else {
        await loadMySessions();
      }
    } catch {
      await loadMySessions();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b1120] transition-colors duration-200">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
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
              Welcome, {currentUser?.name || "Tutor"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage your assigned students, launch Teams sessions, and view student PINs &amp; magic links.
            </p>
          </div>

          <div className="flex items-center gap-2">
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
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "active"
                ? "bg-[#48A5EE] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Next Meeting &amp; Live Deck</span>
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "students"
                ? "bg-[#48A5EE] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>My Assigned Students ({assignedStudents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("lessons")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "lessons"
                ? "bg-[#48A5EE] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>My Scheduled Lessons ({mySessions.length})</span>
          </button>
        </div>

        {/* TAB 1: NEXT MEETING & LIVE CONTROLS */}
        {activeTab === "active" && (
          <div className="space-y-6">
            {activeLesson ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-6 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          activeLesson.status === "IN_PROGRESS"
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                            : activeLesson.status === "DELAYED"
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                            : "bg-[#48A5EE]/10 text-[#48A5EE] dark:bg-[#48A5EE]/20"
                        }`}
                      >
                        ● {activeLesson.status === "IN_PROGRESS" ? "Live Now" : activeLesson.status}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
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
                  </div>

                  {/* VISIBLE PIN & MAGIC LINK FOR NEXT MEETING */}
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <Key className="w-3.5 h-3.5 text-[#48A5EE]" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">PIN:</span>
                      <strong className="text-xs font-mono font-extrabold text-slate-800 dark:text-slate-100">
                        {activeLesson.tutee?.pin || "----"}
                      </strong>
                    </div>

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

                  {/* Tutor Attendance Confirmation */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    {activeLesson.tutorConfirmed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Your Attendance: Confirmed ✓</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConfirmTutorAttendance(activeLesson.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Your Attendance</span>
                      </button>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Student: <strong className="text-slate-700 dark:text-slate-200">{activeLesson.tuteeConfirmed ? "Confirmed ✓" : "Pending"}</strong>
                    </span>
                  </div>
                </div>

                {/* Teams Meeting URL Setup (~10 minutes before) */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-[#48A5EE]" />
                      <span>Teams Meeting Link (Enter ~10m before lesson)</span>
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
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {activeLesson.status !== "IN_PROGRESS" && (
                    <>
                      <button
                        onClick={handleStartLessonNow}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Start Lesson Now (Play Chime)</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelayLesson(5)}
                          className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold transition-all cursor-pointer"
                        >
                          +5m Delay
                        </button>
                        <button
                          onClick={() => handleDelayLesson(10)}
                          className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold transition-all cursor-pointer"
                        >
                          +10m Delay
                        </button>
                      </div>
                    </>
                  )}

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
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Students Assigned to You
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You can see your assigned students&apos; PINs and copy their direct magic access links.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#48A5EE]/10 text-[#48A5EE]">
                {assignedStudents.length} Students
              </span>
            </div>

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
                {assignedStudents.map((student) => (
                  <div
                    key={student.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {student.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        {student.email ? <span>{student.email}</span> : <span>Student Profile</span>}
                        <span>•</span>
                        <span className="text-[#48A5EE] font-medium">Assigned to You</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
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
                ))}
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
                  </div>
                </div>

                {/* Status Summary Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="px-3 py-1 rounded-xl bg-[#48A5EE]/10 text-[#48A5EE] font-bold">
                    Upcoming: {upcomingList.length}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                    Awaiting Payment: {completedUnpaidList.length}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                    Paid &amp; Archived: {archivedPaidList.length}
                  </span>
                </div>
              </div>

              {/* 1. UPCOMING LESSONS (Shown at top) */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm space-y-3 transition-colors">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#48A5EE]" />
                      <span>Upcoming Lessons</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Future scheduled or in-progress lessons. Past lessons automatically move to Completed below.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#48A5EE]/15 text-[#48A5EE] text-xs font-bold">
                    {upcomingList.length} Scheduled
                  </span>
                </div>

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
                          <th className="px-5 py-3.5">Student &amp; Lesson</th>
                          <th className="px-5 py-3.5">Date &amp; Time</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-5 py-3.5">PIN &amp; Magic Link</th>
                          <th className="px-5 py-3.5 text-right">Teams Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {upcomingList.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-slate-800 dark:text-slate-100">
                                {s.tutee?.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {s.title}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                              {new Date(s.scheduledStartTime).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              &bull;{" "}
                              {new Date(s.scheduledStartTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col gap-1 items-start">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    s.status === "IN_PROGRESS"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                      : s.status === "DELAYED"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                      : "bg-[#48A5EE]/15 text-[#48A5EE]"
                                  }`}
                                >
                                  {s.status}
                                </span>
                                {s.tutorConfirmed ? (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Confirmed
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleConfirmTutorAttendance(s.id)}
                                    className="text-[10px] font-bold text-[#48A5EE] hover:underline cursor-pointer"
                                  >
                                    Confirm attendance
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px]">
                                  PIN: {s.tutee?.pin || "----"}
                                </span>
                                <button
                                  onClick={() => handleCopyLink(`sess-${s.id}`, s.tutee?.magicKey)}
                                  className="px-2 py-0.5 rounded-lg bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] font-bold text-[11px] transition-colors cursor-pointer"
                                  title="Copy Magic Link"
                                >
                                  {copiedKey === `sess-${s.id}` ? "Copied!" : "Copy Link"}
                                </button>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-right flex items-center justify-end gap-2">
                              {s.teamsMeetingUrl ? (
                                <a
                                  href={s.teamsMeetingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#48A5EE] font-semibold hover:underline inline-flex items-center gap-1"
                                >
                                  <span>Teams</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-slate-400 italic">Not set</span>
                              )}
                              <button
                                onClick={() => {
                                  setSessionToComplete(s);
                                  setIsCompletionModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer"
                                title="Complete Lesson & Submit Report"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Complete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 2. COMPLETED (AWAITING PAYMENT) */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-amber-200 dark:border-amber-800/80 overflow-hidden shadow-sm space-y-3 transition-colors">
                <div className="p-5 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Completed Lessons &bull; Payment Pending ({completedUnpaidList.length})</span>
                    </h3>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                      Finished sessions with student feedback and ratings. The admin will mark these as paid once processed.
                    </p>
                  </div>
                </div>

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
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              Lesson report pending.
                            </p>
                          )}
                        </div>

                        {/* Edit Report Button (Available until marked as paid by admin) */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setSessionToComplete(s);
                              setIsCompletionModalOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#48A5EE] text-slate-700 dark:text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm cursor-pointer"
                            title="Edit Covered Topics, Rating & Notes"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Report</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. ARCHIVED (PAID) */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm space-y-3 transition-colors">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Archive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Archived Lessons &bull; Paid ({archivedPaidList.length})</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Settled lessons marked as paid by the admin.
                    </p>
                  </div>
                </div>

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
            </div>
          );
        })()}
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
    </div>
  );
}
