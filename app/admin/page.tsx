"use client";

import React, { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ChangePasswordModal from "@/components/change-password-modal";
import AddToCalendar from "@/components/add-to-calendar";
import { exportSessionsToCSV } from "@/lib/csv-export";
import { downloadMultiEventICS, CalendarEvent } from "@/lib/calendar";
import FormulaSheetModal from "@/components/formula-sheet-modal";
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
  Settings,
  Download,
  Repeat,
  Calculator,
  X,
  CalendarClock,
  XCircle,
  ChevronDown,
  GraduationCap,
  Edit3,
} from "lucide-react";
import RescheduleModal from "@/components/reschedule-modal";
import CancelLessonModal from "@/components/cancel-lesson-modal";
import DelayReasonModal from "@/components/delay-reason-modal";
import SharedResourcesHub from "@/components/shared-resources-hub";
import UserWeeklyCalendarModal from "@/components/user-weekly-calendar-modal";
import { playSessionStartChime, playDelayAlertChime } from "@/lib/audio-cues";
import { formatTutorName, formatCurrency, TIME_OPTIONS_5MIN, addMinutesToTime } from "@/lib/format";
import TimeSelect from "@/components/time-select";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"lessons" | "students" | "tutors" | "resources" | "audit" | "settings">("lessons");

  const [sessions, setSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active-only users for selection combo lists
  const activeStudents = useMemo(() => students.filter((s) => s.active !== false), [students]);
  const activeTutors = useMemo(() => tutors.filter((t) => t.active !== false), [tutors]);

  // System Settings state
  const [subwaySurfersEnabled, setSubwaySurfersEnabled] = useState(true);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  // Search, filter, and sort state for lessons
  const [lessonSearchTerm, setLessonSearchTerm] = useState("");
  const [lessonTutorFilter, setLessonTutorFilter] = useState("ALL");
  const [lessonStudentFilter, setLessonStudentFilter] = useState("ALL");
  const [lessonSortBy, setLessonSortBy] = useState<"soonest" | "newest" | "oldest" | "student" | "tutor" | "rating">("soonest");

  // Search, filter, and sort state for Students directory
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [studentTutorFilter, setStudentTutorFilter] = useState("ALL");
  const [studentLessonFilter, setStudentLessonFilter] = useState<"ALL" | "HAS_UPCOMING" | "NO_UPCOMING">("ALL");
  const [studentSortBy, setStudentSortBy] = useState<"name_asc" | "name_desc" | "tutor" | "newest">("name_asc");

  // Search, filter, and sort state for Tutors directory
  const [tutorSearchTerm, setTutorSearchTerm] = useState("");
  const [tutorStudentFilter, setTutorStudentFilter] = useState("ALL");
  const [tutorRoleFilter, setTutorRoleFilter] = useState<"ALL" | "HEAD_TUTOR" | "TUTOR">("ALL");
  const [tutorSortBy, setTutorSortBy] = useState<"name_asc" | "name_desc" | "students_count" | "newest">("name_asc");

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
  const [lessonDate, setLessonDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [lessonStartTime, setLessonStartTime] = useState("10:00");
  const [lessonEndTime, setLessonEndTime] = useState("11:00");
  const [teamsUrl, setTeamsUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [newLessonAdminReminder, setNewLessonAdminReminder] = useState("");
  const [conflictError, setConflictError] = useState("");
  const [isSubmittingLesson, setIsSubmittingLesson] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(4);
  const [repeatIntervalWeeks, setRepeatIntervalWeeks] = useState(1);

  // Edit Admin Personal Reminder Modal State
  const [reminderModalSession, setReminderModalSession] = useState<any>(null);
  const [editReminderText, setEditReminderText] = useState("");
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  // Delay Reason Modal
  const [delayModal, setDelayModal] = useState<{
    isOpen: boolean;
    minutes: number;
    studentName?: string;
  }>({
    isOpen: false,
    minutes: 5,
  });
  const [isSubmittingDelay, setIsSubmittingDelay] = useState(false);

  // New User Modal State (Student or Tutor)
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"TUTOR" | "TUTEE">("TUTEE");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserPin, setNewUserPin] = useState("");
  const [newUserAssignedTutorId, setNewUserAssignedTutorId] = useState("");
  const [newUserStudentPay, setNewUserStudentPay] = useState("");
  const [newUserTutorPay, setNewUserTutorPay] = useState("");
  const [userError, setUserError] = useState("");
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Edit Student Modal State
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);
  const [editStudentTarget, setEditStudentTarget] = useState<any>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentAssignedTutorId, setEditStudentAssignedTutorId] = useState("");
  const [editStudentStudentPay, setEditStudentStudentPay] = useState("");
  const [editStudentTutorPay, setEditStudentTutorPay] = useState("");
  const [editStudentPin, setEditStudentPin] = useState("");
  const [editStudentActive, setEditStudentActive] = useState(true);
  const [isSubmittingEditStudent, setIsSubmittingEditStudent] = useState(false);
  const [editStudentError, setEditStudentError] = useState("");

  // Weekly Calendar Modal State
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarModalUser, setCalendarModalUser] = useState<any>(null);

  // Batch Archive by Date Range State
  const [isBatchArchiveOpen, setIsBatchArchiveOpen] = useState(false);
  const [batchArchiveStartDate, setBatchArchiveStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [batchArchiveEndDate, setBatchArchiveEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [isBatchArchiving, setIsBatchArchiving] = useState(false);
  const [batchArchiveMessage, setBatchArchiveMessage] = useState("");

  // Reassign Tutor Modal State
  const [reassignModalStudent, setReassignModalStudent] = useState<any>(null);
  const [newAssignedTutorId, setNewAssignedTutorId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);

  // Password Modal for current admin
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Set User Password Modal State (Admin can set/override passwords for any user/tutor)
  const [passwordModalUser, setPasswordModalUser] = useState<any>(null);
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [passwordModalError, setPasswordModalError] = useState("");
  const [passwordModalSuccess, setPasswordModalSuccess] = useState("");
  const [isSubmittingAdminPassword, setIsSubmittingAdminPassword] = useState(false);

  // Settings Tab: Change Own Admin Password
  const [adminSelfCurrentPassword, setAdminSelfCurrentPassword] = useState("");
  const [adminSelfNewPassword, setAdminSelfNewPassword] = useState("");
  const [adminSelfConfirmPassword, setAdminSelfConfirmPassword] = useState("");
  const [adminSelfPasswordError, setAdminSelfPasswordError] = useState("");
  const [adminSelfPasswordSuccess, setAdminSelfPasswordSuccess] = useState("");
  const [isSubmittingAdminSelfPassword, setIsSubmittingAdminSelfPassword] = useState(false);

  // Settings Tab: Set Tutor Password
  const [settingsSelectedTutorId, setSettingsSelectedTutorId] = useState("");
  const [settingsTutorNewPassword, setSettingsTutorNewPassword] = useState("");
  const [settingsTutorConfirmPassword, setSettingsTutorConfirmPassword] = useState("");
  const [settingsTutorPasswordError, setSettingsTutorPasswordError] = useState("");
  const [settingsTutorPasswordSuccess, setSettingsTutorPasswordSuccess] = useState("");
  const [isSubmittingSettingsTutorPassword, setIsSubmittingSettingsTutorPassword] = useState(false);

  // Copied Key state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Complete / Review Lesson Modal State
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completeTargetLesson, setCompleteTargetLesson] = useState<any>(null);
  const [completeRating, setCompleteRating] = useState<number>(5);
  const [completeCovered, setCompleteCovered] = useState<string>("");
  const [completeNotes, setCompleteNotes] = useState<string>("");
  const [isSubmittingComplete, setIsSubmittingComplete] = useState<boolean>(false);

  // Formula sheet modal state
  const [isFormulaSheetOpen, setIsFormulaSheetOpen] = useState(false);

  // Reschedule Modal state
  const [rescheduleTargetLesson, setRescheduleTargetLesson] = useState<any>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  // Cancel Lesson Modal state
  const [cancelTargetLesson, setCancelTargetLesson] = useState<any>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Collapsible Lesson Sections state (Upcoming expanded by default, others collapsed)
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(true);
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [isCancelledOpen, setIsCancelledOpen] = useState(false);
  const [isArchivedOpen, setIsArchivedOpen] = useState(false);

  useEffect(() => {
    initAdminData();
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);

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
      const [sessRes, usersRes, auditRes, settingsRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/admin/users"),
        fetch("/api/admin/audit-logs"),
        fetch("/api/admin/settings"),
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
      if (settingsRes.ok) {
        const d = await settingsRes.json();
        if (typeof d.subwaySurfersEnabled === "boolean") {
          setSubwaySurfersEnabled(d.subwaySurfersEnabled);
        }
      }
    } catch {}
  };

  const handleToggleSubwaySurfers = async (enabled: boolean) => {
    setIsUpdatingSettings(true);
    setSettingsMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subwaySurfersEnabled: enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubwaySurfersEnabled(data.subwaySurfersEnabled);
        setSettingsMessage(
          data.subwaySurfersEnabled
            ? "Subway Surfers easter egg enabled across the platform."
            : "Subway Surfers easter egg completely hidden from the platform."
        );
        // Broadcast to local window for instantaneous update
        window.dispatchEvent(
          new CustomEvent("th_settings_updated", {
            detail: { subwaySurfersEnabled: data.subwaySurfersEnabled },
          })
        );
      } else {
        setSettingsMessage("Failed to update settings. Please try again.");
      }
    } catch {
      setSettingsMessage("Network error updating settings.");
    } finally {
      setIsUpdatingSettings(false);
    }
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

  // Set User Password (Admin directly sets/overrides passwords, cannot view them)
  const handleAdminSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    if (!adminNewPassword || adminNewPassword.length < 5) {
      setPasswordModalError("Password must be at least 5 characters.");
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      setPasswordModalError("Passwords do not match.");
      return;
    }

    setIsSubmittingAdminPassword(true);
    setPasswordModalError("");
    setPasswordModalSuccess("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: passwordModalUser.id,
          newPassword: adminNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordModalError(data.error || "Failed to update password.");
        return;
      }

      setPasswordModalSuccess(`Password successfully updated for ${formatTutorName(passwordModalUser.name)}!`);
      setTimeout(() => {
        setPasswordModalUser(null);
        setAdminNewPassword("");
        setAdminConfirmPassword("");
        setPasswordModalSuccess("");
      }, 1500);
    } catch {
      setPasswordModalError("An unexpected network error occurred.");
    } finally {
      setIsSubmittingAdminPassword(false);
    }
  };

  // Change Own Admin Password from Settings Tab
  const handleAdminChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSelfPasswordError("");
    setAdminSelfPasswordSuccess("");

    if (!adminSelfCurrentPassword) {
      setAdminSelfPasswordError("Current password is required.");
      return;
    }
    if (adminSelfNewPassword.length < 5) {
      setAdminSelfPasswordError("New password must be at least 5 characters.");
      return;
    }
    if (adminSelfNewPassword !== adminSelfConfirmPassword) {
      setAdminSelfPasswordError("New passwords do not match.");
      return;
    }

    setIsSubmittingAdminSelfPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: adminSelfCurrentPassword,
          newPassword: adminSelfNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminSelfPasswordError(data.error || "Failed to update password.");
        return;
      }
      setAdminSelfPasswordSuccess("Your admin password has been updated successfully!");
      setAdminSelfCurrentPassword("");
      setAdminSelfNewPassword("");
      setAdminSelfConfirmPassword("");
    } catch {
      setAdminSelfPasswordError("Network error. Please try again.");
    } finally {
      setIsSubmittingAdminSelfPassword(false);
    }
  };

  // Set Tutor Password from Settings Tab
  const handleSettingsSetTutorPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsTutorPasswordError("");
    setSettingsTutorPasswordSuccess("");

    if (!settingsSelectedTutorId) {
      setSettingsTutorPasswordError("Please select a tutor account.");
      return;
    }
    if (settingsTutorNewPassword.length < 5) {
      setSettingsTutorPasswordError("New password must be at least 5 characters.");
      return;
    }
    if (settingsTutorNewPassword !== settingsTutorConfirmPassword) {
      setSettingsTutorPasswordError("Passwords do not match.");
      return;
    }

    const selectedTutor = tutors.find((t) => t.id === settingsSelectedTutorId);
    setIsSubmittingSettingsTutorPassword(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: settingsSelectedTutorId,
          newPassword: settingsTutorNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsTutorPasswordError(data.error || "Failed to update password.");
        return;
      }
      setSettingsTutorPasswordSuccess(
        `Password successfully set for ${formatTutorName(selectedTutor?.name || "tutor")}!`
      );
      setSettingsTutorNewPassword("");
      setSettingsTutorConfirmPassword("");
    } catch {
      setSettingsTutorPasswordError("Network error. Please try again.");
    } finally {
      setIsSubmittingSettingsTutorPassword(false);
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

  // Schedule Same Time Next Week (+7 days) or Biweekly (+14 days)
  const handleScheduleSameTimeNextWeek = (session: any, weeksAhead = 1) => {
    setSelectedStudentId(session.tuteeId || session.tutee?.id || "");
    setSelectedTutorId(session.tutorId || session.tutor?.id || "");
    const origStart = new Date(session.scheduledStartTime);
    const origEnd = new Date(session.scheduledEndTime);
    const nextStart = new Date(origStart.getTime() + weeksAhead * 7 * 24 * 3600 * 1000);
    const nextEnd = new Date(origEnd.getTime() + weeksAhead * 7 * 24 * 3600 * 1000);

    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${nextStart.getFullYear()}-${pad(nextStart.getMonth() + 1)}-${pad(nextStart.getDate())}`;
    const startMin = Math.floor(nextStart.getMinutes() / 5) * 5;
    const endMin = Math.floor(nextEnd.getMinutes() / 5) * 5;
    const startStr = `${pad(nextStart.getHours())}:${pad(startMin)}`;
    const endStr = `${pad(nextEnd.getHours())}:${pad(endMin)}`;

    setLessonDate(dateStr);
    setLessonStartTime(startStr);
    setLessonEndTime(endStr);
    setTeamsUrl(session.teamsMeetingUrl || "");
    setNotes(session.notes || "");
    setNewLessonAdminReminder(session.adminReminder || "");
    setIsRepeating(false);
    setRepeatWeeks(1);
    setRepeatIntervalWeeks(weeksAhead);
    setConflictError("");
    setIsNewLessonOpen(true);
  };

  // Schedule Lesson (Conflict Engine) - Supports bulk recurring weekly or biweekly!
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError("");

    if (!lessonDate || !lessonStartTime || !lessonEndTime) {
      setConflictError("Please select date, start time, and end time.");
      return;
    }
    if (lessonStartTime >= lessonEndTime) {
      setConflictError("End time must be after start time.");
      return;
    }

    setIsSubmittingLesson(true);

    try {
      const startIso = new Date(`${lessonDate}T${lessonStartTime}:00`).toISOString();
      const endIso = new Date(`${lessonDate}T${lessonEndTime}:00`).toISOString();

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: selectedTutorId || currentUser.id,
          tuteeId: selectedStudentId,
          scheduledStartTime: startIso,
          scheduledEndTime: endIso,
          teamsMeetingUrl: teamsUrl || undefined,
          notes: notes || undefined,
          adminReminder: newLessonAdminReminder.trim() || undefined,
          repeatWeeks: isRepeating ? repeatWeeks : 1,
          repeatIntervalWeeks: isRepeating ? repeatIntervalWeeks : 1,
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
      setLessonDate(new Date().toISOString().split("T")[0]);
      setLessonStartTime("10:00");
      setLessonEndTime("11:00");
      setTeamsUrl("");
      setNotes("");
      setNewLessonAdminReminder("");
      setIsRepeating(false);
      setRepeatWeeks(4);
      setRepeatIntervalWeeks(1);
      await refreshAllData();
      setActionMessage(data.message || "Lesson scheduled successfully!");
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

    if (newUserRole === "TUTEE" && newUserStudentPay && newUserTutorPay) {
      const sPay = parseFloat(newUserStudentPay);
      const tPay = parseFloat(newUserTutorPay);
      if (sPay < tPay) {
        setUserError("Student fee cannot be less than tutor pay.");
        return;
      }
    }

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
          studentPay: newUserRole === "TUTEE" && newUserStudentPay ? parseFloat(newUserStudentPay) : undefined,
          tutorPay: newUserRole === "TUTEE" && newUserTutorPay ? parseFloat(newUserTutorPay) : undefined,
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
      setNewUserStudentPay("");
      setNewUserTutorPay("");
      await refreshAllData();
      setActionMessage(`${newUserRole === "TUTOR" ? "Tutor" : "Student"} ${data.user.name} created!`);
      setTimeout(() => setActionMessage(""), 4000);
    } catch {
      setUserError("Network error.");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Open Edit Student Modal
  const handleOpenEditStudent = (student: any) => {
    setEditStudentTarget(student);
    setEditStudentName(student.name || "");
    setEditStudentAssignedTutorId(student.assignedTutorId || "");
    setEditStudentStudentPay(
      student.studentPay !== null && student.studentPay !== undefined
        ? String(student.studentPay)
        : ""
    );
    setEditStudentTutorPay(
      student.tutorPay !== null && student.tutorPay !== undefined
        ? String(student.tutorPay)
        : ""
    );
    setEditStudentPin(student.pin || "");
    setEditStudentActive(student.active !== false);
    setEditStudentError("");
    setIsEditStudentOpen(true);
  };

  // Toggle User Active Status (Student or Tutor)
  const handleToggleUserActive = async (userId: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, active: !currentActive }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshAllData();
        setActionMessage(data.message || "User active status updated!");
        setTimeout(() => setActionMessage(""), 4000);
      } else {
        alert(data.error || "Failed to update user status.");
      }
    } catch {
      alert("Network error updating user status.");
    }
  };

  // Save Edit Student
  const handleSaveEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudentTarget) return;
    setEditStudentError("");

    if (editStudentStudentPay && editStudentTutorPay) {
      const sPay = parseFloat(editStudentStudentPay);
      const tPay = parseFloat(editStudentTutorPay);
      if (sPay < tPay) {
        setEditStudentError("Student fee cannot be less than tutor pay.");
        return;
      }
    }

    setIsSubmittingEditStudent(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: editStudentTarget.id,
          name: editStudentName.trim() || undefined,
          assignedTutorId: editStudentAssignedTutorId || null,
          studentPay: editStudentStudentPay ? parseFloat(editStudentStudentPay) : null,
          tutorPay: editStudentTutorPay ? parseFloat(editStudentTutorPay) : null,
          pin: editStudentPin.trim() || undefined,
          active: editStudentActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditStudentError(data.error || "Failed to update student.");
        return;
      }

      setIsEditStudentOpen(false);
      await refreshAllData();
      setActionMessage(`Student "${data.student?.name || editStudentName}" updated successfully!`);
      setTimeout(() => setActionMessage(""), 4000);
    } catch {
      setEditStudentError("Network error updating student.");
    } finally {
      setIsSubmittingEditStudent(false);
    }
  };

  // Open Weekly Calendar for Student or Tutor
  const handleOpenCalendar = (user: any) => {
    setCalendarModalUser(user);
    setIsCalendarModalOpen(true);
  };

  // Batch Archive by Date Range Handler
  const handleBatchArchive = async () => {
    if (!batchArchiveStartDate || !batchArchiveEndDate) {
      alert("Please select both a start and end date.");
      return;
    }

    const start = new Date(batchArchiveStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(batchArchiveEndDate);
    end.setHours(23, 59, 59, 999);

    if (end < start) {
      alert("End date must be after start date.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to move all completed unpaid lessons between ${start.toLocaleDateString()} and ${end.toLocaleDateString()} to Archived (Marked as Paid)?`
      )
    ) {
      return;
    }

    setIsBatchArchiving(true);
    setBatchArchiveMessage("");

    try {
      const res = await fetch("/api/sessions/batch-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || "Lessons moved to Archived successfully!");
        setBatchArchiveMessage(data.message);
        await refreshAllData();
        setTimeout(() => {
          setActionMessage("");
          setBatchArchiveMessage("");
        }, 5000);
      } else {
        alert(data.error || "Failed to batch archive lessons.");
      }
    } catch {
      alert("Network error executing batch archive.");
    } finally {
      setIsBatchArchiving(false);
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

  // Delay Lesson Handlers
  const handleOpenDelayModal = (minutes: number) => {
    if (!activeLesson) return;
    setDelayModal({
      isOpen: true,
      minutes,
      studentName: activeLesson?.tutee?.name,
    });
  };

  const handleConfirmDelay = async (minutes: number, reason?: string) => {
    if (!activeLesson) return;
    setIsSubmittingDelay(true);
    try {
      const res = await fetch(`/api/sessions/${activeLesson.id}/delay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delayMinutes: minutes,
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
      setActionMessage(`Lesson delayed by ${minutes}m${reasonMsg}.`);
      setDelayModal({ isOpen: false, minutes: 5 });
      setActiveLesson(data.session);
      await refreshAllData();
      setTimeout(() => setActionMessage(""), 4000);
    } catch {
      alert("Network error.");
    } finally {
      setIsSubmittingDelay(false);
    }
  };

  const handleDelay = (minutes: number) => handleOpenDelayModal(minutes);

  // Open Complete / Review Lesson Feedback Modal
  const openCompleteModal = (session: any) => {
    if (!session) return;
    setCompleteTargetLesson(session);
    setCompleteRating(session.feedbackRating || 5);
    setCompleteCovered(session.feedbackCovered || "");
    setCompleteNotes(session.feedbackNotes || "");
    setIsCompleteModalOpen(true);
  };

  // Submit Lesson Completion & Feedback
  const handleSubmitComplete = async (skipFeedback = false) => {
    if (!completeTargetLesson) return;
    setIsSubmittingComplete(true);
    try {
      const payload = skipFeedback
        ? {}
        : {
            feedbackRating: completeRating,
            feedbackCovered: completeCovered.trim() || undefined,
            feedbackNotes: completeNotes.trim() || undefined,
          };

      const res = await fetch(`/api/sessions/${completeTargetLesson.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to complete lesson.");
        setIsSubmittingComplete(false);
        return;
      }

      setActionMessage(data.message || "Lesson saved and marked as completed.");
      setIsCompleteModalOpen(false);
      setCompleteTargetLesson(null);
      await refreshAllData();
      setTimeout(() => setActionMessage(""), 4000);
    } catch {
      alert("Network error.");
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  // Export current week's schedule as multi-event .ics file
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

    const weekSessions = sessions.filter((s) => {
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
      title: `${s.title} (${s.tutee?.name || "Student"} & ${formatTutorName(s.tutor?.name)})`,
      description: `LB Maths Tuition Lesson.\nTutor: ${formatTutorName(s.tutor?.name)}\nStudent: ${s.tutee?.name || "Student"}\nMeeting: ${s.teamsMeetingUrl || "See portal lobby"}\nNotes: ${s.notes || "None"}`,
      location: s.teamsMeetingUrl || `${portalUrl}/admin`,
      startTime: s.scheduledStartTime,
      endTime: s.scheduledEndTime,
      tutorName: s.tutor?.name,
      studentName: s.tutee?.name,
    }));

    const dateSlug = monday.toISOString().slice(0, 10);
    downloadMultiEventICS(events, `lb-maths-week-${dateSlug}.ics`);
    setActionMessage(`Exported ${events.length} lessons for the week to .ics calendar.`);
    setTimeout(() => setActionMessage(""), 4000);
  };

  // Cancel Lesson Handler - opens modal for optional cancellation reason
  const handleCancelSession = (session: any) => {
    if (!session) return;
    setCancelTargetLesson(session);
    setIsCancelModalOpen(true);
  };

  // Open Reschedule Modal
  const handleOpenReschedule = (session: any) => {
    if (!session) return;
    setRescheduleTargetLesson(session);
    setIsRescheduleOpen(true);
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

  // Memoized filtered students list
  const filteredStudents = useMemo(() => {
    return students
      .filter((st) => {
        // 1. Search term: matches student name, PIN, magic key, or assigned tutor name
        if (studentSearchTerm.trim()) {
          const q = studentSearchTerm.toLowerCase();
          const matchName = st.name.toLowerCase().includes(q);
          const matchPin = (st.pin || "").toLowerCase().includes(q);
          const matchKey = (st.magicKey || "").toLowerCase().includes(q);
          const matchTutor = (st.assignedTutor?.name || "").toLowerCase().includes(q);
          if (!matchName && !matchPin && !matchKey && !matchTutor) return false;
        }

        // 2. Filter by assigned tutor
        if (studentTutorFilter === "UNASSIGNED") {
          if (st.assignedTutorId) return false;
        } else if (studentTutorFilter !== "ALL") {
          if (st.assignedTutorId !== studentTutorFilter) return false;
        }

        // 3. Filter by lesson status
        if (studentLessonFilter !== "ALL") {
          const now = Date.now();
          const hasUpcoming = sessions.some(
            (s) =>
              s.tuteeId === st.id &&
              s.status !== "COMPLETED" &&
              s.status !== "CANCELLED" &&
              new Date(s.scheduledEndTime).getTime() > now
          );
          if (studentLessonFilter === "HAS_UPCOMING" && !hasUpcoming) return false;
          if (studentLessonFilter === "NO_UPCOMING" && hasUpcoming) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (studentSortBy === "name_asc") return a.name.localeCompare(b.name);
        if (studentSortBy === "name_desc") return b.name.localeCompare(a.name);
        if (studentSortBy === "tutor") {
          const tA = a.assignedTutor?.name || "zzz";
          const tB = b.assignedTutor?.name || "zzz";
          return tA.localeCompare(tB);
        }
        if (studentSortBy === "newest") {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        return 0;
      });
  }, [students, studentSearchTerm, studentTutorFilter, studentLessonFilter, studentSortBy, sessions]);

  // Memoized filtered tutors list
  const filteredTutors = useMemo(() => {
    return tutors
      .filter((t) => {
        // 1. Search term: matches tutor name, email, or any assigned student's name
        if (tutorSearchTerm.trim()) {
          const q = tutorSearchTerm.toLowerCase();
          const matchName = t.name.toLowerCase().includes(q);
          const matchEmail = (t.email || "").toLowerCase().includes(q);
          const matchStudent = (t.assignedStudents || []).some((st: any) =>
            st.name.toLowerCase().includes(q)
          );
          if (!matchName && !matchEmail && !matchStudent) return false;
        }

        // 2. Filter by student
        if (tutorStudentFilter === "HAS_STUDENTS") {
          if (!t.assignedStudents || t.assignedStudents.length === 0) return false;
        } else if (tutorStudentFilter === "NO_STUDENTS") {
          if (t.assignedStudents && t.assignedStudents.length > 0) return false;
        } else if (tutorStudentFilter !== "ALL") {
          const hasAssigned = (t.assignedStudents || []).some(
            (st: any) => st.id === tutorStudentFilter
          );
          const hasSession = sessions.some(
            (s) => s.tutorId === t.id && s.tuteeId === tutorStudentFilter
          );
          if (!hasAssigned && !hasSession) return false;
        }

        // 3. Filter by role
        if (tutorRoleFilter !== "ALL") {
          if (t.role !== tutorRoleFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (tutorSortBy === "name_asc") return a.name.localeCompare(b.name);
        if (tutorSortBy === "name_desc") return b.name.localeCompare(a.name);
        if (tutorSortBy === "students_count") {
          return (b.assignedStudents?.length || 0) - (a.assignedStudents?.length || 0);
        }
        if (tutorSortBy === "newest") {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        return 0;
      });
  }, [tutors, tutorSearchTerm, tutorStudentFilter, tutorRoleFilter, tutorSortBy, sessions]);

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
              onClick={() => setIsFormulaSheetOpen(true)}
              className="py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700"
              title="Open quick GCSE & A-Level Maths Formula Reference"
            >
              <Calculator className="w-4 h-4 text-[#48A5EE]" />
              <span>Formula Sheet</span>
            </button>
            <button
              onClick={handleExportWeekSchedule}
              className="py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700"
              title="Export all lessons for the current week to an .ics calendar file"
            >
              <Calendar className="w-4 h-4 text-[#48A5EE]" />
              <span>Export Week (.ics)</span>
            </button>
            <button
              onClick={() => exportSessionsToCSV(sessions, "lb-maths-all-lessons")}
              className="py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700"
              title="Download all lesson records as CSV for Excel / Spreadsheets"
            >
              <Download className="w-4 h-4 text-[#48A5EE]" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setIsNewLessonOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Schedule Lesson</span>
            </button>
          </div>
        </div>


        {/* NEXT / ACTIVE SCHEDULED MEETING DECK (With visible PIN and Magic Link) */}
        {activeLesson && (
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 border-2 border-[#48A5EE]/40 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="min-w-0 flex-1">
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
                  {activeLesson.status === "DELAYED" && activeLesson.delayReason && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold">
                      Reason: {activeLesson.delayReason}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {activeLesson.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tutor: <strong className="text-slate-700 dark:text-slate-200">{formatTutorName(activeLesson.tutor?.name)}</strong> &bull;{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {new Date(activeLesson.scheduledStartTime).toLocaleDateString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>{" "}
                  &bull;{" "}
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
                    <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs shrink-0">
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
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0"
                    >
                      <Bell className="w-3.5 h-3.5 text-[#48A5EE]" />
                      <span>+ Add Reminder</span>
                    </button>
                  )}

                  {/* Attendance Confirmation Group (kept together on one line) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Tutor Confirmation Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleConfirmation(activeLesson.id, "tutor", Boolean(activeLesson.tutorConfirmed))}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border whitespace-nowrap ${
                        activeLesson.tutorConfirmed
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                      title="Click to toggle Tutor Confirmation"
                    >
                      {activeLesson.tutorConfirmed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Tutor: Confirmed ✓</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Tutor: Pending</span>
                        </>
                      )}
                    </button>

                    {/* Student Confirmation Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleConfirmation(activeLesson.id, "tutee", Boolean(activeLesson.tuteeConfirmed))}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border whitespace-nowrap ${
                        activeLesson.tuteeConfirmed
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                      title="Click to toggle Student Confirmation"
                    >
                      {activeLesson.tuteeConfirmed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Student: Confirmed ✓</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Student: Pending</span>
                        </>
                      )}
                    </button>
                  </div>
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
                  onClick={() => openCompleteModal(activeLesson)}
                  className="py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                  title="Mark lesson completed and optionally add personal rating, topics & notes"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                  <span>Mark Done / Review</span>
                </button>

                <button
                  onClick={() => handleOpenReschedule(activeLesson)}
                  className="py-2 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer flex items-center gap-1"
                  title="Reschedule this lesson"
                >
                  <CalendarClock className="w-3.5 h-3.5 text-purple-500" />
                  <span>Reschedule</span>
                </button>

                <button
                  onClick={() => handleCancelSession(activeLesson)}
                  className="py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer flex items-center gap-1"
                  title="Cancel this lesson"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Cancel</span>
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
            onClick={() => setActiveTab("resources")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "resources"
                ? "bg-[#48A5EE] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Shared Resources</span>
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
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "settings"
                ? "bg-[#48A5EE] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
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

          // Total payout sum for all completed unpaid lessons
          const totalUnpaidTutorPayout = completedUnpaidList.reduce(
            (sum, s) => sum + (s.tutee?.tutorPay || 0),
            0
          );

          // Matching lessons for batch archive date range
          const batchMatchingSessions = completedUnpaidList.filter((s) => {
            if (!batchArchiveStartDate || !batchArchiveEndDate) return true;
            const sStart = new Date(s.scheduledStartTime);
            const start = new Date(batchArchiveStartDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(batchArchiveEndDate);
            end.setHours(23, 59, 59, 999);
            return sStart >= start && sStart <= end;
          });
          const batchMatchingPayout = batchMatchingSessions.reduce(
            (sum, s) => sum + (s.tutee?.tutorPay || 0),
            0
          );

          // 3. Archived (Tutor Paid): tutorPaid === true
          const archivedPaidList = sortList(
            filtered.filter((s) => s.tutorPaid)
          );

          // 4. Cancelled: status === "CANCELLED"
          const cancelledList = sortList(
            filtered.filter((s) => s.status === "CANCELLED")
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
                            {formatTutorName(t.name)}
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
                    <span>Pending Tutor Payout: {completedUnpaidList.length}</span>
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
                    <span>Archived &amp; Paid: {archivedPaidList.length}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isArchivedOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>

              {/* 1. UPCOMING LESSONS (Shown at top) */}
              <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsUpcomingOpen(!isUpcomingOpen)}
                  className={`w-full p-5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer ${
                    isUpcomingOpen ? "border-b border-slate-100 dark:border-slate-800" : ""
                  }`}
                >
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#48A5EE]" />
                      <span>Upcoming Lessons</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Future scheduled or in-progress lessons. Older finished lessons move automatically below.
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
                          <th className="px-4 py-3">Student &amp; Lesson</th>
                          <th className="px-3 py-3">Tutor</th>
                          <th className="px-3 py-3">Date &amp; Time</th>
                          <th className="px-2 py-3 text-center">Status</th>
                          <th className="px-3 py-3 text-center">Attendance</th>
                          <th className="px-3 py-3">PIN &amp; Link</th>
                          <th className="px-3 py-3 text-center">Reschedule / Repeat</th>
                          <th className="px-3 py-3 text-center">Cancel / Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {upcomingList.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800 dark:text-slate-100">
                                {s.tutee?.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {s.title}
                              </div>
                              {/* Personal Admin Reminder */}
                              {s.adminReminder ? (
                                <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[10px]">
                                  <Bell className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span className="font-semibold truncate max-w-[140px]" title={s.adminReminder}>
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
                            <td className="px-3 py-3 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap text-xs">
                              {formatTutorName(s.tutor?.name)}
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
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                            <td className="px-3 py-3">
                              {/* Confirmation Toggles */}
                              <div className="flex flex-col gap-1 min-w-[105px]">
                                <button
                                  type="button"
                                  onClick={() => handleToggleConfirmation(s.id, "tutor", Boolean(s.tutorConfirmed))}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center justify-between gap-1 transition-all cursor-pointer border ${
                                    s.tutorConfirmed
                                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                                  }`}
                                  title="Click to toggle Tutor Confirmation"
                                >
                                  <span className="flex items-center gap-1">
                                    {s.tutorConfirmed ? (
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                                    )}
                                    <span>Tutor</span>
                                  </span>
                                  <span>{s.tutorConfirmed ? "✓" : "—"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleConfirmation(s.id, "tutee", Boolean(s.tuteeConfirmed))}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center justify-between gap-1 transition-all cursor-pointer border ${
                                    s.tuteeConfirmed
                                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                                  }`}
                                  title="Click to toggle Student Confirmation"
                                >
                                  <span className="flex items-center gap-1">
                                    {s.tuteeConfirmed ? (
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                                    )}
                                    <span>Student</span>
                                  </span>
                                  <span>{s.tuteeConfirmed ? "✓" : "—"}</span>
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px]">
                                  PIN: {s.tutee?.pin || "----"}
                                </span>
                                <button
                                  onClick={() => copyMagicLink(s.tutee?.magicKey)}
                                  className="px-2 py-0.5 rounded-lg bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] font-bold text-[10px] transition-colors cursor-pointer"
                                  title="Copy Magic Link"
                                >
                                  {copiedKey === s.tutee?.magicKey ? "Copied!" : "Link"}
                                </button>
                              </div>
                            </td>
                            {/* Reschedule, +1 Wk, +2 Wks in one column */}
                            <td className="px-3 py-3 text-center">
                              <div className="flex flex-col items-center gap-1 min-w-[125px]">
                                <button
                                  onClick={() => handleOpenReschedule(s)}
                                  className="w-full px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1 border border-purple-200 dark:border-purple-800"
                                  title="Reschedule this lesson"
                                >
                                  <CalendarClock className="w-3 h-3 text-purple-500 shrink-0" />
                                  <span>Reschedule</span>
                                </button>
                                <div className="flex items-center gap-1 w-full">
                                  <button
                                    onClick={() => handleScheduleSameTimeNextWeek(s, 1)}
                                    className="flex-1 px-1 py-0.5 rounded-lg bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] font-bold text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-0.5"
                                    title="Schedule next week (+7 days)"
                                  >
                                    <Repeat className="w-2.5 h-2.5 shrink-0" />
                                    <span>+1 Wk</span>
                                  </button>
                                  <button
                                    onClick={() => handleScheduleSameTimeNextWeek(s, 2)}
                                    className="flex-1 px-1 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-0.5 border border-purple-200 dark:border-purple-800"
                                    title="Schedule biweekly (+14 days)"
                                  >
                                    <Repeat className="w-2.5 h-2.5 text-purple-500 shrink-0" />
                                    <span>+2 Wks</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                            {/* Cancel and Delete in separate column */}
                            <td className="px-3 py-3 text-center">
                              <div className="flex flex-col items-center gap-1 min-w-[70px]">
                                <button
                                  onClick={() => handleCancelSession(s)}
                                  className="w-full px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1 border border-rose-200 dark:border-rose-800"
                                  title="Cancel this lesson"
                                >
                                  <XCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                  <span>Cancel</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteSession(s.id, s.title)}
                                  className="w-full px-1.5 py-0.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer flex items-center justify-center gap-1 text-[10px] font-semibold"
                                  title="Delete Lesson Permanently"
                                >
                                  <Trash2 className="w-2.5 h-2.5 shrink-0" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                  </div>
                )}
              </div>

              {/* 2. COMPLETED (TUTOR NOT PAID) */}
              <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-amber-200 dark:border-amber-800/80 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsCompletedOpen(!isCompletedOpen)}
                  className={`w-full p-5 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-100/40 dark:hover:bg-amber-900/30 transition-colors text-left cursor-pointer ${
                    isCompletedOpen ? "border-b border-amber-200 dark:border-amber-800/80" : ""
                  }`}
                >
                  <div>
                    <h3 className="text-base font-extrabold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Completed Lessons &bull; Tutor Not Paid ({completedUnpaidList.length})</span>
                    </h3>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                      These lessons have completed or passed. Review what was covered, the student rating, and toggle to Paid once settled.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 text-xs font-bold font-mono border border-amber-200 dark:border-amber-800">
                      Total Payout: {formatCurrency(totalUnpaidTutorPayout)}
                    </span>
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      {isCompletedOpen ? "Hide" : "Show"}
                    </span>
                    <div className="p-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCompletedOpen ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </button>

                {isCompletedOpen && (
                  <div className="space-y-0">
                    {/* Section Payout Bar & Batch Archive Button */}
                    <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/70 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                            Total Unpaid Tutor Payout:{" "}
                            <span className="font-extrabold font-mono text-sm">
                              {formatCurrency(totalUnpaidTutorPayout)}
                            </span>
                          </div>
                          <div className="text-[11px] text-amber-700 dark:text-amber-400">
                            Across {completedUnpaidList.length} completed lesson
                            {completedUnpaidList.length === 1 ? "" : "s"} awaiting tutor settlement
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsBatchArchiveOpen(!isBatchArchiveOpen)}
                        className="py-2 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shrink-0"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>{isBatchArchiveOpen ? "Hide Date Range Filter" : "Select by Date Range & Archive"}</span>
                      </button>
                    </div>

                    {/* Batch Date-Range Archive Toolbar */}
                    {isBatchArchiveOpen && (
                      <div className="p-4 bg-amber-100/40 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 space-y-3 animate-in fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-extrabold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                              <Archive className="w-3.5 h-3.5 text-amber-600" />
                              <span>Batch Move Lessons to Archived</span>
                            </h4>
                            <p className="text-[11px] text-amber-800/80 dark:text-amber-400">
                              Select lessons between dates and move all of them from &quot;To Be Paid&quot; to &quot;Archived&quot;.
                            </p>
                          </div>

                          {/* Quick Presets */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                const now = new Date();
                                const day = now.getDay();
                                const diff = day === 0 ? -6 : 1 - day;
                                const mon = new Date(now);
                                mon.setDate(now.getDate() + diff);
                                const fri = new Date(mon);
                                fri.setDate(mon.getDate() + 4);
                                setBatchArchiveStartDate(mon.toISOString().slice(0, 10));
                                setBatchArchiveEndDate(fri.toISOString().slice(0, 10));
                              }}
                              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-50 cursor-pointer"
                            >
                              This Week
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const now = new Date();
                                const day = now.getDay();
                                const diff = day === 0 ? -6 : 1 - day;
                                const lastMon = new Date(now);
                                lastMon.setDate(now.getDate() + diff - 7);
                                const lastFri = new Date(lastMon);
                                lastFri.setDate(lastMon.getDate() + 4);
                                setBatchArchiveStartDate(lastMon.toISOString().slice(0, 10));
                                setBatchArchiveEndDate(lastFri.toISOString().slice(0, 10));
                              }}
                              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-50 cursor-pointer"
                            >
                              Last Week
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const now = new Date();
                                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                                setBatchArchiveStartDate(firstDay.toISOString().slice(0, 10));
                                setBatchArchiveEndDate(now.toISOString().slice(0, 10));
                              }}
                              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-50 cursor-pointer"
                            >
                              This Month
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBatchArchiveStartDate("2020-01-01");
                                setBatchArchiveEndDate(new Date().toISOString().slice(0, 10));
                              }}
                              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-50 cursor-pointer"
                            >
                              All Unpaid
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-bold text-amber-900 dark:text-amber-300">From:</label>
                            <input
                              type="date"
                              value={batchArchiveStartDate}
                              onChange={(e) => setBatchArchiveStartDate(e.target.value)}
                              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-bold text-amber-900 dark:text-amber-300">To:</label>
                            <input
                              type="date"
                              value={batchArchiveEndDate}
                              onChange={(e) => setBatchArchiveEndDate(e.target.value)}
                              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-3 sm:ml-auto">
                            <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                              <span>{batchMatchingSessions.length} selected</span>
                              <span className="text-amber-700 dark:text-amber-400 font-mono ml-1">
                                ({formatCurrency(batchMatchingPayout)})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={handleBatchArchive}
                              disabled={isBatchArchiving || batchMatchingSessions.length === 0}
                              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isBatchArchiving ? "Moving..." : `Move ${batchMatchingSessions.length} to Archived`}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

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
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                              {s.tutee?.name}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">&bull;</span>
                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                              Tutor: <strong>{formatTutorName(s.tutor?.name)}</strong>
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

                          {/* Pay Breakdown Banner Under Lesson Header */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100/80 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs font-semibold">
                              <DollarSign className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>Needs to be Paid to Tutor:</span>
                              <strong className="font-extrabold text-amber-800 dark:text-amber-300 font-mono">
                                {s.tutee?.tutorPay !== null && s.tutee?.tutorPay !== undefined
                                  ? formatCurrency(s.tutee.tutorPay)
                                  : "Rate not set"}
                              </strong>
                            </div>

                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                              <span>Student Fee:</span>
                              <strong className="font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                                {s.tutee?.studentPay !== null && s.tutee?.studentPay !== undefined
                                  ? formatCurrency(s.tutee.studentPay)
                                  : "Rate not set"}
                              </strong>
                            </div>
                          </div>

                          {/* What was covered by tutor */}
                          {s.feedbackCovered ? (
                            <div className="text-xs bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                              <span className="font-bold text-[#48A5EE] mr-1">Reported by Tutor ({formatTutorName(s.tutor?.name) || "Tutor"}):</span>
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
                            onClick={() => handleScheduleSameTimeNextWeek(s, 1)}
                            className="py-2 px-3 rounded-xl bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Schedule next week (+7 days)"
                          >
                            <Repeat className="w-3.5 h-3.5" />
                            <span>+1 Wk</span>
                          </button>
                          <button
                            onClick={() => handleScheduleSameTimeNextWeek(s, 2)}
                            className="py-2 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-purple-200 dark:border-purple-800"
                            title="Schedule biweekly (+14 days)"
                          >
                            <Repeat className="w-3.5 h-3.5 text-purple-500" />
                            <span>+2 Wks</span>
                          </button>
                          <button
                            onClick={() => openCompleteModal(s)}
                            className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Rate lesson, edit topics covered, or view/update tutor notes"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>{s.feedbackCovered ? "Edit Feedback" : "Review"}</span>
                          </button>
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
                )}
              </div>

              {/* 3. CANCELLED LESSONS */}
              <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-rose-200 dark:border-rose-900/60 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsCancelledOpen(!isCancelledOpen)}
                  className={`w-full p-5 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-rose-100/40 dark:hover:bg-rose-900/30 transition-colors text-left cursor-pointer ${
                    isCancelledOpen ? "border-b border-rose-200 dark:border-rose-900/60" : ""
                  }`}
                >
                  <div>
                    <h3 className="text-base font-extrabold text-rose-950 dark:text-rose-200 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <span>Cancelled Lessons ({cancelledList.length})</span>
                    </h3>
                    <p className="text-xs text-rose-800/80 dark:text-rose-300/80">
                      Lessons that were cancelled. Click Reschedule to reactivate them at a new date &amp; time.
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
                  <div className="space-y-3">

                {cancelledList.length === 0 ? (
                  <div className="text-center py-8 px-4 space-y-1 text-xs text-slate-400">
                    No cancelled lessons. All scheduled lessons are active.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cancelledList.map((s) => (
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
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {s.title}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">&bull;</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Tutor: <strong>{formatTutorName(s.tutor?.name)}</strong>
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

                        {/* Action Buttons */}
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => handleOpenReschedule(s)}
                            className="py-2 px-3.5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                            title="Reschedule this cancelled lesson"
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                            <span>Reschedule Lesson</span>
                          </button>
                          <button
                            onClick={() => handleScheduleSameTimeNextWeek(s, 1)}
                            className="py-2 px-3 rounded-xl bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Schedule next week (+7 days)"
                          >
                            <Repeat className="w-3.5 h-3.5" />
                            <span>+1 Wk</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSession(s.id, s.title)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Delete Permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                  </div>
                )}
              </div>

              {/* 4. ARCHIVED (TUTOR PAID) */}
              <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsArchivedOpen(!isArchivedOpen)}
                  className={`w-full p-5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer ${
                    isArchivedOpen ? "border-b border-slate-100 dark:border-slate-800" : ""
                  }`}
                >
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Archive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Archived Lessons &bull; Tutor Paid ({archivedPaidList.length})</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Historical completed lessons where tutor payout has been marked as settled.
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
                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                              Tutor: <strong>{formatTutorName(s.tutor?.name)}</strong>
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

                          {/* Paid Breakdown */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200 text-xs font-semibold">
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Paid to Tutor:</span>
                              <span className="font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
                                {s.tutee?.tutorPay !== null && s.tutee?.tutorPay !== undefined
                                  ? formatCurrency(s.tutee.tutorPay)
                                  : "Rate not set"}
                              </span>
                            </div>

                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                              <span>Student Fee:</span>
                              <span className="font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                                {s.tutee?.studentPay !== null && s.tutee?.studentPay !== undefined
                                  ? formatCurrency(s.tutee.studentPay)
                                  : "Rate not set"}
                              </span>
                            </div>
                          </div>

                          {s.feedbackCovered && (
                            <div className="text-xs bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                              <span className="font-bold text-[#48A5EE] mr-1">Reported by Tutor ({formatTutorName(s.tutor?.name) || "Tutor"}):</span>
                              <span>{s.feedbackCovered}</span>
                              {s.feedbackNotes && (
                                <p className="text-slate-500 dark:text-slate-400 mt-0.5 italic">
                                  Notes: &quot;{s.feedbackNotes}&quot;
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Rebook, Revert to Unpaid & Delete */}
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => handleScheduleSameTimeNextWeek(s, 1)}
                            className="py-1.5 px-3 rounded-xl bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Schedule next week (+7 days)"
                          >
                            <Repeat className="w-3.5 h-3.5" />
                            <span>+1 Wk</span>
                          </button>
                          <button
                            onClick={() => handleScheduleSameTimeNextWeek(s, 2)}
                            className="py-1.5 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-purple-200 dark:border-purple-800"
                            title="Schedule biweekly (+14 days)"
                          >
                            <Repeat className="w-3.5 h-3.5 text-purple-500" />
                            <span>+2 Wks</span>
                          </button>
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
                )}
              </div>
            </div>
          );
        })()}

        {/* TAB 2: STUDENTS, ASSIGNED TUTORS & MAGIC LINKS */}
        {activeTab === "students" && (
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#48A5EE]" />
                  <span>
                    Students &amp; PIN Directory ({filteredStudents.length}
                    {filteredStudents.length !== students.length ? ` of ${students.length}` : ""})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage student accounts, view secret PINs, and copy direct magic links.
                </p>
              </div>

              <button
                onClick={() => {
                  setNewUserRole("TUTEE");
                  setIsNewUserOpen(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Student</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  placeholder="Search student, PIN, magic key, tutor..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#48A5EE] text-slate-800 dark:text-slate-100 placeholder-slate-400"
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

              {/* Filter by Tutor */}
              <div className="flex items-center gap-1.5 shrink-0">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={studentTutorFilter}
                  onChange={(e) => setStudentTutorFilter(e.target.value)}
                  aria-label="Filter students by tutor"
                  className="py-2 px-3 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#48A5EE] cursor-pointer"
                >
                  <option value="ALL">All Tutors ({tutors.length})</option>
                  <option value="UNASSIGNED">Unassigned Only</option>
                  {tutors.map((t) => (
                    <option key={t.id} value={t.id}>
                      Tutor: {formatTutorName(t.name)} ({t.assignedStudents?.length || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Lesson Status */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={studentLessonFilter}
                  onChange={(e) => setStudentLessonFilter(e.target.value as any)}
                  aria-label="Filter students by lesson status"
                  className="py-2 px-3 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#48A5EE] cursor-pointer"
                >
                  <option value="ALL">All Lesson Statuses</option>
                  <option value="HAS_UPCOMING">Has Upcoming Lessons</option>
                  <option value="NO_UPCOMING">No Upcoming Lessons</option>
                </select>
              </div>

              {/* Sort by */}
              <div className="flex items-center gap-1.5 shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={studentSortBy}
                  onChange={(e) => setStudentSortBy(e.target.value as any)}
                  aria-label="Sort students"
                  className="py-2 px-3 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#48A5EE] cursor-pointer"
                >
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="tutor">Assigned Tutor</option>
                  <option value="newest">Recently Added</option>
                </select>
              </div>

              {/* Reset button */}
              {(studentSearchTerm || studentTutorFilter !== "ALL" || studentLessonFilter !== "ALL" || studentSortBy !== "name_asc") && (
                <button
                  onClick={() => {
                    setStudentSearchTerm("");
                    setStudentTutorFilter("ALL");
                    setStudentLessonFilter("ALL");
                    setStudentSortBy("name_asc");
                  }}
                  className="text-xs font-semibold text-[#48A5EE] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {students.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Students Yet</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click &quot;Add Student&quot; above to create students and assign them to a tutor.
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <Search className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Students Found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  No students match your search criteria. Try modifying your search or clearing filters.
                </p>
                <button
                  onClick={() => {
                    setStudentSearchTerm("");
                    setStudentTutorFilter("ALL");
                    setStudentLessonFilter("ALL");
                    setStudentSortBy("name_asc");
                  }}
                  className="py-1.5 px-3 rounded-lg bg-[#48A5EE]/10 text-[#48A5EE] font-bold text-xs hover:bg-[#48A5EE]/20 transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Student Name</th>
                      <th className="px-5 py-3.5">Normal Assigned Tutor</th>
                      <th className="px-5 py-3.5">Student Fee</th>
                      <th className="px-5 py-3.5">Tutor Pay</th>
                      <th className="px-5 py-3.5">Secret PIN</th>
                      <th className="px-5 py-3.5">Magic Link</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                        <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <span>{st.name}</span>
                            {sessions.some((s) => s.tuteeId === st.id && s.status === "IN_PROGRESS") ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 animate-pulse">
                                ● Live Now
                              </span>
                            ) : sessions.some(
                                (s) =>
                                  s.tuteeId === st.id &&
                                  (s.status === "SCHEDULED" || s.status === "DELAYED") &&
                                  new Date(s.scheduledEndTime).getTime() > Date.now()
                              ) ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#48A5EE]/10 text-[#48A5EE]">
                                Upcoming Lesson
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {st.assignedTutor ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-200/60 dark:border-emerald-800/60">
                                <GraduationCap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>{formatTutorName(st.assignedTutor.name)}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-200/60 dark:border-amber-800/60">
                                Unassigned
                              </span>
                            )}
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
                          <span
                            className={`font-semibold text-xs px-2.5 py-1 rounded-lg ${
                              st.studentPay !== null && st.studentPay !== undefined
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
                                : "text-slate-400 italic"
                            }`}
                          >
                            {formatCurrency(st.studentPay, "Not set")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`font-semibold text-xs px-2.5 py-1 rounded-lg ${
                              st.tutorPay !== null && st.tutorPay !== undefined
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono border border-emerald-200/60 dark:border-emerald-800/60"
                                : "text-slate-400 italic"
                            }`}
                          >
                            {formatCurrency(st.tutorPay, "Not set")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-700">
                              {st.pin || "----"}
                            </span>
                            {st.pin && (
                              <button
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(st.pin);
                                    setCopiedKey(`pin-${st.id}`);
                                    setTimeout(() => setCopiedKey(null), 2000);
                                  } catch {}
                                }}
                                className="p-1 text-slate-400 hover:text-[#48A5EE] transition-colors cursor-pointer"
                                title="Copy PIN"
                              >
                                {copiedKey === `pin-${st.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] text-[#48A5EE]">
                          /student?key={st.magicKey}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleToggleUserActive(st.id, st.active !== false)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              st.active !== false
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/80"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600"
                            }`}
                            title={`Click to set as ${st.active !== false ? "Inactive" : "Active"}`}
                          >
                            {st.active !== false ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-slate-400" />
                                <span>Inactive</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-right flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenCalendar(st)}
                            className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] text-xs font-bold transition-colors cursor-pointer"
                            title="Open Weekly Timetable"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Calendar</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditStudent(st)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#48A5EE] hover:bg-[#48A5EE]/10 transition-colors cursor-pointer"
                            title="Edit Student & Rates"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => copyMagicLink(st.magicKey)}
                            className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                            title="Copy Magic Link"
                          >
                            {copiedKey === st.magicKey ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
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
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#48A5EE]" />
                  <span>
                    Tutor Directory ({filteredTutors.length}
                    {filteredTutors.length !== tutors.length ? ` of ${tutors.length}` : ""})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage tutor staff, view assignments, and configure credentials.
                </p>
              </div>

              <button
                onClick={() => {
                  setNewUserRole("TUTOR");
                  setIsNewUserOpen(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Tutor</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tutorSearchTerm}
                  onChange={(e) => setTutorSearchTerm(e.target.value)}
                  placeholder="Search tutor name, email, student..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#48A5EE] text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
                {tutorSearchTerm && (
                  <button
                    onClick={() => setTutorSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Filter by Student */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={tutorStudentFilter}
                  onChange={(e) => setTutorStudentFilter(e.target.value)}
                  aria-label="Filter tutors by student"
                  className="py-2 px-3 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#48A5EE] cursor-pointer"
                >
                  <option value="ALL">All Students</option>
                  <option value="HAS_STUDENTS">Has Students Assigned</option>
                  <option value="NO_STUDENTS">No Students Assigned</option>
                  <optgroup label="Specific Student">
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        Student: {st.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Filter by Role */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={tutorRoleFilter}
                  onChange={(e) => setTutorRoleFilter(e.target.value as any)}
                  aria-label="Filter tutors by role"
                  className="py-2 px-3 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#48A5EE] cursor-pointer"
                >
                  <option value="ALL">All Roles</option>
                  <option value="HEAD_TUTOR">Admin Only</option>
                  <option value="TUTOR">Tutors Only</option>
                </select>
              </div>

              {/* Sort by */}
              <div className="flex items-center gap-1.5 shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={tutorSortBy}
                  onChange={(e) => setTutorSortBy(e.target.value as any)}
                  aria-label="Sort tutors"
                  className="py-2 px-3 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#48A5EE] cursor-pointer"
                >
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="students_count">Most Students Assigned</option>
                  <option value="newest">Recently Added</option>
                </select>
              </div>

              {/* Reset button */}
              {(tutorSearchTerm || tutorStudentFilter !== "ALL" || tutorRoleFilter !== "ALL" || tutorSortBy !== "name_asc") && (
                <button
                  onClick={() => {
                    setTutorSearchTerm("");
                    setTutorStudentFilter("ALL");
                    setTutorRoleFilter("ALL");
                    setTutorSortBy("name_asc");
                  }}
                  className="text-xs font-semibold text-[#48A5EE] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {tutors.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Tutors Yet</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click &quot;Add Tutor&quot; above to create tutor accounts.
                </p>
              </div>
            ) : filteredTutors.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <Search className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Tutors Found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  No tutors match your search criteria. Try modifying your search or clearing filters.
                </p>
                <button
                  onClick={() => {
                    setTutorSearchTerm("");
                    setTutorStudentFilter("ALL");
                    setTutorRoleFilter("ALL");
                    setTutorSortBy("name_asc");
                  }}
                  className="py-1.5 px-3 rounded-lg bg-[#48A5EE]/10 text-[#48A5EE] font-bold text-xs hover:bg-[#48A5EE]/20 transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Tutor Name</th>
                      <th className="px-5 py-3.5">Email / Handle</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Assigned Students</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTutors.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                        <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-100">
                          {formatTutorName(t.name)}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono">
                          {t.email}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.role === "HEAD_TUTOR"
                                ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                                : "bg-[#48A5EE]/10 text-[#48A5EE]"
                            }`}
                          >
                            {t.role === "HEAD_TUTOR" ? "Admin" : "Tutor"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {t.assignedStudents?.length || 0} student
                              {t.assignedStudents?.length === 1 ? "" : "s"}
                            </span>
                            {t.assignedStudents && t.assignedStudents.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {t.assignedStudents.map((st: any) => (
                                  <span
                                    key={st.id}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                                  >
                                    {st.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">None assigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleToggleUserActive(t.id, t.active !== false)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              t.active !== false
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/80"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600"
                            }`}
                            title={`Click to set as ${t.active !== false ? "Inactive" : "Active"}`}
                          >
                            {t.active !== false ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-slate-400" />
                                <span>Inactive</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenCalendar(t)}
                              className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] text-xs font-bold transition-colors cursor-pointer"
                              title="Open Weekly Timetable"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Calendar</span>
                            </button>

                            {t.role !== "HEAD_TUTOR" &&
                            t.id !== currentUser?.id &&
                            t.email !== "luke@lbmathstuition.co.uk" ? (
                              <>
                                <button
                                  onClick={() => {
                                    setPasswordModalUser(t);
                                    setAdminNewPassword("");
                                    setAdminConfirmPassword("");
                                    setPasswordModalError("");
                                    setPasswordModalSuccess("");
                                  }}
                                  className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#48A5EE]/10 hover:text-[#48A5EE] text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                                  title="Set Password"
                                >
                                  <Key className="w-3.5 h-3.5 text-[#48A5EE]" />
                                  <span className="hidden sm:inline">Set Password</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteTutor(t.id, t.name)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                  title="Delete Tutor"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic ml-1">
                                (You)
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: SHARED RESOURCES */}
        {activeTab === "resources" && currentUser && (
          <div className="animate-in fade-in">
            <SharedResourcesHub currentUser={currentUser} />
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

        {/* TAB 5: PLATFORM SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#48A5EE]" />
                  <span>Platform Settings & Feature Controls</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage global system settings, accessibility features, and easter eggs across the platform.
                </p>
              </div>

              {settingsMessage && (
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-[#3292dc] dark:text-blue-300 text-xs flex items-center justify-between animate-in fade-in">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#48A5EE] shrink-0" />
                    <span>{settingsMessage}</span>
                  </span>
                  <button
                    onClick={() => setSettingsMessage("")}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-2 py-0.5 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Subway Surfers Mode Control */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" role="img" aria-label="skateboard">
                      🛹
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Subway Surfers Focus Mode
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                        subwaySurfersEnabled
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {subwaySurfersEnabled ? "Active" : "Disabled / Hidden"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                    Controls whether the secret Subway Surfers focus stream is available in the student and tutor accessibility menu. When toggled off, the feature disappears from the entire platform.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {subwaySurfersEnabled ? "Enabled" : "Hidden"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    disabled={isUpdatingSettings}
                    aria-checked={subwaySurfersEnabled}
                    onClick={() => handleToggleSubwaySurfers(!subwaySurfersEnabled)}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      subwaySurfersEnabled ? "bg-[#48A5EE]" : "bg-slate-300 dark:bg-slate-700"
                    } ${isUpdatingSettings ? "opacity-60 cursor-not-allowed" : ""}`}
                    title={subwaySurfersEnabled ? "Click to hide Subway Surfers mode" : "Click to enable Subway Surfers mode"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        subwaySurfersEnabled ? "translate-x-7" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Unified Password Management Section */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#48A5EE]" />
                    <span>Password &amp; Security Controls</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Manage your own administrator password or set new credentials for any tutor account.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {/* Subsection 1: Admin Own Password */}
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#48A5EE]" />
                        <span>Change Your Admin Password</span>
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Logged in as <strong>Luke ({currentUser?.email})</strong>.
                      </p>
                    </div>

                    {adminSelfPasswordError && (
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{adminSelfPasswordError}</span>
                      </div>
                    )}

                    {adminSelfPasswordSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>{adminSelfPasswordSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleAdminChangeOwnPassword} className="space-y-3 text-xs">
                      <div>
                        <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                          Current Admin Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={adminSelfCurrentPassword}
                          onChange={(e) => setAdminSelfCurrentPassword(e.target.value)}
                          placeholder="Enter your current password"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-[#48A5EE]"
                        />
                      </div>

                      <div>
                        <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                          New Admin Password *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={5}
                          value={adminSelfNewPassword}
                          onChange={(e) => setAdminSelfNewPassword(e.target.value)}
                          placeholder="Minimum 5 characters"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-[#48A5EE]"
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
                          value={adminSelfConfirmPassword}
                          onChange={(e) => setAdminSelfConfirmPassword(e.target.value)}
                          placeholder="Repeat new password"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-[#48A5EE]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingAdminSelfPassword}
                        className="py-2.5 px-4 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSubmittingAdminSelfPassword ? "Updating..." : "Save Admin Password"}</span>
                      </button>
                    </form>
                  </div>

                  {/* Subsection 2: Set Tutor Password */}
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#48A5EE]" />
                        <span>Set Tutor Passwords (Admin)</span>
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Tutor passwords cannot be viewed, but you can set and overwrite them here.
                      </p>
                    </div>

                    {settingsTutorPasswordError && (
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{settingsTutorPasswordError}</span>
                      </div>
                    )}

                    {settingsTutorPasswordSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>{settingsTutorPasswordSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleSettingsSetTutorPassword} className="space-y-3 text-xs">
                      <div>
                        <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                          Select Tutor Account *
                        </label>
                        <select
                          required
                          value={settingsSelectedTutorId}
                          onChange={(e) => setSettingsSelectedTutorId(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-[#48A5EE]"
                        >
                          <option value="">Choose tutor account...</option>
                          {tutors
                            .filter((t) => t.role !== "HEAD_TUTOR" && t.id !== currentUser?.id && t.email !== "luke@lbmathstuition.co.uk")
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {formatTutorName(t.name)} ({t.email})
                              </option>
                            ))}
                          {tutors.filter((t) => t.role !== "HEAD_TUTOR" && t.id !== currentUser?.id && t.email !== "luke@lbmathstuition.co.uk").length === 0 && (
                            <option value="" disabled>
                              No other tutors created yet
                            </option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                          New Password *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={5}
                          value={settingsTutorNewPassword}
                          onChange={(e) => setSettingsTutorNewPassword(e.target.value)}
                          placeholder="Minimum 5 characters"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-[#48A5EE]"
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
                          value={settingsTutorConfirmPassword}
                          onChange={(e) => setSettingsTutorConfirmPassword(e.target.value)}
                          placeholder="Repeat new password"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-[#48A5EE]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingSettingsTutorPassword}
                        className="py-2.5 px-4 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>{isSubmittingSettingsTutorPassword ? "Updating..." : "Set Tutor Password"}</span>
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
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
                    {activeStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} {st.assignedTutor ? `(Tutor: ${formatTutorName(st.assignedTutor.name)})` : ""}
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
                    {activeTutors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {formatTutorName(t.name)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Start/End Times (strictly 5-minute intervals) */}
              <div className="space-y-2">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Lesson Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={lessonDate}
                    onChange={(e) => setLessonDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs focus:outline-none focus:border-[#48A5EE]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Start Time *
                    </label>
                    <TimeSelect
                      value={lessonStartTime}
                      onChange={(newStart) => {
                        setLessonStartTime(newStart);
                        setLessonEndTime(addMinutesToTime(newStart, 60));
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      End Time *
                    </label>
                    <TimeSelect
                      value={lessonEndTime}
                      onChange={(newEnd) => setLessonEndTime(newEnd)}
                    />
                  </div>
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

              {/* Recurring Lesson Option (Weekly or Biweekly) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-[#48A5EE]" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Repeat Lesson (Recurring Schedule)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isRepeating}
                    onChange={(e) => setIsRepeating(e.target.checked)}
                    className="w-4 h-4 rounded text-[#48A5EE] focus:ring-[#48A5EE] cursor-pointer"
                  />
                </label>

                {isRepeating && (
                  <div className="space-y-2.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Frequency:</span>
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setRepeatIntervalWeeks(1)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            repeatIntervalWeeks === 1
                              ? "bg-[#48A5EE] text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          Weekly
                        </button>
                        <button
                          type="button"
                          onClick={() => setRepeatIntervalWeeks(2)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            repeatIntervalWeeks === 2
                              ? "bg-[#48A5EE] text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          Biweekly (Every 2 wks)
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Total sessions:</span>
                      <select
                        value={repeatWeeks}
                        onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:border-[#48A5EE] cursor-pointer"
                      >
                        <option value={2}>2 Sessions</option>
                        <option value={3}>3 Sessions</option>
                        <option value={4}>4 Sessions {repeatIntervalWeeks === 2 ? "(8 Weeks)" : "(1 Month)"}</option>
                        <option value={6}>6 Sessions {repeatIntervalWeeks === 2 ? "(12 Weeks)" : "(Half Term)"}</option>
                        <option value={8}>8 Sessions {repeatIntervalWeeks === 2 ? "(16 Weeks)" : "(2 Months)"}</option>
                        <option value={10}>10 Sessions</option>
                        <option value={12}>12 Sessions {repeatIntervalWeeks === 1 ? "(Full Term)" : ""}</option>
                      </select>
                    </div>

                    <div className="text-[11px] text-[#48A5EE] font-medium bg-[#48A5EE]/10 px-2.5 py-1.5 rounded-xl">
                      Scheduling {repeatWeeks} sessions, {repeatIntervalWeeks === 2 ? "every two weeks" : "every week"} starting on {lessonDate ? new Date(`${lessonDate}T${lessonStartTime || "10:00"}:00`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : "the selected date"}.
                    </div>

                  </div>
                )}
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
                      {activeTutors.map((t) => (
                        <option key={t.id} value={t.id}>
                          {formatTutorName(t.name)} ({t.role === "HEAD_TUTOR" ? "Admin" : "Tutor"})
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

                  {/* Student Pay & Tutor Pay */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                        Student Fee (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 25.00"
                        value={newUserStudentPay}
                        onChange={(e) => setNewUserStudentPay(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                      />
                      <span className="text-[10px] text-slate-400">Student pays / lesson</span>
                    </div>

                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                        Tutor Pay (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 15.00"
                        value={newUserTutorPay}
                        onChange={(e) => setNewUserTutorPay(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                      />
                      <span className="text-[10px] text-slate-400">Tutor receives / lesson</span>
                    </div>

                    {newUserRole === "TUTEE" &&
                      Boolean(newUserStudentPay) &&
                      Boolean(newUserTutorPay) &&
                      parseFloat(newUserStudentPay) < parseFloat(newUserTutorPay) && (
                        <div className="col-span-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                          <span>Student fee (£{newUserStudentPay}) cannot be less than tutor pay (£{newUserTutorPay}).</span>
                        </div>
                      )}
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
                  disabled={
                    isSubmittingUser ||
                    (newUserRole === "TUTEE" &&
                      Boolean(newUserStudentPay) &&
                      Boolean(newUserTutorPay) &&
                      parseFloat(newUserStudentPay) < parseFloat(newUserTutorPay))
                  }
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
                  {activeTutors.map((t) => (
                    <option key={t.id} value={t.id}>
                      {formatTutorName(t.name)} ({t.role === "HEAD_TUTOR" ? "Admin" : "Tutor"})
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

      {/* EDIT STUDENT MODAL */}
      {isEditStudentOpen && editStudentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#48A5EE]/10 text-[#48A5EE]">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Edit Student: {editStudentTarget.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update student rates, assigned tutor, and login PIN.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditStudentOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editStudentError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
                {editStudentError}
              </div>
            )}

            <form onSubmit={handleSaveEditStudent} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Student Name *
                </label>
                <input
                  type="text"
                  required
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Assigned Tutor
                </label>
                <select
                  value={editStudentAssignedTutorId}
                  onChange={(e) => setEditStudentAssignedTutorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                >
                  <option value="">Unassigned</option>
                  {tutors
                    .filter((t) => t.active !== false || t.id === editStudentAssignedTutorId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {formatTutorName(t.name)} ({t.role === "HEAD_TUTOR" ? "Admin" : "Tutor"}) {t.active === false ? "(Inactive)" : ""}
                      </option>
                    ))}
                </select>
              </div>

              {/* Pay Rates */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    Student Fee (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 25.00"
                    value={editStudentStudentPay}
                    onChange={(e) => setEditStudentStudentPay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                  />
                  <span className="text-[10px] text-slate-400">Student pays / lesson</span>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    Tutor Pay (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 15.00"
                    value={editStudentTutorPay}
                    onChange={(e) => setEditStudentTutorPay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                  />
                  <span className="text-[10px] text-slate-400">Tutor receives / lesson</span>
                </div>

                {Boolean(editStudentStudentPay) &&
                  Boolean(editStudentTutorPay) &&
                  parseFloat(editStudentStudentPay) < parseFloat(editStudentTutorPay) && (
                    <div className="col-span-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>Student fee (£{editStudentStudentPay}) cannot be less than tutor pay (£{editStudentTutorPay}).</span>
                    </div>
                  )}
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  4-Digit Login PIN
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 4821"
                  value={editStudentPin}
                  onChange={(e) => setEditStudentPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                />
              </div>

              {/* Active / Inactive Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Account Active Status
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    When inactive, student is excluded from booking combo lists.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditStudentActive(!editStudentActive)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    editStudentActive
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {editStudentActive ? "Active" : "Inactive"}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditStudentOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingEditStudent ||
                    (Boolean(editStudentStudentPay) &&
                      Boolean(editStudentTutorPay) &&
                      parseFloat(editStudentStudentPay) < parseFloat(editStudentTutorPay))
                  }
                  className="px-5 py-2 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingEditStudent ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER WEEKLY CALENDAR MODAL */}
      <UserWeeklyCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => {
          setIsCalendarModalOpen(false);
          setCalendarModalUser(null);
        }}
        targetUser={calendarModalUser}
        allSessions={sessions}
        students={students}
        tutors={tutors}
        currentUserId={currentUser?.id}
        isAdmin={true}
        onSessionCreated={async () => {
          await refreshAllData();
        }}
        onUserSelect={(u) => setCalendarModalUser(u)}
      />


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

      {/* ADMIN SET USER PASSWORD MODAL */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#48A5EE]/10 text-[#48A5EE]">
                <Key className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Set Password
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update password for {formatTutorName(passwordModalUser.name)}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="text-slate-700 dark:text-slate-300">
                <strong>Account:</strong> {formatTutorName(passwordModalUser.name)}
              </div>
              <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                {passwordModalUser.email}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 italic pt-1">
                Note: Passwords are encrypted and cannot be viewed, but as admin you can set a new one directly.
              </p>
            </div>

            {passwordModalError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold">
                {passwordModalError}
              </div>
            )}

            {passwordModalSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{passwordModalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAdminSetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={5}
                  placeholder="Minimum 5 characters"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={5}
                  placeholder="Repeat new password"
                  value={adminConfirmPassword}
                  onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48A5EE]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordModalUser(null);
                    setAdminNewPassword("");
                    setAdminConfirmPassword("");
                    setPasswordModalError("");
                    setPasswordModalSuccess("");
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdminPassword}
                  className="px-4 py-2 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingAdminPassword ? "Updating..." : "Update Password"}
                </button>
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

      {/* Maths Formula Sheet Modal */}
      <FormulaSheetModal
        isOpen={isFormulaSheetOpen}
        onClose={() => setIsFormulaSheetOpen(false)}
      />

      {/* Admin Complete & Review Lesson Feedback Modal */}
      {isCompleteModalOpen && completeTargetLesson && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsCompleteModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Complete Lesson &amp; Review</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {completeTargetLesson.title} ({completeTargetLesson.tutee?.name}) &bull;{" "}
                  {new Date(completeTargetLesson.scheduledStartTime).toLocaleDateString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Star Rating */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Lesson Rating (Optional)
                  </label>
                  <span className="text-[11px] font-bold text-amber-500">
                    {completeRating} / 5 Stars
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setCompleteRating(star)}
                      className="p-1 rounded-lg hover:scale-110 transition-transform cursor-pointer"
                      title={`${star} Star${star > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= completeRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300 dark:text-slate-700"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Topics Covered */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Topics Covered (Optional)
                </label>
                <textarea
                  value={completeCovered}
                  onChange={(e) => setCompleteCovered(e.target.value)}
                  placeholder="e.g. Quadratic equations, factorising, solving by completing the square..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-[#48A5EE]"
                />
              </div>

              {/* Notes & Feedback */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Tutor / Admin Notes (Optional)
                </label>
                <textarea
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  placeholder="e.g. Excellent focus today. Next session work on word problems and exam past paper questions."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-[#48A5EE]"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleSubmitComplete(true)}
                disabled={isSubmittingComplete}
                className="w-full sm:w-auto text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Skip Details &amp; Complete
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitComplete(false)}
                  disabled={isSubmittingComplete}
                  className="px-4 py-2 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmittingComplete ? "Saving..." : "Save & Complete"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Lesson Modal */}
      <RescheduleModal
        isOpen={isRescheduleOpen}
        session={rescheduleTargetLesson}
        onClose={() => {
          setIsRescheduleOpen(false);
          setRescheduleTargetLesson(null);
        }}
        onSuccess={() => {
          setActionMessage("Lesson rescheduled successfully!");
          refreshAllData();
          setTimeout(() => setActionMessage(""), 4000);
        }}
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
          setActionMessage("Lesson marked as cancelled. You can reschedule it anytime.");
          await refreshAllData();
          setTimeout(() => setActionMessage(""), 4000);
        }}
      />

      {/* Delay Lesson with Reason Modal */}
      <DelayReasonModal
        isOpen={delayModal.isOpen}
        minutes={delayModal.minutes}
        studentName={delayModal.studentName}
        onClose={() => setDelayModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelay}
        isSubmitting={isSubmittingDelay}
      />

      <Footer />
    </div>
  );
}
