"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, Download, ExternalLink, ChevronDown, RefreshCw } from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const handleDownloadICS = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadICS(calendarEvent);
    setIsOpen(false);
  };

  const handleGoogleCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getGoogleCalendarUrl(calendarEvent);
    window.open(url, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
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
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1.5 w-60 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-1.5 z-30 space-y-1">
            <button
              type="button"
              onClick={handleDownloadICS}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-left transition-colors cursor-pointer group"
            >
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#48A5EE] transition-colors" />
              <div className="flex flex-col">
                <span className="font-semibold">Apple / Outlook / iCal</span>
                <span className="text-[10px] text-slate-400">Download .ics for iPhone &amp; PC</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleGoogleCalendar}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-left transition-colors cursor-pointer group"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#48A5EE] transition-colors" />
              <div className="flex flex-col">
                <span className="font-semibold">Google Calendar</span>
                <span className="text-[10px] text-slate-400">Open in browser tab</span>
              </div>
            </button>

            <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  setIsSubModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl text-left transition-colors cursor-pointer group"
              >
                <RefreshCw className="w-3.5 h-3.5 text-purple-500 transition-transform group-hover:rotate-180 duration-500" />
                <div className="flex flex-col">
                  <span className="font-semibold">Live Calendar Feed</span>
                  <span className="text-[10px] text-purple-500/80">Auto-syncing WebCal feed</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      <CalendarSubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
      />
    </>
  );
}
