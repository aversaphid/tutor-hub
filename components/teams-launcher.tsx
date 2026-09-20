"use client";

import React, { useState } from "react";
import {
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Monitor,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { playSessionStartChime } from "@/lib/audio-cues";

interface TeamsLauncherProps {
  meetingUrl?: string | null;
  isUnlocked: boolean;
  sessionTitle: string;
  tutorName: string;
  isLive?: boolean;
  unlockEarlyMinutes?: number;
}

export default function TeamsLauncher({
  meetingUrl,
  isUnlocked,
  sessionTitle,
  tutorName,
  isLive = false,
  unlockEarlyMinutes = 5,
}: TeamsLauncherProps) {
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedBrowser, setSelectedBrowser] = useState<"edge" | "chrome" | "safari">("edge");

  const getCleanTeamsUrl = (rawUrl?: string | null) => {
    if (!rawUrl) return "";
    try {
      const url = new URL(rawUrl);
      if (!url.searchParams.has("webjoin")) {
        url.searchParams.set("webjoin", "true");
      }
      return url.toString();
    } catch {
      return rawUrl;
    }
  };

  const cleanWebUrl = getCleanTeamsUrl(meetingUrl);

  const getAppProtocolUrl = (rawUrl?: string | null) => {
    if (!rawUrl) return "";
    if (rawUrl.startsWith("msteams:")) return rawUrl;
    return rawUrl.replace(/^https:\/\//i, "msteams://");
  };

  const handleCopyLink = async () => {
    if (!cleanWebUrl) return;
    try {
      await navigator.clipboard.writeText(cleanWebUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleLaunchCleanWindow = () => {
    if (!cleanWebUrl) return;
    playSessionStartChime();
    window.open(
      cleanWebUrl,
      "_blank",
      "noopener,noreferrer,menubar=no,toolbar=no,location=yes,status=no,width=1280,height=800"
    );
  };

  return (
    <div
      className={`relative rounded-3xl border transition-all duration-300 ${
        isUnlocked
          ? "bg-white dark:bg-slate-900 border-[#48A5EE]/50 shadow-lg shadow-[#48A5EE]/10"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
      }`}
    >
      {/* Top Banner */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isUnlocked
                  ? "bg-[#48A5EE]/15 text-[#48A5EE]"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Microsoft Teams Lesson Room
                </h3>
                {isUnlocked && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    <Sparkles className="w-3 h-3" /> Ready
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clean InPrivate session launcher avoiding school &amp; personal 365 account errors
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-5">
        {!isUnlocked ? (
          <div className="text-center py-6 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Teams Meeting Opens {unlockEarlyMinutes} Minutes Before Start
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              The button activates automatically {unlockEarlyMinutes} minutes before your scheduled start time or when{" "}
              <strong className="text-slate-700 dark:text-slate-200">{tutorName}</strong> starts the lesson early.
            </p>
          </div>
        ) : !meetingUrl ? (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {tutorName || "The Tutor"} is Preparing the Lesson Room
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-1 leading-relaxed">
                Teams meeting links are entered manually ~10 minutes before the lesson starts. 
                This screen updates automatically as soon as it is posted.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Big Launch Button */}
            <button
              onClick={handleLaunchCleanWindow}
              className="w-full py-4 px-6 rounded-2xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-base shadow-md shadow-[#48A5EE]/25 flex items-center justify-center gap-3 transition-all transform active:scale-[0.99] cursor-pointer"
            >
              <ExternalLink className="w-5 h-5" />
              <span>Join Lesson (InPrivate / Fresh Window)</span>
            </button>

            {/* Secondary Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>Copy Meeting Link</span>
                  </>
                )}
              </button>

              <a
                href={getAppProtocolUrl(cleanWebUrl)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Monitor className="w-4 h-4 text-[#48A5EE]" />
                <span>Open in Teams Desktop App</span>
              </a>
            </div>

            {/* InPrivate Helpful Guide */}
            <div className="pt-2">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-xs text-[#48A5EE] hover:underline flex items-center gap-1.5 font-medium cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>
                  {showInstructions
                    ? "Hide InPrivate Browser Help"
                    : "Having Microsoft 365 login issues? Click here for 3-step InPrivate guide"}
                </span>
              </button>

              {showInstructions && (
                <div className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Browser:</span>
                    <button
                      onClick={() => setSelectedBrowser("edge")}
                      className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                        selectedBrowser === "edge"
                          ? "bg-[#48A5EE] text-white"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Microsoft Edge
                    </button>
                    <button
                      onClick={() => setSelectedBrowser("chrome")}
                      className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                        selectedBrowser === "chrome"
                          ? "bg-[#48A5EE] text-white"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Google Chrome
                    </button>
                    <button
                      onClick={() => setSelectedBrowser("safari")}
                      className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                        selectedBrowser === "safari"
                          ? "bg-[#48A5EE] text-white"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Apple Safari
                    </button>
                  </div>

                  {selectedBrowser === "edge" && (
                    <div className="space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded font-mono text-[11px]">Ctrl + Shift + N</kbd> to open an InPrivate window.</p>
                      <p>2. Paste the copied link into the top address bar.</p>
                      <p>3. Click <strong>&quot;Continue on this browser&quot;</strong> and type the student&apos;s name to join as a guest without signing in.</p>
                    </div>
                  )}

                  {selectedBrowser === "chrome" && (
                    <div className="space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded font-mono text-[11px]">Ctrl + Shift + N</kbd> for a New Incognito Window.</p>
                      <p>2. Paste the copied Teams meeting link.</p>
                      <p>3. Choose <strong>&quot;Continue on this browser&quot;</strong> to join directly.</p>
                    </div>
                  )}

                  {selectedBrowser === "safari" && (
                    <div className="space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded font-mono text-[11px]">Cmd + Shift + N</kbd> to open a Private Window.</p>
                      <p>2. Paste the meeting URL and click enter.</p>
                      <p>3. Allow camera/microphone when prompted.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
