"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/navbar";
import ChangePasswordModal from "@/components/change-password-modal";
import {
  Calendar,
  Users,
  Key,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  History,
  Lock,
  UserPlus,
  CalendarPlus,
  Play,
  Video,
  Save,
  CheckCircle2,
  Sparkles,
  UserCheck,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  Star,
  DollarSign,
  Archive,
  BookOpen,
  Trash2,
  Bell,
} from "lucide-react";
import { playSessionStartChime, playDelayAlertChime } from "@/lib/audio-cues";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"lessons" | "students" | "tutors" | "audit">("lessons");

  const [sessions, setSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, filter, and sort state for lessons
  const [lessonSearchTerm, setLessonSearchTerm] = useState("");
  const [lessonTutorFilter, setLessonTutorFilter] = useState("ALL");
  const [lessonStudentFilter, setLessonStudentFilter] = useState("ALL");
  const [lessonSortBy, setLessonSortBy] = useState<"soonest" | "newest" | "oldest" | "student" | "tutor" | "rating">("soonest");

  // Live / Next Lesson Quick Controls
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [teamsUrlInput, setTeamsUrlInput] = useState("");
  const [isUpdatingTeams, setIsUpdatingTeams] = useState(false);
  const [teamsSuccess, setTeamsSuccess] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // New Lesson Modal State (NO lesson topic input!)
  const [isNewLessonOpen, setIsNewLessonOpen] = useState(false);
  const [selectedTutorId, setSelectedTutorId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [teamsUrl, setTeamsUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [newLessonAdminReminder, setNewLessonAdminReminder] = useState("");
  const [conflictError, setConflictError] = useState("");
  const [isSubmittingLesson, setIsSubmittingLesson] = useState(false);

  // Edit Admin Personal Reminder Modal State
  const [reminderModalSession, setReminderModalSession] = useState<any>(null);
  const [editReminderText, setEditReminderText] = useState("");
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  // New User Modal State (Student or Tutor)
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"TUTOR" | "TUTEE">("TUTEE");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserPin, setNewUserPin] = useState("");
  const [newUserAssignedTutorId, setNewUserAssignedTutorId] = useState("");
  const [userError, setUserError] = useState("");
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Reassign Tutor Modal State
  const [reassignModalStudent, setReassignModalStudent] = useState<any>(null);
  const [newAssignedTutorId, setNewAssignedTutorId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);

  // Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Copied Key state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    initAdminData();
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const initAdminData = async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }

      const meData = await meRes.json();
      if (meData.user.role !== "HEAD_TUTOR") {
        // If regular tutor, redirect to tutor dashboard
        router.push("/tutor");
        return;
      }

      setCurrentUser(meData.user);
      await refreshAllData();
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = async () => {
    try {
      const [sessRes, usersRes, auditRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/admin/users"),
        fetch("/api/admin/audit-logs"),
      ]);

      if (sessRes.ok) {
        const d = await sessRes.json();
        const list: any[] = d.sessions || [];
        setSessions(list);

        const now = Date.now();
        const current =
          list.find(
            (s) =>
              s.status === "IN_PROGRESS" &&
              new Date(s.scheduledEndTime).getTime() > now - 2 * 3600 * 1000
          ) ||
          list.find(
            (s) =>
              (s.status === "SCHEDULED" || s.status === "DELAYED") &&
              new Date(s.scheduledEndTime).getTime() > now
          );

        if (current) {
          setActiveLesson(current);
          setTeamsUrlInput(current.teamsMeetingUrl || "");
        } else {
          setActiveLesson(null);
        }
      }
      if (usersRes.ok) {
        const d = await usersRes.json();
        const allUsers: any[] = d.users || [];
        setStudents(allUsers.filter((u) => u.role === "TUTEE"));
        setTutors(allUsers.filter((u) => u.role === "TUTOR" || u.role === "HEAD_TUTOR"));
      }
      if (auditRes.ok) {
        const d = await auditRes.json();
        setAuditLogs(d.auditLogs || []);
      }
    } catch {}
  };

  // Toggle Tutor Paid Status
  const handleToggleTutorPaid = async (session: any) => {
    try {
      const nextPaid = !session.tutorPaid;
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorPaid: nextPaid }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(nextPaid ? `Lesson marked as PAID.` : `Lesson marked as NOT PAID.`);
        await refreshAllData();
        setTimeout(() => setActionMessage(""), 4000);
      } else {
        alert(data.error || "Failed to update payment status");
      }
    } catch {
      alert("Network error");
    }
  };

  // Delete Lesson Handler
  const handleDeleteSession = async (sessionId: string, title?: string) => {
    if (!confirm(`Are you sure you want to delete ${title || "this lesson"}? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setActionMessage("Lesson deleted successfully.");
        await refreshAllData();
        setTimeout(() => setActionMessage(""), 4000);
      } else {
        alert(data.error || "Failed to delete lesson.");
      }
    } catch {
      alert("Network error deleting lesson.");
    }
  };

  // Delete Student Handler
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete student "${studentName}"? This will permanently remove all their scheduled lessons.`)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${studentId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Student "${studentName}" deleted successfully.`);
        await refreshAllData();
        setTimeout(() => setActionMessage(""), 4000);
      } else {
        alert(data.error || "Failed to delete student.");
      }
    } catch {
      alert("Network error deleting student.");
    }
  };

  // Delete Tutor Handler
  const handleDeleteTutor = async (tutorId: string, tutorName: string) => {
    if (!confirm(`Are you sure you want to delete tutor "${tutorName}"? Any assigned students will have their tutor unassigned.`)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${tutorId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Tutor "${tutorName}" deleted successfully.`);
        await refreshAllData();
        setTimeout(() => setActionMessage(""), 4000);
      } else {
        alert(data.error || "Failed to delete tutor.");
      }
    } catch {
      alert("Network error deleting tutor.");
    }
  };

  // Clear All Audit Logs Handler
  const handleClearAuditLogs = async () => {
    if (!confirm("Are you sure you want to clear ALL activity logs? This will wipe the audit trail.")) return;

    try {
      const res = await fetch("/api/admin/audit-logs", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setActionMessage("All activity logs cleared.");
        await refreshAllData();
        setTimeout(() => setActionMessage(""), 4000);
      } else {
        alert(data.error || "Failed to clear logs.");
      }
    } catch {
      alert("Network error clearing logs.");
    }
  };

  // When student is selected in Schedule Modal, auto-select their normal assigned tutor
  const handleStudentSelectInModal = (stId: string) => {
    setSelectedStudentId(stId);
    const st = students.find((s) => s.id === stId);
    if (st && st.assignedTutorId) {
      setSelectedTutorId(st.assignedTutorId);
    } else if (currentUser) {
      setSelectedTutorId(currentUser.id);
    }
  };

  // Toggle Tutor or Student Confirmation
  const handleToggleConfirmation = async (sessionId: string, type: "tutor" | "tutee", currentValue: boolean) => {
    const field = type === "tutor" ? "tutorConfirmed" : "tuteeConfirmed";
    const nextValue = !currentValue;
    // Optimistic update
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, [field]: nextValue } : s))
    );
    if (activeLesson?.id === sessionId) {
      setActiveLesson((prev: any) => (prev ? { ...prev, [field]: nextValue } : null));
    }
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: nextValue }),
      });
      if (!res.ok) {
        await refreshAllData();
      } else {
        setActionMessage(
          `${type === "tutor" ? "Tutor" : "Student"} marked as ${nextValue ? "CONFIRMED ✓" : "PENDING"}.`
        );
        setTimeout(() => setActionMessage(""), 3000);
      }
    } catch {
      await refreshAllData();
    }
  };

  // Save/Update Admin Personal Reminder
  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderModalSession) return;
    setIsSavingReminder(true);
    try {
      const res = await fetch(`/api/sessions/${reminderModalSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminReminder: editReminderText.trim() || null }),
      });
      if (res.ok) {
        setActionMessage("Personal reminder updated!");
        setReminderModalSession(null);
        await refreshAllData();
        setTimeout(() => setActionMessage(""), 3000);
      } else {
        alert("Failed to update reminder.");
      }
    } catch {
      alert("Network error updating reminder.");
    } finally {
      setIsSavingReminder(false);
    }
  };

  // Schedule Lesson (Conflict Engine) - NO lesson topic entry!
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError("");
    setIsSubmittingLesson(true);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: selectedTutorId || currentUser.id,
          tuteeId: selectedStudentId,
          scheduledStartTime: new Date(startTime).toISOString(),
          scheduledEndTime: new Date(endTime).toISOString(),
          teamsMeetingUrl: teamsUrl || undefined,
          notes: notes || undefined,
          adminReminder: newLessonAdminReminder.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setConflictError(data.error || "Failed to schedule lesson.");
        return;
      }

      setIsNewLessonOpen(false);
      setSelectedStudentId("");
      setSelectedTutorId("");
      setStartTime("");
      setEndTime("");
      setTeamsUrl("");
      setNotes("");
      setNewLessonAdminReminder("");
      await refreshAllData();
      setActionMessage("Lesson scheduled successfully!");
      setTimeout(() => setActionMessage(""), 4000);
    } catch {
      setConflictError("Network error. Please try again.");
    } finally {
      setIsSubmittingLesson(false);
    }
  };

  // Add Student or Tutor
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError("");
    setIsSubmittingUser(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserRole === "TUTOR" ? newUserEmail : undefined,
          role: newUserRole,
          password: newUserRole === "TUTOR" ? newUserPassword : undefined,
          pin: newUserRole === "TUTEE" ? newUserPin : undefined,
          assignedTutorId: newUserRole === "TUTEE" ? newUserAssignedTutorId || null : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUserError(data.error || "Failed to create user.");
        return;
      }

      setIsNewUserOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserPin("");
      setNewUserAssignedTutorId("");
      await refreshAllData();
      setActionMessage(`${newUserRole === "TUTOR" ? "Tutor" : "Student"} ${data.user.name} created!`);
      setTimeout(() => setActionMessage(""), 4000);
    } catch {
      setUserError("Network error.");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Permanent Tutor Reassignment
  const handleReassignTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModalStudent) return;
    setIsReassigning(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: reassignModalStudent.id,
          assignedTutorId: newAssignedTutorId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to reassign tutor.");
        return;
      }

      setReassignModalStudent(null);
      await refreshAllData();
      setActionMessage(`Assigned tutor updated for ${data.student?.name}!`);
      setTimeout(() => setActionMessage(""), 4000);
    } catch {
      alert("Network error.");
    } finally {
      setIsReassigning(false);
    }
  };

  // Save Teams URL
  const handleSaveTeamsUrl = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (!res.ok) {
        alert(data.error || "Invalid Teams link");
        return;
      }
      setTeamsSuccess("Teams link saved!");
      setActiveLesson(data.session);
      await refreshAllData();
      setTimeout(() => setTeamsSuccess(""), 4000);
    } catch {
      alert("Network error.");
    } finally {
      setIsUpdatingTeams(false);
    }
  };

  // Start Now
  const handleStartNow = async () => {
    if (!activeLesson) return;
    try {
      const res = await fetch(`/api/sessions/${activeLesson.id}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to start lesson.");
        return;
      }
      playSessionStartChime();
      setActionMessage("Lesson is now LIVE!");
      setActiveLesson(data.session);
      await refreshAllData();
      setTimeout(() => setActionMessage(""), 4000);
    } catch {
      alert("Network error.");
    }
  };

  // Delay Lesson
  const handleDelay = async (minutes: number) => {
    if (!activeLesson) return;
    try {
      const res = await fetch(`/api/sessions/${activeLesson.id}/delay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delayMinutes: minutes }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delay lesson.");
        return;
      }
      playDelayAlertChime();
      setActionMessage(`Lesson delayed by ${minutes}m.`);
      setActiveLesson(data.session);
      await refreshAllData();
      setTimeout(() => setActionMessage(""), 4000);
    } catch {
      alert("Network error.");
    }
  };

  // Mark Completed
  const handleComplete = async () => {
    if (!activeLesson) return;
    if (!confirm("Are you sure you want to mark this lesson as completed?")) return;
    try {
      const res = await fetch(`/api/sessions/${activeLesson.id}/complete`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to complete lesson.");
        return;
      }
      setActionMessage("Lesson marked as completed.");
      await refreshAllData();
      setTimeout(() => setActionMessage(""), 4000);
    } catch {
      alert("Network error.");
    }
  };

  const copyMagicLink = async (key?: string | null) => {
    if (!key) return;
    const url = `${window.location.origin}/student?key=${key}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b1120]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
          Loading Admin Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b1120] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#48A5EE]">
              Admin Hub
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">
              LB Maths Tuition Dashboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Schedule lessons, manage students &amp; PINs, and assign tutors
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsNewLessonOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Schedule Lesson</span>
            </button>

            <button
              onClick={() => {
                setNewUserRole("TUTEE");
                setIsNewUserOpen(true);
              }}
              className="py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#48A5EE]" />
              <span>Add Student</span>
            </button>

            <button
              onClick={() => {
                setNewUserRole("TUTOR");
                setIsNewUserOpen(true);
              }}
              className="py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-4 h-4 text-[#48A5EE]" />
              <span>Add Tutor</span>
            </button>
          </div>
        </div>

        {/* Action toast */}
        {actionMessage && (
          <div className="p-3.5 rounded-2xl bg-[#48A5EE]/10 border border-[#48A5EE]/30 text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#48A5EE]" />
              <span>{actionMessage}</span>
            </div>
            <button
              onClick={() => setActionMessage("")}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* NEXT / ACTIVE SCHEDULED MEETING DECK (With visible PIN and Magic Link) */}
        {activeLesson && (
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 border-2 border-[#48A5EE]/40 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      activeLesson.status === "IN_PROGRESS"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : activeLesson.status === "DELAYED"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-[#48A5EE]/15 text-[#48A5EE]"
                    }`}
                  >
                    ● {activeLesson.status}
                  </span>
                  {activeLesson.delayMinutes > 0 && (
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                      (+{activeLesson.delayMinutes}m delay)
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {activeLesson.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tutor: <strong className="text-slate-700 dark:text-slate-200">{activeLesson.tutor?.name}</strong> &bull;{" "}
                  {new Date(activeLesson.scheduledStartTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  –{" "}
                  {new Date(activeLesson.scheduledEndTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                {/* VISIBLE STUDENT PIN & MAGIC LINK FOR THIS SCHEDULED MEETING */}
                <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">
                    Student: <strong className="text-slate-800 dark:text-slate-100">{activeLesson.tutee?.name}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px]">
                    PIN: {activeLesson.tutee?.pin || "----"}
                  </span>
                  <button
                    onClick={() => copyMagicLink(activeLesson.tutee?.magicKey)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    {copiedKey === activeLesson.tutee?.magicKey ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Magic Link</span>
                      </>
                    )}
                  </button>
                </div>

                {/* PERSONAL REMINDER & ATTENDANCE CONFIRMATION TOGGLES */}
                <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {/* Reminder Badge/Button */}
                  {activeLesson.adminReminder ? (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                      <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-semibold">Reminder: {activeLesson.adminReminder}</span>
                      <button
                        onClick={() => {
                          setReminderModalSession(activeLesson);
                          setEditReminderText(activeLesson.adminReminder || "");
                        }}
                        className="ml-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 underline hover:text-amber-900 cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setReminderModalSession(activeLesson);
                        setEditReminderText("");
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <Bell className="w-3.5 h-3.5 text-[#48A5EE]" />
                      <span>+ Add Reminder</span>
                    </button>
                  )}

                  {/* Tutor Confirmation Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleConfirmation(activeLesson.id, "tutor", Boolean(activeLesson.tutorConfirmed))}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      activeLesson.tutorConfirmed
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                    title="Click to toggle Tutor Confirmation"
                  >
                    {activeLesson.tutorConfirmed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Tutor: Confirmed ✓</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Tutor: Pending</span>
                      </>
                    )}
                  </button>

                  {/* Student Confirmation Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleConfirmation(activeLesson.id, "tutee", Boolean(activeLesson.tuteeConfirmed))}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      activeLesson.tuteeConfirmed
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                    title="Click to toggle Student Confirmation"
                  >
                    {activeLesson.tuteeConfirmed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Student: Confirmed ✓</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Student: Pending</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {activeLesson.status !== "IN_PROGRESS" && (
                  <>
                    <button
                      onClick={handleStartNow}
                      className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Start Lesson Now</span>
                    </button>

                    <button
                      onClick={() => handleDelay(5)}
                      className="py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-semibold text-xs border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                    >
                      +5m Delay
                    </button>
                    <button
                      onClick={() => handleDelay(10)}
                      className="py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-semibold text-xs border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                    >
                      +10m Delay
                    </button>
                  </>
                )}

                <button
                  onClick={handleComplete}
                  className="py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                  <span>Mark Done</span>
                </button>
              </div>
            </div>

            {/* Quick Teams Link input */}
            <form onSubmit={handleSaveTeamsUrl} className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-[#48A5EE]" />
                  <span>Teams Meeting Link (Enter ~10 mins before start):</span>
                </span>
                {teamsSuccess && (
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{teamsSuccess}</span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://teams.microsoft.com/l/meetup-join/..."
                  value={teamsUrlInput}
                  onChange={(e) => setTeamsUrlInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                />
                <button
                  type="submit"
                  disabled={isUpdatingTeams}
                  className="py-2 px-4 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1" />
                  <span>Save Link</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("lessons")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "lessons"
                ? "bg-[#48A5EE] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Lessons ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "students"
                ? "bg-[#48A5EE] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Students &amp; PINs ({students.length})
          </button>
          <button
            onClick={() => setActiveTab("tutors")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "tutors"
                ? "bg-[#48A5EE] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Tutors ({tutors.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "audit"
                ? "bg-[#48A5EE] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Activity Logs ({auditLogs.length})
          </button>
        </div>

        {/* TAB 1: ALL LESSONS BREAKDOWN (Upcoming, Completed Unpaid, Archived Paid) */}
        {activeTab === "lessons" && (() => {
          const nowMs = currentTime;

          // Filter by search term, tutor, and student
          const filtered = sessions.filter((s) => {
            if (lessonTutorFilter !== "ALL" && s.tutorId !== lessonTutorFilter) return false;
            if (lessonStudentFilter !== "ALL" && s.tuteeId !== lessonStudentFilter) return false;
            if (lessonSearchTerm.trim()) {
              const q = lessonSearchTerm.toLowerCase();
              const stName = (s.tutee?.name || "").toLowerCase();
              const tuName = (s.tutor?.name || "").toLowerCase();
              const title = (s.title || "").toLowerCase();
              const covered = (s.feedbackCovered || "").toLowerCase();
              if (!stName.includes(q) && !tuName.includes(q) && !title.includes(q) && !covered.includes(q)) {
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
              if (lessonSortBy === "tutor") {
                return (a.tutor?.name || "").localeCompare(b.tutor?.name || "");
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

          return (
            <div className="space-y-6">
              {/* Search, Filter & Sort Toolbar */}
              <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search by student, tutor, or topics covered..."
                      value={lessonSearchTerm}
                      onChange={(e) => setLessonSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-[#48A5EE]"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Tutor Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      <Filter className="w-3.5 h-3.5 text-[#48A5EE]" />
                      <select
                        value={lessonTutorFilter}
                        onChange={(e) => setLessonTutorFilter(e.target.value)}
                        className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">All Tutors</option>
                        {tutors.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Student Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      <Users className="w-3.5 h-3.5 text-[#48A5EE]" />
                      <select
                        value={lessonStudentFilter}
                        onChange={(e) => setLessonStudentFilter(e.target.value)}
                        className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">All Students</option>
                        {students.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
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
                        <option value="tutor">Tutor (A-Z)</option>
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
                    Pending Tutor Payout: {completedUnpaidList.length}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                    Archived &amp; Paid: {archivedPaidList.length}
                  </span>
                </div>
              </div>

              {/* 1. UPCOMING LESSONS (Shown at top) */}
              <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm space-y-3">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#48A5EE]" />
                      <span>Upcoming Lessons</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Future scheduled or in-progress lessons. Older finished lessons move automatically below.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#48A5EE]/15 text-[#48A5EE] text-xs font-bold">
                    {upcomingList.length} Scheduled
                  </span>
                </div>

                {upcomingList.length === 0 ? (
                  <div className="text-center py-10 px-4 space-y-2">
                    <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Upcoming Lessons</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Click &quot;Schedule Lesson&quot; above to book a new session.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="px-5 py-3.5">Student &amp; Lesson</th>
                          <th className="px-5 py-3.5">Tutor Assigned</th>
                          <th className="px-5 py-3.5">Date &amp; Time</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-5 py-3.5">Confirmations (Tutor / Student)</th>
                          <th className="px-5 py-3.5">PIN &amp; Magic Link</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
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
                              {/* Personal Admin Reminder */}
                              {s.adminReminder ? (
                                <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px]">
                                  <Bell className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span className="font-semibold truncate max-w-[200px]" title={s.adminReminder}>
                                    {s.adminReminder}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setReminderModalSession(s);
                                      setEditReminderText(s.adminReminder || "");
                                    }}
                                    className="text-[10px] text-amber-700 dark:text-amber-300 underline hover:text-amber-900 cursor-pointer font-bold"
                                    title="Edit Reminder"
                                  >
                                    Edit
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setReminderModalSession(s);
                                    setEditReminderText("");
                                  }}
                                  className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-[#48A5EE] transition-colors cursor-pointer"
                                  title="Add personal reminder for this lesson"
                                >
                                  <Bell className="w-2.5 h-2.5" />
                                  <span>+ Reminder</span>
                                </button>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-medium">
                              {s.tutor?.name}
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
                            </td>
                            <td className="px-5 py-3.5">
                              {/* Confirmation Toggles */}
                              <div className="flex flex-col gap-1.5 min-w-[130px]">
                                <button
                                  type="button"
                                  onClick={() => handleToggleConfirmation(s.id, "tutor", Boolean(s.tutorConfirmed))}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center justify-between gap-1.5 transition-all cursor-pointer border ${
                                    s.tutorConfirmed
                                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                                  }`}
                                  title="Click to toggle Tutor Confirmation"
                                >
                                  <span className="flex items-center gap-1">
                                    {s.tutorConfirmed ? (
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                      <Clock className="w-3 h-3 text-slate-400" />
                                    )}
                                    <span>Tutor</span>
                                  </span>
                                  <span>{s.tutorConfirmed ? "Confirmed ✓" : "Pending"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleConfirmation(s.id, "tutee", Boolean(s.tuteeConfirmed))}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center justify-between gap-1.5 transition-all cursor-pointer border ${
                                    s.tuteeConfirmed
                                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                                  }`}
                                  title="Click to toggle Student Confirmation"
                                >
                                  <span className="flex items-center gap-1">
                                    {s.tuteeConfirmed ? (
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                      <Clock className="w-3 h-3 text-slate-400" />
                                    )}
                                    <span>Student</span>
                                  </span>
                                  <span>{s.tuteeConfirmed ? "Confirmed ✓" : "Pending"}</span>
                                </button>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px]">
                                  PIN: {s.tutee?.pin || "----"}
                                </span>
                                <button
                                  onClick={() => copyMagicLink(s.tutee?.magicKey)}
                                  className="px-2 py-0.5 rounded-lg bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] font-bold text-[11px] transition-colors cursor-pointer"
                                  title="Copy Magic Link"
                                >
                                  {copiedKey === s.tutee?.magicKey ? "Copied!" : "Copy Link"}
                                </button>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-right flex items-center justify-end gap-2">
                              {s.teamsMeetingUrl && (
                                <a
                                  href={s.teamsMeetingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#48A5EE] font-semibold hover:underline mr-1"
                                >
                                  Teams
                                </a>
                              )}
                              <button
                                onClick={() => handleDeleteSession(s.id, s.title)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                title="Delete Lesson"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 2. COMPLETED (TUTOR NOT PAID) */}
              <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-amber-200 dark:border-amber-800/80 overflow-hidden shadow-sm space-y-3">
                <div className="p-5 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Completed Lessons &bull; Tutor Not Paid ({completedUnpaidList.length})</span>
                    </h3>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                      These lessons have completed or passed. Review what was covered, the student rating, and toggle to Paid once settled.
                    </p>
                  </div>
                </div>

                {completedUnpaidList.length === 0 ? (
                  <div className="text-center py-10 px-4 space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">All Payouts Settled!</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      There are currently no completed lessons awaiting tutor payment.
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
                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                              Tutor: <strong>{s.tutor?.name}</strong>
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
                              Tutor Not Paid
                            </span>

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.tutorConfirmed ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            }`}>
                              Tutor: {s.tutorConfirmed ? "Confirmed ✓" : "Pending"}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.tuteeConfirmed ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            }`}>
                              Student: {s.tuteeConfirmed ? "Confirmed ✓" : "Pending"}
                            </span>

                            {s.adminReminder && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[10px] font-semibold">
                                <Bell className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                <span>Reminder: {s.adminReminder}</span>
                              </span>
                            )}
                          </div>

                          {/* What was covered by tutor */}
                          {s.feedbackCovered ? (
                            <div className="text-xs bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                              <span className="font-bold text-[#48A5EE] mr-1">Reported by Tutor ({s.tutor?.name || "Tutor"}):</span>
                              <span>{s.feedbackCovered}</span>
                              {s.feedbackNotes && (
                                <p className="text-slate-500 dark:text-slate-400 mt-1 italic">
                                  Notes: &quot;{s.feedbackNotes}&quot;
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              Lesson report pending from tutor.
                            </p>
                          )}
                        </div>

                        {/* Mark Paid Toggle & Delete */}
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => handleToggleTutorPaid(s)}
                            className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Mark as Paid</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSession(s.id, s.title)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Delete Lesson"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. ARCHIVED (TUTOR PAID) */}
              <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm space-y-3">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Archive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Archived Lessons &bull; Tutor Paid ({archivedPaidList.length})</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Historical completed lessons where tutor payout has been marked as settled.
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
                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                              Tutor: <strong>{s.tutor?.name}</strong>
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

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.tutorConfirmed ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            }`}>
                              Tutor: {s.tutorConfirmed ? "Confirmed ✓" : "Pending"}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.tuteeConfirmed ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            }`}>
                              Student: {s.tuteeConfirmed ? "Confirmed ✓" : "Pending"}
                            </span>

                            {s.adminReminder && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[10px] font-semibold">
                                <Bell className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                <span>Reminder: {s.adminReminder}</span>
                              </span>
                            )}
                          </div>

                          {s.feedbackCovered && (
                            <div className="text-xs bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                              <span className="font-bold text-[#48A5EE] mr-1">Reported by Tutor ({s.tutor?.name || "Tutor"}):</span>
                              <span>{s.feedbackCovered}</span>
                              {s.feedbackNotes && (
                                <p className="text-slate-500 dark:text-slate-400 mt-0.5 italic">
                                  Notes: &quot;{s.feedbackNotes}&quot;
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Revert to Unpaid & Delete */}
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => handleToggleTutorPaid(s)}
                            className="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                            title="Revert to Unpaid"
                          >
                            Mark as Unpaid
                          </button>
                          <button
                            onClick={() => handleDeleteSession(s.id, s.title)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Delete Lesson"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* TAB 2: STUDENTS, ASSIGNED TUTORS & MAGIC LINKS */}
        {activeTab === "students" && (
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {students.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Students Yet</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click &quot;Add Student&quot; above to create students and assign them to a tutor.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Student Name</th>
                      <th className="px-5 py-3.5">Normal Assigned Tutor</th>
                      <th className="px-5 py-3.5">Secret PIN</th>
                      <th className="px-5 py-3.5">Magic Link</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {students.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                        <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-100">
                          {st.name}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                              {st.assignedTutor?.name || "Unassigned"}
                            </span>
                            <button
                              onClick={() => {
                                setReassignModalStudent(st);
                                setNewAssignedTutorId(st.assignedTutorId || "");
                              }}
                              className="text-[10px] text-[#48A5EE] hover:underline font-semibold cursor-pointer"
                            >
                              (Change)
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-700">
                            {st.pin || "----"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] text-[#48A5EE]">
                          /student?key={st.magicKey}
                        </td>
                        <td className="px-5 py-3.5 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => copyMagicLink(st.magicKey)}
                            className="inline-flex items-center gap-1.5 py-1 px-3 rounded-lg bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] text-xs font-bold transition-colors cursor-pointer"
                          >
                            {copiedKey === st.magicKey ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(st.id, st.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TUTORS */}
        {activeTab === "tutors" && (
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Tutor Name</th>
                    <th className="px-5 py-3.5">Email / Handle</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Assigned Students</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tutors.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-100">
                        {t.name}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono">
                        {t.email}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#48A5EE]/10 text-[#48A5EE]">
                          {t.role === "HEAD_TUTOR" ? "Admin" : "Tutor"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        {t.assignedStudents?.length || 0} student(s)
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {t.role !== "HEAD_TUTOR" && t.id !== currentUser?.id ? (
                          <button
                            onClick={() => handleDeleteTutor(t.id, t.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Delete Tutor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Primary Admin</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === "audit" && (
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm space-y-3">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-[#48A5EE]" />
                  <span>Activity Logs ({auditLogs.length})</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Full security and action audit trail for scheduling, links, logins, and completions.
                </p>
              </div>

              {auditLogs.length > 0 && (
                <button
                  onClick={handleClearAuditLogs}
                  className="px-3.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-bold text-xs border border-red-200 dark:border-red-800 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Logs</span>
                </button>
              )}
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                No activity logs recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Time</th>
                      <th className="px-5 py-3.5">Action</th>
                      <th className="px-5 py-3.5">Actor</th>
                      <th className="px-5 py-3.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-300 font-sans font-medium">
                          {log.actor?.name}
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400 font-sans">
                          {log.details || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* SCHEDULE LESSON MODAL (NO LESSON TOPIC INPUT!) */}
      {isNewLessonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Schedule Lesson</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select the student and tutor. The conflict engine checks availability in real time.
            </p>

            {conflictError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{conflictError}</span>
              </div>
            )}

            <form onSubmit={handleCreateLesson} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Select Student *
                  </label>
                  <select
                    required
                    value={selectedStudentId}
                    onChange={(e) => handleStudentSelectInModal(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                  >
                    <option value="">Choose student</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} {st.assignedTutor ? `(Tutor: ${st.assignedTutor.name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Assign Tutor *
                  </label>
                  <select
                    required
                    value={selectedTutorId}
                    onChange={(e) => setSelectedTutorId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                  >
                    <option value="">Choose tutor</option>
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Teams Meeting URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://teams.microsoft.com/l/meetup-join/..."
                  value={teamsUrl}
                  onChange={(e) => setTeamsUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions for student or tutor..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 mb-1">
                  <Bell className="w-3.5 h-3.5 text-[#48A5EE]" />
                  <span>Personal Admin Reminder (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bring test paper, check homework completion..."
                  value={newLessonAdminReminder}
                  onChange={(e) => setNewLessonAdminReminder(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewLessonOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLesson}
                  className="px-4 py-2 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingLesson ? "Checking..." : "Schedule Lesson"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL (Student or Tutor) */}
      {isNewUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {newUserRole === "TUTOR" ? "Add New Tutor" : "Add New Student"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {newUserRole === "TUTOR"
                ? "Create a login profile for an additional tutor."
                : "Students get an auto-generated 4-digit PIN and can be assigned to a tutor."}
            </p>

            {userError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
                {userError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder={newUserRole === "TUTOR" ? "e.g. Sarah Jenkins" : "e.g. Samuel Green"}
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                />
              </div>

              {newUserRole === "TUTOR" ? (
                <>
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={5}
                      placeholder="Minimum 5 characters"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Assign Normal Tutor
                    </label>
                    <select
                      value={newUserAssignedTutorId}
                      onChange={(e) => setNewUserAssignedTutorId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                    >
                      <option value="">Unassigned</option>
                      {tutors.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.role === "HEAD_TUTOR" ? "Admin" : "Tutor"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Custom 4-Digit PIN (Leave blank to auto-generate)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 4821"
                      value={newUserPin}
                      onChange={(e) => setNewUserPin(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewUserOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-4 py-2 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingUser ? "Creating..." : newUserRole === "TUTOR" ? "Add Tutor" : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERMANENT REASSIGN TUTOR MODAL */}
      {reassignModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Reassign Tutor for {reassignModalStudent.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Change this student&apos;s default assigned tutor permanently.
            </p>

            <form onSubmit={handleReassignTutor} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Assigned Tutor
                </label>
                <select
                  value={newAssignedTutorId}
                  onChange={(e) => setNewAssignedTutorId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                >
                  <option value="">Unassigned</option>
                  {tutors.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.role === "HEAD_TUTOR" ? "Admin" : "Tutor"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignModalStudent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReassigning}
                  className="px-4 py-2 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isReassigning ? "Saving..." : "Save Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PERSONAL REMINDER MODAL */}
      {reminderModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                <Bell className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Personal Lesson Reminder
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Private to you (Admin). Not visible to students or tutors.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              Lesson: <strong>{reminderModalSession.title}</strong> &bull; Student: <strong>{reminderModalSession.tutee?.name}</strong>
            </p>

            <form onSubmit={handleSaveReminder} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Reminder Note
                </label>
                <textarea
                  rows={3}
                  value={editReminderText}
                  onChange={(e) => setEditReminderText(e.target.value)}
                  placeholder="e.g. Call parent about mock exam results, bring trigonometry worksheet, verify deposit..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE] resize-none"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                {reminderModalSession.adminReminder ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setEditReminderText("");
                      setIsSavingReminder(true);
                      try {
                        const res = await fetch(`/api/sessions/${reminderModalSession.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ adminReminder: null }),
                        });
                        if (res.ok) {
                          setActionMessage("Reminder cleared.");
                          setReminderModalSession(null);
                          await refreshAllData();
                          setTimeout(() => setActionMessage(""), 3000);
                        }
                      } finally {
                        setIsSavingReminder(false);
                      }
                    }}
                    className="text-xs text-rose-500 hover:underline cursor-pointer"
                  >
                    Clear Reminder
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReminderModalSession(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingReminder}
                    className="px-4 py-2 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingReminder ? "Saving..." : "Save Reminder"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
