"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Download,
  ExternalLink,
  RefreshCw,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { downloadICS, getGoogleCalendarUrl, CalendarEvent } from "@/lib/calendar";
import { formatTutorName } from "@/lib/format";
import CalendarSubscriptionModal from "@/components/calendar-subscription-modal";

interface AddToCalendarProps {
  session: {
    id: string;
    scheduledStartTime: string | Date;
    scheduledEndTime: string | Date;
    teamsMeetingUrl?: string | null;
    notes?: string | null;
    tutor?: { name: string } | null;
    tutee?: { name: string } | null;
  };
  compact?: boolean;
}

export default function AddToCalendar({ session, compact = false }: AddToCalendarProps) {
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tutorName = formatTutorName(session.tutor?.name) || "Tutor";
  const studentName = formatTutorName(session.tutee?.name) || "Student";
  const portalUrl = typeof window !== "undefined" ? window.location.origin : "https://lbmathstuition.co.uk";

  const calendarEvent: CalendarEvent = {
    id: session.id,
    title: `Maths Tuition: ${studentName} & ${tutorName}`,
    description: `Online Maths Tuition Session with LB Maths Tuition.\n\nTutor: ${tutorName}\nStudent: ${studentName}\n\nJoin Lesson Lobby: ${portalUrl}\nTeams Link: ${session.teamsMeetingUrl || "Available in portal lobby"}`,
    location: session.teamsMeetingUrl || `${portalUrl}/student`,
    startTime: session.scheduledStartTime,
    endTime: session.scheduledEndTime,
    tutorName,
    studentName,
  };

  const startTimeDate = new Date(session.scheduledStartTime);
  const endTimeDate = new Date(session.scheduledEndTime);

  const formattedDate = startTimeDate.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const formattedTimeRange = `${startTimeDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} – ${endTimeDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;

  const handleDownloadICS = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadICS(calendarEvent);
    setIsModalOpen(false);
  };

  const handleGoogleCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getGoogleCalendarUrl(calendarEvent);
    window.open(url, "_blank", "noopener,noreferrer");
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className={
          compact
            ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
            : "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 shadow-xs transition-colors cursor-pointer"
        }
        title="Add lesson to your calendar"
      >
        <Calendar className="w-3.5 h-3.5 text-[#48A5EE]" />
        <span>Add to Calendar</span>
      </button>

      {/* Centered Modal: Completely immune to table container overflow / scroll clipping */}
      {/* Centered Modal: Completely immune to table container overflow / scroll clipping */}
      {isModalOpen &&
        mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(false);
            }}
          >
            <div
              className="w-full max-w-md bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#48A5EE]/10 border border-[#48A5EE]/20 flex items-center justify-center text-[#48A5EE] shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate">
                      Add Lesson to Calendar
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {formattedDate} &bull; {formattedTimeRange}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto overflow-x-hidden flex-1">
                {/* Lesson Context Pill */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 break-words">
                    Maths Tuition: {studentName} &amp; {tutorName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Student: <strong>{studentName}</strong></span>
                    <span>&bull;</span>
                    <span>Tutor: <strong>{tutorName}</strong></span>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-2.5">
                  {/* 1. Apple Calendar / Outlook */}
                  <button
                    type="button"
                    onClick={handleDownloadICS}
                    className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-left transition-all cursor-pointer group shadow-2xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shrink-0">
                         / O
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#48A5EE] transition-colors truncate">
                          Apple Calendar / Outlook / iCal
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          Download .ics file for iPhone, iPad, Mac &amp; PC
                        </div>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-[#48A5EE] transition-colors shrink-0" />
                  </button>

                  {/* 2. Google Calendar */}
                  <button
                    type="button"
                    onClick={handleGoogleCalendar}
                    className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-left transition-all cursor-pointer group shadow-2xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        G
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#48A5EE] transition-colors truncate">
                          Google Calendar
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          Add directly in browser tab with meeting link
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#48A5EE] transition-colors shrink-0" />
                  </button>

                  {/* 3. Live Calendar Feed (WebCal) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setIsSubModalOpen(true);
                    }}
                    className="w-full p-3.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 hover:bg-purple-100/80 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 text-left transition-all cursor-pointer group shadow-2xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                        <RefreshCw className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5 flex-wrap">
                          <span>Live Calendar Feed</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-[9px] font-black uppercase">
                            Recommended
                          </span>
                        </div>
                        <div className="text-[11px] text-purple-600/80 dark:text-purple-300/70 truncate">
                          Auto-syncing WebCal feed on iPhone &amp; Google
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-200 transition-colors shrink-0" />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* WebCal Subscription Modal */}
      <CalendarSubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
      />
    </>
  );
}
