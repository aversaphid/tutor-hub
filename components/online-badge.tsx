"use client";

import React from "react";

interface OnlineBadgeProps {
  isOnline: boolean;
  label?: string;
  offlineLabel?: string;
  size?: "xs" | "sm" | "md";
  showOffline?: boolean;
  pulse?: boolean;
  className?: string;
}

export default function OnlineBadge({
  isOnline,
  label = "Online",
  offlineLabel = "Offline",
  size = "sm",
  showOffline = true,
  pulse = true,
  className = "",
}: OnlineBadgeProps) {
  if (!isOnline && !showOffline) return null;

  if (isOnline) {
    const sizeClasses =
      size === "xs"
        ? "px-1.5 py-0.2 text-[9px] gap-1"
        : size === "md"
        ? "px-2.5 py-1 text-xs gap-1.5"
        : "px-2 py-0.5 text-[10px] gap-1.5";

    const dotSize =
      size === "xs" ? "h-1.5 w-1.5" : size === "md" ? "h-2 w-2" : "h-1.5 w-1.5";

    return (
      <span
        className={`inline-flex items-center font-bold rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-2xs whitespace-nowrap transition-all select-none ${sizeClasses} ${className}`}
        title="Active: Opened website and logged in"
      >
        <span className={`relative flex ${dotSize} shrink-0`}>
          {pulse && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full ${dotSize} bg-emerald-500`}></span>
        </span>
        <span>{label}</span>
      </span>
    );
  }

  const sizeClasses =
    size === "xs"
      ? "px-1.5 py-0.2 text-[9px] gap-1"
      : size === "md"
      ? "px-2.5 py-1 text-xs gap-1.5"
      : "px-2 py-0.5 text-[10px] gap-1";

  const dotSize =
    size === "xs" ? "h-1 w-1" : size === "md" ? "h-1.5 w-1.5" : "h-1.5 w-1.5";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 whitespace-nowrap transition-all select-none ${sizeClasses} ${className}`}
      title="Offline: Not currently active on website"
    >
      <span className={`inline-block ${dotSize} rounded-full bg-slate-300 dark:bg-slate-600 shrink-0`}></span>
      <span>{offlineLabel}</span>
    </span>
  );
}
