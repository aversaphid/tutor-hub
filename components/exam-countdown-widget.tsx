"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Calendar,
  Sparkles,
  Calculator,
  FileText,
  ChevronDown,
  ChevronUp,
  Target,
  Flame,
  Award,
  Edit2,
  Check,
  Zap,
  Download,
  ExternalLink,
} from "lucide-react";
import { downloadICS, getGoogleCalendarUrl, CalendarEvent } from "@/lib/calendar";
import { useAccessibility } from "@/lib/accessibility";

export type ExamTier = "GCSE" | "ALEVEL";

export interface ExamPaper {
  id: string;
  title: string;
  subtitle: string;
  targetDate: string; // ISO string e.g. "2027-05-14T09:00:00"
  durationMinutes: number;
  totalMarks: number;
  calculatorAllowed: boolean;
  color: "blue" | "emerald" | "amber" | "purple";
}

interface ExamCountdownWidgetProps {
  onOpenCalculator?: () => void;
  onOpenFormulaSheet?: () => void;
  studentName?: string;
}

const DEFAULT_GCSE_PAPERS: ExamPaper[] = [
  {
    id: "gcse-p1",
    title: "Paper 1 (Non-Calculator)",
    subtitle: "Edexcel / AQA / OCR Higher & Foundation",
    targetDate: "2027-05-14T09:00:00",
    durationMinutes: 90,
    totalMarks: 80,
    calculatorAllowed: false,
    color: "blue",
  },
  {
    id: "gcse-p2",
    title: "Paper 2 (Calculator)",
    subtitle: "Edexcel / AQA / OCR Higher & Foundation",
    targetDate: "2027-06-03T09:00:00",
    durationMinutes: 90,
    totalMarks: 80,
    calculatorAllowed: true,
    color: "emerald",
  },
  {
    id: "gcse-p3",
    title: "Paper 3 (Calculator)",
    subtitle: "Edexcel / AQA / OCR Higher & Foundation",
    targetDate: "2027-06-09T09:00:00",
    durationMinutes: 90,
    totalMarks: 80,
    calculatorAllowed: true,
    color: "amber",
  },
];

const DEFAULT_ALEVEL_PAPERS: ExamPaper[] = [
  {
    id: "alevel-p1",
    title: "Paper 1: Pure Mathematics 1",
    subtitle: "Proof, Algebra, Calculus, Trigonometry",
    targetDate: "2027-06-02T13:30:00",
    durationMinutes: 120,
    totalMarks: 100,
    calculatorAllowed: true,
    color: "purple",
  },
  {
    id: "alevel-p2",
    title: "Paper 2: Pure Mathematics 2",
    subtitle: "Vectors, Integration, Differential Equations",
    targetDate: "2027-06-08T13:30:00",
    durationMinutes: 120,
    totalMarks: 100,
    calculatorAllowed: true,
    color: "blue",
  },
  {
    id: "alevel-p3",
    title: "Paper 3: Statistics & Mechanics",
    subtitle: "Hypothesis Testing, Kinematics, Forces",
    targetDate: "2027-06-18T13:30:00",
    durationMinutes: 120,
    totalMarks: 100,
    calculatorAllowed: true,
    color: "emerald",
  },
];

const STORAGE_KEY = "lb_maths_student_exam_countdown_v3";

