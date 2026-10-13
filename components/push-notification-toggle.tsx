"use client";

import React, { useState } from "react";
import { Bell, BellOff, Check, Loader2, Send, AlertCircle, Smartphone, Share, PlusSquare } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface PushNotificationToggleProps {
  userRole?: "TUTOR" | "TUTEE" | "HEAD_TUTOR";
  compact?: boolean;
}

export default function PushNotificationToggle({
  userRole = "TUTEE",
  compact = false,
}: PushNotificationToggleProps) {
  const {
    isSupported,
    isIOS,
    isStandalone,
    permission,
    isSubscribed,
    loading,
    statusMessage,
    subscribe,
    unsubscribe,
    testPush,
    clearStatusMessage,
  } = usePushNotifications();

  const [testSent, setTestSent] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleToggle = async () => {
    clearStatusMessage();
    if (isIOS && !isStandalone) {
      window.dispatchEvent(new CustomEvent("trigger-pwa-install"));
      return;
    }
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTest = async () => {
    setTesting(true);
    const ok = await testPush();
    setTesting(false);
    if (ok) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  // Apple iOS Safari Specific Warning: Not in Home Screen standalone mode
  if (isIOS && !isStandalone) {
    if (compact) {
      return (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("trigger-pwa-install"))}
          title="On iPhone/iPad, add LB Maths to your Home Screen to unlock push notifications"
          className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>iOS: Add to Home Screen</span>
        </button>
      );
    }

    return (
      <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-700">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Apple iOS Requirement (Safari)
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                Action Required
              </span>
            </div>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Apple requires web apps to be added to your <strong>Home Screen</strong> before notifications can be turned on.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-[11px] text-amber-700 dark:text-amber-300/80 flex items-center gap-1.5 flex-wrap">
            <span>Tap Share</span>
            <Share className="w-3 h-3 text-amber-600 dark:text-amber-400 inline" />
            <span>➔ &apos;Add to Home Screen&apos;</span>
            <PlusSquare className="w-3 h-3 text-amber-600 dark:text-amber-400 inline" />
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("trigger-pwa-install"))}
            className="px-3 py-1.5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <span>View 3-Step Guide</span>
          </button>
        </div>
      </div>
    );
  }

  if (!isSupported) {
    if (compact) return null;
    return (
      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
        <BellOff className="w-4 h-4 text-slate-400 shrink-0" />
        <span>Web Push notifications are not supported on this browser or private window.</span>
      </div>
    );
  }

  // Compact header/lobby button style
  if (compact) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        title={
          isSubscribed
            ? "Push notifications enabled (Click to turn off)"
            : "Turn on push notifications for lesson start & delay alerts"
        }
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
          isSubscribed
            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
        }`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#48A5EE]" />
        ) : isSubscribed ? (
          <Bell className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-600/20" />
        ) : (
          <BellOff className="w-3.5 h-3.5 text-slate-400" />
        )}
        <span>{isSubscribed ? "Alerts On" : "Enable Alerts"}</span>
      </button>
    );
  }

  // Full settings card UI (used in Tutor Settings and Student Lobby / Modals)
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isSubscribed
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                : "bg-[#48A5EE]/10 dark:bg-[#48A5EE]/20 text-[#48A5EE] border border-[#48A5EE]/20"
            }`}
          >
            {isSubscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Lesson Web Push Notifications
              </h4>
              {isSubscribed && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {userRole === "TUTOR" || userRole === "HEAD_TUTOR"
                ? "Receive alerts when students enter the waiting lobby, update topics, or request assistance."
                : "Receive alerts on your phone or computer when your lesson unlocks, Teams links update, or delays occur."}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isSubscribed}
          onClick={handleToggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
            isSubscribed ? "bg-[#48A5EE]" : "bg-slate-300 dark:bg-slate-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
              isSubscribed ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Permission warning if blocked */}
      {permission === "denied" && (
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>
            Notifications are blocked in your browser site permissions. Click the lock/tune icon in your address bar to re-enable.
          </span>
        </div>
      )}

      {/* Status feedback message */}
      {statusMessage && (
        <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
          {statusMessage}
        </p>
      )}

      {/* Test notification button */}
      {isSubscribed && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Send a sample push notification to this device:
          </span>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="w-3 h-3 animate-spin text-[#48A5EE]" />
            ) : testSent ? (
              <Check className="w-3 h-3 text-emerald-600" />
            ) : (
              <Send className="w-3 h-3 text-[#48A5EE]" />
            )}
            <span>{testSent ? "Alert Sent!" : "Test Notification"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
