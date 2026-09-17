"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Calendar,
  Volume2,
  VolumeX,
  Eye,
} from "lucide-react";
import {
  playSessionStartChime,
  playDelayAlertChime,
  playCountdownCompleteChime,
} from "@/lib/audio-cues";
import { useAccessibility } from "@/lib/accessibility";
import confetti from "canvas-confetti";

interface SessionData {
  id: string;
  title: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: "SCHEDULED" | "DELAYED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  delayMinutes: number;
  teamsMeetingUrl?: string | null;
  tutor: { id: string; name: string; email?: string | null };
  tutee: { id: string; name: string; magicKey?: string | null };
}

interface CountdownTimerProps {
  initialSession: SessionData;
  onStatusChange?: (session: SessionData) => void;
}

export default function CountdownTimer({
  initialSession,
  onStatusChange,
}: CountdownTimerProps) {
  const { preferences, updatePreferences, setIsModalOpen } = useAccessibility();
  const [session, setSession] = useState<SessionData>(initialSession);
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    isPast: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isPast: false });

  const [notification, setNotification] = useState<{
    type: "delay" | "started" | "info";
    message: string;
  } | null>(null);

  const prevStatusRef = useRef(initialSession.status);
  const prevDelayRef = useRef(initialSession.delayMinutes);
  const hasTriggeredZeroChime = useRef(false);

  // Sync with session updates from parent (e.g. status changes, delays, start chimes) without duplicate network polling
  useEffect(() => {
    if (!initialSession) return;
    const newSession = initialSession;

    if (newSession.delayMinutes > prevDelayRef.current) {
      const addedMinutes = newSession.delayMinutes - prevDelayRef.current;
      playDelayAlertChime();
      setNotification({
        type: "delay",
        message: `${newSession.tutor?.name || "Your tutor"} added +${addedMinutes} mins to the lesson start time.`,
      });
      prevDelayRef.current = newSession.delayMinutes;
    }

    if (
      prevStatusRef.current !== "IN_PROGRESS" &&
      newSession.status === "IN_PROGRESS"
    ) {
      playSessionStartChime();
      if (!preferences.reducedMotion) {
        try {
          confetti({ particleCount: 70, spread: 60 });
        } catch {}
      }
      setNotification({
        type: "started",
        message: `${newSession.tutor?.name || "Your tutor"} has started the lesson early! Click below to join.`,
      });
    }

    prevStatusRef.current = newSession.status;
    setSession(newSession);
    onStatusChange?.(newSession);
  }, [initialSession, onStatusChange, preferences.reducedMotion]);

  useEffect(() => {
    const calculateTime = () => {
      const targetTime = new Date(session.scheduledStartTime).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalSeconds: 0,
          isPast: true,
        });

        if (!hasTriggeredZeroChime.current && session.status !== "COMPLETED") {
          hasTriggeredZeroChime.current = true;
          playCountdownCompleteChime();
          if (!preferences.reducedMotion) {
            try {
              confetti({ particleCount: 50, spread: 60 });
            } catch {}
          }
        }
      } else {
        const totalSeconds = Math.floor(diff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        setTimeLeft({
          hours,
          minutes,
          seconds,
          totalSeconds,
          isPast: false,
        });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [session.scheduledStartTime, session.status]);

  const isLiveNow =
    session.status === "IN_PROGRESS" ||
    (timeLeft.isPast && session.status !== "COMPLETED");

  const formatDigit = (num: number) => num.toString().padStart(2, "0");

  const startFormatted = new Date(session.scheduledStartTime).toLocaleTimeString(
    [],
    { hour: "2-digit", minute: "2-digit" }
  );
  const endFormatted = new Date(session.scheduledEndTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      {/* Delay / Early start notifications */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border animate-in fade-in ${
            notification.type === "delay"
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
              : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "delay" ? (
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Countdown Box */}
      <div
        role="timer"
        aria-live="polite"
        aria-atomic="true"
        aria-label={
          isLiveNow
            ? "Maths lesson is live now"
            : `Maths lesson starts in ${
                timeLeft.hours > 0 ? `${timeLeft.hours} hours, ` : ""
              }${timeLeft.minutes} minutes and ${timeLeft.seconds} seconds`
        }
        className={`rounded-3xl border p-6 bg-white dark:bg-slate-900 transition-all ${
          isLiveNow
            ? "border-emerald-500 dark:border-emerald-500/80 shadow-lg shadow-emerald-500/10"
            : session.status === "DELAYED"
            ? "border-amber-400 dark:border-amber-500/80 shadow-md"
            : "border-slate-200 dark:border-slate-800 shadow-sm"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Lesson Overview */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isLiveNow
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                    : session.status === "DELAYED"
                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                    : "bg-[#48A5EE]/10 text-[#48A5EE] dark:bg-[#48A5EE]/20"
                }`}
              >
                {session.status === "IN_PROGRESS"
                  ? "● Lesson Live Now"
                  : session.status === "DELAYED"
                  ? `Delayed (+${session.delayMinutes}m)`
                  : "Next Lesson"}
              </span>

              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#48A5EE]" />
                {startFormatted} – {endFormatted}
              </span>

              {/* Quick in-card accessibility toggles */}
              <div className="flex items-center gap-1 ml-auto sm:ml-2">
                <button
                  type="button"
                  onClick={() => updatePreferences({ soundMuted: !preferences.soundMuted })}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={preferences.soundMuted ? "Unmute lesson chimes" : "Mute lesson chimes"}
                  aria-label={preferences.soundMuted ? "Unmute lesson chimes" : "Mute lesson chimes"}
                >
                  {preferences.soundMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="p-1 rounded-lg text-slate-400 hover:text-[#48A5EE] hover:bg-[#48A5EE]/10 transition-colors cursor-pointer"
                  title="Accessibility Options (Text size, Dyslexia font, Contrast)"
                  aria-label="Open accessibility options"
                >
                  <Eye className="w-3.5 h-3.5 text-[#48A5EE]" />
                </button>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
              {session.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Tutor: <strong className="text-slate-700 dark:text-slate-200">{session.tutor?.name || "Tutor"}</strong> • Student:{" "}
              <strong className="text-slate-700 dark:text-slate-200">{session.tutee.name}</strong>
            </p>
          </div>

          {/* Countdown Clock Display */}
          <div className="flex items-center gap-2 shrink-0">
            {isLiveNow ? (
              <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                <div>
                  <div className="text-sm font-bold">LESSON IN PROGRESS</div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">Teams meeting room open</div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center">
                  <div className="digit-box w-13 sm:w-15 h-14 sm:h-18 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-mono text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
                    {formatDigit(timeLeft.hours)}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mt-1">
                    Hours
                  </span>
                </div>

                <div className="h-14 sm:h-18 flex items-center self-start">
                  <span className="text-xl font-bold text-slate-300 dark:text-slate-700">:</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="digit-box w-13 sm:w-15 h-14 sm:h-18 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-mono text-2xl sm:text-3xl font-bold text-[#48A5EE]">
                    {formatDigit(timeLeft.minutes)}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mt-1">
                    Mins
                  </span>
                </div>

                <div className="h-14 sm:h-18 flex items-center self-start">
                  <span className="text-xl font-bold text-slate-300 dark:text-slate-700">:</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="digit-box w-13 sm:w-15 h-14 sm:h-18 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-mono text-2xl sm:text-3xl font-bold text-[#48A5EE]">
                    {formatDigit(timeLeft.seconds)}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mt-1">
                    Secs
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
