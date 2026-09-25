"use client";

import React from "react";
import {
  X,
  History,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  Play,
  CalendarClock,
  CalendarPlus,
  DollarSign,
  Star,
  XCircle,
  RefreshCw,
  Bell,
  Shield,
} from "lucide-react";
import { formatTutorName } from "@/lib/format";

interface SessionAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any | null;
  auditLogs: any[];
  isLoading: boolean;
}

export default function SessionAuditModal({
  isOpen,
  onClose,
  session,
  auditLogs,
  isLoading,
}: SessionAuditModalProps) {
  if (!isOpen || !session) return null;

  const getEventBadge = (action: string) => {
    switch (action) {
      case "SESSION_CREATED":
        return {
          icon: <CalendarPlus className="w-4 h-4 text-emerald-500" />,
          bg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800",
          title: "Lesson Created",
          textColor: "text-emerald-700 dark:text-emerald-300",
        };
      case "SESSION_RESCHEDULED":
      case "SESSION_UPDATED":
        return {
          icon: <CalendarClock className="w-4 h-4 text-purple-500" />,
          bg: "bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800",
          title: action === "SESSION_RESCHEDULED" ? "Lesson Rescheduled" : "Lesson Updated",
          textColor: "text-purple-700 dark:text-purple-300",
        };
      case "LESSON_STARTED":
        return {
          icon: <Play className="w-4 h-4 text-blue-500 fill-blue-500" />,
          bg: "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800",
          title: "Lesson Started",
          textColor: "text-blue-700 dark:text-blue-300",
        };
      case "LESSON_COMPLETED":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          bg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800",
          title: "Lesson Completed",
          textColor: "text-emerald-700 dark:text-emerald-300",
        };
      case "DELAY_ALERT_SENT":
        return {
          icon: <Bell className="w-4 h-4 text-amber-500" />,
          bg: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800",
          title: "Delay Alert Broadcast",
          textColor: "text-amber-700 dark:text-amber-300",
        };
      case "SESSION_CANCELLED":
        return {
          icon: <XCircle className="w-4 h-4 text-rose-500" />,
          bg: "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800",
          title: "Lesson Cancelled",
          textColor: "text-rose-700 dark:text-rose-300",
        };
      case "TUTOR_PAID_TOGGLED":
        return {
          icon: <DollarSign className="w-4 h-4 text-emerald-500" />,
          bg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800",
          title: "Tutor Payout Status Updated",
          textColor: "text-emerald-700 dark:text-emerald-300",
        };
      case "FEEDBACK_SUBMITTED":
        return {
          icon: <Star className="w-4 h-4 text-amber-400 fill-amber-400" />,
          bg: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800",
          title: "Lesson Review Submitted",
          textColor: "text-amber-700 dark:text-amber-300",
        };
      default:
        return {
          icon: <History className="w-4 h-4 text-slate-500" />,
          bg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
          title: action.replace(/_/g, " "),
          textColor: "text-slate-700 dark:text-slate-300",
        };
    }
  };

  const getActorRoleBadge = (role?: string) => {
    switch (role) {
      case "HEAD_TUTOR":
        return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300";
      case "TUTOR":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
      case "STUDENT":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const formattedStartTime = new Date(session.scheduledStartTime).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedEndTime = new Date(session.scheduledEndTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-audit-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <History className="w-4 h-4" />
              </div>
              <h3 id="session-audit-title" className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                Lesson Audit Timeline
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pl-10">
              Chronological history of lifecycle updates, reschedules, confirmations, and alerts for this lesson.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close audit timeline modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Session Snapshot Bar */}
        <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-slate-800 dark:text-slate-200">
              {session.tutee?.name || "Student"}
            </span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-600 dark:text-slate-300">
              Tutor: <strong>{formatTutorName(session.tutor?.name)}</strong>
            </span>
            <span className="text-slate-400">&bull;</span>
            <span className="font-mono text-slate-600 dark:text-slate-400">
              {formattedStartTime} - {formattedEndTime}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                session.status === "COMPLETED"
                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                  : session.status === "CANCELLED"
                  ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                  : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
              }`}
            >
              {session.status}
            </span>
            {session.tutorPaid && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Paid
              </span>
            )}
          </div>
        </div>

        {/* Audit Timeline Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-[#48A5EE] animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Fetching session audit history...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                <History className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                No Direct Audit Trail Recorded Yet
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Detailed events such as delay alerts, status updates, reschedules, and payouts will appear here in chronological order when performed.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {auditLogs.map((log) => {
                const badge = getEventBadge(log.action);
                const eventTime = new Date(log.timestamp);

                return (
                  <div key={log.id} className="relative group">
                    {/* Node Dot / Icon Badge */}
                    <div
                      className={`absolute -left-6 top-0 w-6 h-6 rounded-full border flex items-center justify-center shadow-xs ${badge.bg}`}
                    >
                      {badge.icon}
                    </div>

                    {/* Event Content Card */}
                    <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${badge.textColor}`}>
                            {badge.title}
                          </span>
                          {log.actor?.role && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getActorRoleBadge(
                                log.actor.role
                              )}`}
                            >
                              {log.actor.role.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {eventTime.toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            {eventTime.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Actor Information */}
                      {log.actor?.name && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Initiated by: <strong>{log.actor.name}</strong>
                            {log.actor.email ? ` (${log.actor.email})` : ""}
                          </span>
                        </div>
                      )}

                      {/* Event Details Text */}
                      {log.details && (
                        <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300">
                          <p className="font-mono text-[11px] bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 break-words whitespace-pre-wrap">
                            {log.details}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            {auditLogs.length} event{auditLogs.length === 1 ? "" : "s"} logged
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