export default function ExamCountdownWidget({
  onOpenCalculator,
  onOpenFormulaSheet,
  studentName = "Student",
}: ExamCountdownWidgetProps) {
  const { preferences } = useAccessibility();
  const [tier, setTier] = useState<ExamTier>("GCSE");
  const [targetGrade, setTargetGrade] = useState<string>("Grade 8");
  // Default is collapsed as requested by user
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Live ticking clock state
  const [now, setNow] = useState<number>(Date.now());

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tier === "GCSE" || parsed.tier === "ALEVEL") {
          setTier(parsed.tier);
        }
        if (parsed.targetGrade) setTargetGrade(parsed.targetGrade);
        if (typeof parsed.isCollapsed === "boolean") {
          setIsCollapsed(parsed.isCollapsed);
        }
      }
    } catch {}
    setMounted(true);
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tier,
          targetGrade,
          isCollapsed,
        })
      );
    } catch {}
  }, [tier, targetGrade, isCollapsed, mounted]);

  // Real-time ticking every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Active papers (strictly GCSE or A-Level, no mocks)
  const activePapers = useMemo(() => {
    if (tier === "ALEVEL") return DEFAULT_ALEVEL_PAPERS;
    return DEFAULT_GCSE_PAPERS;
  }, [tier]);

  // Compute countdown metrics for each paper
  const paperMetrics = useMemo(() => {
    return activePapers.map((paper) => {
      const targetTime = new Date(paper.targetDate).getTime();
      const diffMs = targetTime - now;
      const isPast = diffMs <= 0;

      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      // Calculate progress relative to academic term (e.g. Sept 1, 2026 to targetDate)
      const startDate = new Date(new Date(paper.targetDate).getFullYear() - 1, 8, 1).getTime();
      const totalSpan = targetTime - startDate;
      const elapsed = now - startDate;
      const progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalSpan) * 100)));

      return {
        ...paper,
        isPast,
        diffMs,
        days,
        hours,
        minutes,
        seconds,
        totalSeconds,
        progressPercent,
      };
    });
  }, [activePapers, now]);

  // Find the next upcoming paper
  const nextUpcoming = useMemo(() => {
    const upcoming = paperMetrics.filter((p) => !p.isPast);
    if (upcoming.length === 0) return null;
    return upcoming.sort((a, b) => a.diffMs - b.diffMs)[0];
  }, [paperMetrics]);

  // Dynamic revision advice based on weeks to the next upcoming paper
  const revisionAdvice = useMemo(() => {
    if (!nextUpcoming) {
      return {
        title: "All Target Papers Complete!",
        desc: "Well done on completing your exams! Celebrate your hard work and achievements.",
        badge: "Exam Season Finished",
        badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
      };
    }

    const weeksLeft = Math.ceil(nextUpcoming.days / 7);

    if (weeksLeft > 16) {
      return {
        title: `Foundations & Mastery • ${weeksLeft} Weeks Left`,
        desc: "Focus on topic-by-topic comprehension. Target your weakest algebra & geometry areas with your tutor.",
        badge: "Foundation Phase",
        badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
      };
    } else if (weeksLeft > 8) {
      return {
        title: `Exam Technique & Past Questions • ${weeksLeft} Weeks Left`,
        desc: "Begin mixing topics together. Complete 1 timed past paper section each week and analyse mark schemes.",
        badge: "Technique Phase",
        badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
      };
    } else if (weeksLeft > 2) {
      return {
        title: `High-Intensity Past Papers • ${weeksLeft} Weeks Left`,
        desc: "Full 80-100 mark mock papers under strict exam conditions. Focus on Grade 7-9 problem solving questions.",
        badge: "Sprint Phase",
        badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
      };
    } else {
      return {
        title: `Final Polish & Confidence • ${nextUpcoming.days} Days Left!`,
        desc: "Memorize remaining formula sheets, practice mental arithmetic, and rest well before exam day.",
        badge: "Final Stretch",
        badgeColor: preferences?.reducedMotion
          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
          : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse",
      };
    }
  }, [nextUpcoming, preferences?.reducedMotion]);

  const handleExportPaperToCalendar = (paper: typeof paperMetrics[0]) => {
    const event: CalendarEvent = {
      id: `exam-${paper.id}`,
      title: `Exam: ${paper.title}`,
      description: `${paper.subtitle}\nDuration: ${paper.durationMinutes} mins\nTotal Marks: ${paper.totalMarks}\nCalculator Allowed: ${paper.calculatorAllowed ? "YES" : "NO"}`,
      location: "School / Exam Centre",
      startTime: paper.targetDate,
      endTime: new Date(new Date(paper.targetDate).getTime() + paper.durationMinutes * 60000).toISOString(),
    };
    downloadICS(event);
  };

  const handleGoogleCalPaper = (paper: typeof paperMetrics[0]) => {
    const event: CalendarEvent = {
      id: `exam-${paper.id}`,
      title: `Exam: ${paper.title}`,
      description: `${paper.subtitle}\nDuration: ${paper.durationMinutes} mins\nTotal Marks: ${paper.totalMarks}\nCalculator Allowed: ${paper.calculatorAllowed ? "YES" : "NO"}`,
      location: "School / Exam Centre",
      startTime: paper.targetDate,
      endTime: new Date(new Date(paper.targetDate).getTime() + paper.durationMinutes * 60000).toISOString(),
    };
    const url = getGoogleCalendarUrl(event);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm transition-all duration-200 space-y-4">
      {/* Header & Controls Bar */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          !isCollapsed ? "border-b border-slate-100 dark:border-slate-800/80 pb-4" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#48A5EE] to-[#2563eb] text-white flex items-center justify-center shadow-sm shrink-0">
            <Clock className={`w-5 h-5 ${preferences?.reducedMotion ? "" : "animate-spin-slow"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>Maths Exam Countdown</span>
              </h2>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${revisionAdvice.badgeColor}`}>
                {revisionAdvice.badge}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Official summer exam dates ticking in real time
            </p>
          </div>
        </div>

        {/* Action controls: Tier Picker (GCSE / A-Level) + Target Grade + Collapse Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Tier buttons: GCSE & A-Level only */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTier("GCSE")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                tier === "GCSE"
                  ? "bg-white dark:bg-slate-700 text-[#48A5EE] dark:text-sky-300 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              GCSE
            </button>
            <button
              type="button"
              onClick={() => setTier("ALEVEL")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                tier === "ALEVEL"
                  ? "bg-white dark:bg-slate-700 text-[#48A5EE] dark:text-sky-300 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              A-Level
            </button>
          </div>

          {/* Target Grade Badge / Selector */}
          <div className="relative">
            {isEditingTarget ? (
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded-xl px-2 py-1 text-xs">
                <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <select
                  value={targetGrade}
                  onChange={(e) => {
                    setTargetGrade(e.target.value);
                    setIsEditingTarget(false);
                  }}
                  onBlur={() => setIsEditingTarget(false)}
                  autoFocus
                  className="bg-transparent font-bold text-amber-900 dark:text-amber-200 text-xs focus:outline-hidden cursor-pointer"
                >
                  <optgroup label="GCSE Grades">
                    <option value="Grade 9">Grade 9 (Top 3%)</option>
                    <option value="Grade 8">Grade 8 (A* Equiv)</option>
                    <option value="Grade 7">Grade 7 (A Equiv)</option>
                    <option value="Grade 6">Grade 6 (Strong Pass)</option>
                    <option value="Grade 5">Grade 5 (Standard Pass)</option>
                    <option value="Grade 4">Grade 4 (Pass)</option>
                  </optgroup>
                  <optgroup label="A-Level Grades">
                    <option value="Grade A*">Grade A*</option>
                    <option value="Grade A">Grade A</option>
                    <option value="Grade B">Grade B</option>
                    <option value="Grade C">Grade C</option>
                  </optgroup>
                </select>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTarget(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-bold transition-colors cursor-pointer"
                title="Click to change your target grade"
              >
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Target: {targetGrade}</span>
                <Edit2 className="w-3 h-3 opacity-60 ml-0.5" />
              </button>
            )}
          </div>

          {/* Collapse/Expand toggle button */}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? "Expand countdown clocks" : "Collapse countdown clocks"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* When Collapsed: Sleek Single-Line Summary */}
      {isCollapsed ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-200">
              Next Up: {nextUpcoming ? nextUpcoming.title : "Exam Season Complete"}
            </span>
            {nextUpcoming && (
              <span className="px-2 py-0.5 rounded-full bg-[#48A5EE]/10 text-[#48A5EE] font-extrabold text-[11px]">
                {nextUpcoming.days} days, {nextUpcoming.hours}h remaining
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="text-[#48A5EE] hover:underline font-bold text-xs self-start sm:self-auto cursor-pointer flex items-center gap-1"
          >
            <span>View 3 Exam Clocks &amp; Milestones</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          {/* Revision Pacing Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-sky-50/50 dark:from-blue-950/30 dark:to-sky-950/20 border border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-200">
                <Flame
                  className={`w-4 h-4 text-orange-500 ${
                    preferences?.reducedMotion ? "" : "animate-bounce"
                  }`}
                />
                <span>{revisionAdvice.title}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {revisionAdvice.desc}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onOpenCalculator && (
                <button
                  type="button"
                  onClick={onOpenCalculator}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
                  title="Practice with Casio fx-83GTX"
                >
                  <Calculator className="w-3.5 h-3.5 text-[#48A5EE]" />
                  <span>Casio Calc</span>
                </button>
              )}
              {onOpenFormulaSheet && (
                <button
                  type="button"
                  onClick={onOpenFormulaSheet}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
                  title="View Formula Sheet"
                >
                  <FileText className="w-3.5 h-3.5 text-[#48A5EE]" />
                  <span>Formula Sheet</span>
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid: 3 Countdown Clocks (Paper 1, Paper 2, Paper 3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paperMetrics.map((paper) => {
              const isNext = nextUpcoming?.id === paper.id;
              const formattedDate = new Date(paper.targetDate).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const formattedTime = new Date(paper.targetDate).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={paper.id}
                  className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all duration-200 shadow-xs ${
                    isNext
                      ? "bg-white dark:bg-slate-900 border-[#48A5EE] ring-2 ring-[#48A5EE]/20 dark:ring-[#48A5EE]/30"
                      : "bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {/* Next Up Tag */}
                  {isNext && (
                    <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-[#48A5EE] text-white text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Next Exam</span>
                    </div>
                  )}

                  {/* Top: Title & Calculator Badge */}
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 leading-snug">
                        {paper.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {paper.subtitle}
                      </p>
                    </div>

                    {/* Meta pills: Date & Calculator allowance */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                        <Calendar className="w-3 h-3 text-[#48A5EE]" />
                        <span>
                          {formattedDate} • {formattedTime}
                        </span>
                      </span>

                      {paper.calculatorAllowed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          <Calculator className="w-3 h-3" />
                          <span>Calculator Allowed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                          <Zap className="w-3 h-3" />
                          <span>Non-Calculator</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Center: Live Ticking Countdown Digits */}
                  <div className="my-4 py-3 px-2 rounded-2xl bg-white dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
                    {paper.isPast ? (
                      <div className="text-center py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4" />
                        <span>Exam Passed / Completed</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-1 sm:gap-1.5 text-center">
                        {/* Days */}
                        <div className="flex flex-col items-center">
                          <span className="text-lg sm:text-xl font-black tracking-tight text-slate-800 dark:text-slate-100 font-mono">
                            {paper.days}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                            Days
                          </span>
                        </div>
                        {/* Hours */}
                        <div className="flex flex-col items-center">
                          <span className="text-lg sm:text-xl font-black tracking-tight text-slate-800 dark:text-slate-100 font-mono">
                            {String(paper.hours).padStart(2, "0")}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                            Hours
                          </span>
                        </div>
                        {/* Minutes */}
                        <div className="flex flex-col items-center">
                          <span className="text-lg sm:text-xl font-black tracking-tight text-slate-800 dark:text-slate-100 font-mono">
                            {String(paper.minutes).padStart(2, "0")}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                            Mins
                          </span>
                        </div>
                        {/* Seconds */}
                        <div className="flex flex-col items-center">
                          <span
                            className={`text-lg sm:text-xl font-black tracking-tight text-[#48A5EE] font-mono ${
                              preferences?.reducedMotion ? "" : "animate-pulse"
                            }`}
                          >
                            {String(paper.seconds).padStart(2, "0")}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                            Secs
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Progress Bar & Actions */}
                  <div className="space-y-2.5 pt-1">
                    {/* Revision Journey Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>Preparation Journey</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {paper.progressPercent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isNext ? "bg-[#48A5EE]" : "bg-slate-400 dark:bg-slate-600"
                          }`}
                          style={{ width: `${paper.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Action links */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {paper.durationMinutes}m • {paper.totalMarks} Marks
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleExportPaperToCalendar(paper)}
                          className="inline-flex items-center gap-1 text-[#48A5EE] hover:text-[#3292dc] font-bold transition-colors cursor-pointer"
                          title="Download .ics Calendar Event for this exam"
                        >
                          <Download className="w-3 h-3" />
                          <span>.ics</span>
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <button
                          type="button"
                          onClick={() => handleGoogleCalPaper(paper)}
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors cursor-pointer"
                          title="Add to Google Calendar"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Google</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
