"use client";

import React, { useMemo } from "react";
import { Timer, Clock } from "lucide-react";

interface LessonCountdownBadgeProps {
  startTime: string | Date | number;
  currentTime: number;
  status?: string;
  isLive?: boolean;
  className?: string;
}

export default function LessonCountdownBadge({
  startTime,
  currentTime,
  status,
  isLive = false,
  className = "",
}: LessonCountdownBadgeProps) {
  const countdown = useMemo(() => {
    if (isLive || status === "IN_PROGRESS" || status === "COMPLETED" || status === "CANCELLED") {
      return null;
    }

    const startMs = new Date(startTime).getTime();
    if (isNaN(startMs)) return null;

    const diffMs = startMs - currentTime;
    const diffSec = Math.floor(diffMs / 1000);

    // If lesson start time has arrived or passed by up to 30 mins and not yet completed
    if (diffSec <= 0) {
      if (diffSec >= -1800) {
        return {
          type: "ready" as const,
          text: "Ready to start",
        };
      }
      return null;
    }

    const days = Math.floor(diffSec / 86400);
    const hours = Math.floor((diffSec % 86400) / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;

    let text = "";
    if (days > 0) {
      text = `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
      text = `${hours}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
    } else if (mins > 0) {
      text = `${mins}m ${String(secs).padStart(2, "0")}s`;
    } else {
      text = `${secs}s`;
    }

    return {
      type: diffSec <= 600 ? ("urgent" as const) : diffSec <= 86400 ? ("soon" as const) : ("future" as const),
      text,
      diffSec,
    };
  }, [startTime, currentTime, status, isLive]);

  if (!countdown) return null;

  if (countdown.type === "ready") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 shadow-2xs ${className}`}
        title={`Lesson is scheduled to begin now (${new Date(startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span>Ready to start</span>
      </span>
    );
  }

  if (countdown.type === "urgent") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs ${className}`}
        title={`Lesson begins at ${new Date(startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
      >
        <Timer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
        <span>Starts in <strong className="font-mono tracking-tight font-extrabold">{countdown.text}</strong></span>
      </span>
    );
  }

  if (countdown.type === "soon") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#48A5EE]/10 dark:bg-[#48A5EE]/20 text-[#1d7cc7] dark:text-[#70bbf4] border border-[#48A5EE]/30 dark:border-[#48A5EE]/40 shadow-2xs ${className}`}
        title={`Lesson begins at ${new Date(startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
      >
        <Timer className="w-3.5 h-3.5 text-[#48A5EE] shrink-0" />
        <span>Starts in <strong className="font-mono tracking-tight font-extrabold">{countdown.text}</strong></span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 ${className}`}
      title={`Lesson scheduled for ${new Date(startTime).toLocaleString()}`}
    >
      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span>Starts in <span className="font-mono tracking-tight font-bold">{countdown.text}</span></span>
    </span>
  );
}
