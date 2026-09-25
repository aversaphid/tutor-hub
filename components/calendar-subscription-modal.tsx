"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Globe,
  Mail,
  Sparkles,
} from "lucide-react";

interface CalendarSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  magicKey?: string;
}

export default function CalendarSubscriptionModal({
  isOpen,
  onClose,
  title = "Live Calendar Subscription",
  subtitle = "Sync your lessons directly to your phone and computer calendar with automatic live updates.",
  magicKey,
}: CalendarSubscriptionModalProps) {
  const [feedData, setFeedData] = useState<{
    webcalUrl?: string;
    httpsUrl?: string;
    googleCalendarUrl?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError("");
      const fetchUrl = magicKey
        ? `/api/calendar/feed-url?key=${encodeURIComponent(magicKey)}`
        : "/api/calendar/feed-url";
      fetch(fetchUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to retrieve calendar subscription link.");
          return res.json();
        })
        .then((data) => {
          setFeedData(data);
        })
        .catch((err) => {
          console.error(err);
          setError("Could not load your calendar feed URL. Please try again.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!feedData?.httpsUrl) return;
    try {
      await navigator.clipboard.writeText(feedData.httpsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleAppleSubscribe = () => {
    if (!feedData?.webcalUrl) return;
    window.location.href = feedData.webcalUrl;
  };

  const handleGoogleSubscribe = () => {
    if (!feedData?.googleCalendarUrl) return;
    window.open(feedData.googleCalendarUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-sub-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#48A5EE]/10 border border-[#48A5EE]/20 flex items-center justify-center text-[#48A5EE] shrink-0">
                <RefreshCw className="w-3.5 h-3.5" />
              </div>
              <h3 id="calendar-sub-title" className="text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate">
                {title}
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-9 break-words">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto overflow-x-hidden flex-1 text-xs">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <RefreshCw className="w-6 h-6 text-[#48A5EE] animate-spin" />
              <p className="text-slate-400 font-medium">Generating your secure live calendar feed...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
              {error}
            </div>
          ) : (
            <>
              {/* Highlight Banner */}
              <div className="p-3.5 rounded-2xl bg-[#48A5EE]/10 border border-[#48A5EE]/20 text-slate-700 dark:text-slate-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-[#48A5EE] text-xs">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Always Up-to-Date</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                  Unlike a one-time download, a calendar subscription stays connected. Any rescheduled lessons, cancellations, or new bookings will automatically sync directly to your devices!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-0.5">
                {/* 1. Apple Calendar (iOS / Mac) */}
                <button
                  type="button"
                  onClick={handleAppleSubscribe}
                  className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs shrink-0">
                      
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-bold truncate">Apple Calendar</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate">
                        One-click subscribe on iPhone, iPad &amp; Mac
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors shrink-0" />
                </button>

                {/* 2. Google Calendar */}
                <button
                  type="button"
                  onClick={handleGoogleSubscribe}
                  className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      G
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-bold truncate">Google Calendar</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate">
                        Add to your Google account from URL
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors shrink-0" />
                </button>

                {/* 3. Copy WebCal Feed URL */}
                <div className="pt-1.5 space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">
                    Subscribe URL (Outlook / Thunderbird / Other Apps):
                  </label>
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="text"
                      readOnly
                      value={feedData?.httpsUrl || ""}
                      className="flex-1 min-w-0 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400 select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="shrink-0 py-2.5 px-3.5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    In Outlook: Click <em>Add Calendar</em> &rarr; <em>Subscribe from Web</em>, then paste this URL.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
