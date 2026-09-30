"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Video,
  Calculator,
  BookOpen,
  Calendar,
  CalendarPlus,
  Eye,
  CheckCircle2,
  Play,
  Clock,
  GraduationCap,
  Check,
  ShieldCheck,
  Users,
  HelpCircle,
} from "lucide-react";

export interface TutorialUser {
  id?: string;
  name?: string;
  role?: string;
}

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: TutorialUser | null;
}

interface TourStep {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  icon: typeof Sparkles;
  targetSelector: string;
  sampleType?:
    | "teams_input"
    | "teams_launcher"
    | "topic_box"
    | "calculator"
    | "formulas"
    | "lesson_controls"
    | "students_tab"
    | "lessons_tab";
  description: string;
  tips: string[];
}

export default function TutorialModal({ isOpen, onClose, user }: TutorialModalProps) {
  const isAdmin = user?.role === "HEAD_TUTOR";
  const isTutor = user?.role === "TUTOR";

  const [activeTab, setActiveTab] = useState<"student" | "tutor">(
    isTutor ? "tutor" : "student"
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  // Spotlight geometry state
  const [highlightRect, setHighlightRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [isUsingSample, setIsUsingSample] = useState(false);

  const sampleContainerRef = useRef<HTMLDivElement>(null);

  // Define steps for Student
  const studentSteps: TourStep[] = [
    {
      id: "student-welcome",
      title: `Welcome to LB Maths Tuition${user?.name ? `, ${user.name}` : ""}!`,
      badge: "Student Hub",
      badgeColor: "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300",
      icon: GraduationCap,
      targetSelector: '[data-tour="student-header"]',
      description:
        "This is your central maths lesson lobby. Everything you need for your weekly lessons is organized right here. You can click the 'Hub Guide' button on this top banner anytime to replay this walkthrough.",
      tips: [
        "View your verification status, switch student accounts, or launch the Hub Guide.",
        "Your upcoming session details update automatically in real time.",
      ],
    },
    {
      id: "student-teams",
      title: "Joining Your Live Lesson & Countdown",
      badge: "Lesson Access",
      badgeColor: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300",
      icon: Video,
      targetSelector: '[data-tour="student-teams-card"]',
      sampleType: "teams_launcher",
      description:
        "When it is lesson time, joining takes just one click. The Teams Meeting button unlocks automatically 5 minutes before your scheduled start time, or immediately once your tutor begins.",
      tips: [
        "A live ticking countdown badge displays how much time remains until start.",
        "The button opens your Microsoft Teams meeting room safely and directly.",
      ],
    },
    {
      id: "student-topic",
      title: "What Would You Like to Cover Today?",
      badge: "Lesson Focus",
      badgeColor: "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300",
      icon: BookOpen,
      targetSelector: '[data-tour="student-topic-box"]',
      sampleType: "topic_box",
      description:
        "Type the maths topics, tricky questions, or homework tasks you would like to work on during your lesson. Your tutor sees your entered topics immediately on their dashboard.",
      tips: [
        "Gives your tutor advance notice to prepare past papers and custom worksheets.",
        "Type your focus area and click 'Save' (or press Enter) anytime before or during your lesson.",
      ],
    },
    {
      id: "student-calculator",
      title: "Built-In Casio fx-83GTX & fx-991CW Calculator",
      badge: "Maths Tools",
      badgeColor: "bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300",
      icon: Calculator,
      targetSelector: '[data-tour="student-calculator"]',
      sampleType: "calculator",
      description:
        "Use the authentic built-in Casio scientific & graphical calculator during your lesson without switching apps or searching for your physical calculator.",
      tips: [
        "Supports Natural V.P.A.M. mathematical display for fractions and powers.",
        "Switch between Classic, Pastel Pink, and Bright Cyan themes.",
        "Fast keyboard typing supported for effortless number entry.",
      ],
    },
    {
      id: "student-exams-formulas",
      title: "Formula Sheets & Exam Countdown",
      badge: "Revision & Exams",
      badgeColor: "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300",
      icon: BookOpen,
      targetSelector: '[data-tour="student-formulas"]',
      sampleType: "formulas",
      description:
        "Quickly look up official GCSE & A-Level formula sheets (Edexcel, AQA, OCR) and track days remaining until your exam dates.",
      tips: [
        "Instant overlay means you never lose your place during tuition.",
        "Live exam countdowns keep GCSE and A-Level revision targets in clear sight.",
      ],
    },
    {
      id: "student-calendar",
      title: "Add to Personal Calendar",
      badge: "Schedule Sync",
      badgeColor: "bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300",
      icon: CalendarPlus,
      targetSelector: '[data-tour="student-calendar"]',
      description:
        "Sync your scheduled maths lessons directly with Apple Calendar, Google Calendar, or Outlook to stay organized and receive reminders.",
      tips: [
        "Download .ics files for single sessions or subscribe to your full live feed.",
        "Keeps family and student calendars automatically updated when lesson times change.",
      ],
    },
    {
      id: "student-a11y",
      title: "Accessibility Options",
      badge: "Personalisation",
      badgeColor: "bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300",
      icon: Eye,
      targetSelector: '[data-tour="navbar-a11y"]',
      description:
        "Click the eye icon in the top navigation bar to adjust text sizes, enable the dyslexia-friendly font (OpenDyslexic), toggle sound alerts, or switch to high contrast mode.",
      tips: [
        "Supports 3 text scaling sizes and OpenDyslexic font for easier reading.",
        "Toggle sound chimes for lesson start notices and delay alerts.",
        "Accessibility preferences save automatically in your browser.",
      ],
    },
    {
      id: "student-guide",
      title: "Hub Guide & Replaying the Tour",
      badge: "Top Banner",
      badgeColor: "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300",
      icon: HelpCircle,
      targetSelector: '[data-tour="navbar-guide"]',
      description:
        "Click the Hub Guide (?) icon right here in the top banner next to the accessibility options anytime you want to replay this guide or review features.",
      tips: [
        "Located right next to the Accessibility Eye icon in the top banner.",
        "You can press Escape or click the X button anytime to close the tour.",
      ],
    },
  ];

  // Define steps for Tutor
  const tutorSteps: TourStep[] = [
    {
      id: "tutor-welcome",
      title: `Welcome to the Tutor Workspace${user?.name ? `, ${user.name}` : ""}!`,
      badge: "Workspace",
      badgeColor: "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300",
      icon: ShieldCheck,
      targetSelector: '[data-tour="tutor-header"]',
      description:
        "Your command center for managing tuition sessions, monitoring queues, taking lesson notes, and coordinating learning materials. You can click 'Guide' on this header banner anytime to replay this walkthrough.",
      tips: [
        "Direct visibility of active and upcoming student lessons.",
        "Quick access to tools, formula sheets, and your weekly timetable.",
      ],
    },
    {
      id: "tutor-teams",
      title: "Setting Up Teams Meeting Links",
      badge: "Teams Setup",
      badgeColor: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300",
      icon: Video,
      targetSelector: '[data-tour="tutor-teams-input"]',
      sampleType: "teams_input",
      description:
        "Paste your Microsoft Teams meeting link here in advance. Hovering over the label shows: 'This link will be displayed to the student 5 minutes before the lesson'.",
      tips: [
        "Students only see the link when unlocked, preventing early unexpected intrusions.",
        "Save once, and the link automatically updates for the student lobby.",
      ],
    },
    {
      id: "tutor-flow",
      title: "Starting & Completing Lessons",
      badge: "Session Control",
      badgeColor: "bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300",
      icon: Play,
      targetSelector: '[data-tour="tutor-lesson-controls"]',
      sampleType: "lesson_controls",
      description:
        "Click 'Start Lesson' when ready: changes status to In Progress and unlocks the student meeting button immediately. Click 'End Lesson' to record notes and homework.",
      tips: [
        "Live status updates sync across both tutor and student lobbies in real time.",
        "Completion logs capture duration and topics for billing and parent reviews.",
      ],
    },
    {
      id: "tutor-students-tab",
      title: "My Assigned Students Tab",
      badge: "Student Roster",
      badgeColor: "bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300",
      icon: Users,
      targetSelector: '[data-tour="tutor-tab-students"]',
      sampleType: "students_tab",
      description:
        "Switch to this tab to see all students assigned to your tuition roster, view their 4-digit login PINs, copy 1-click magic links, and unlock PINs if a student entered wrong attempts.",
      tips: [
        "Copy and send magic access links directly to students who forgot their PIN.",
        "Unlock locked accounts with one click without needing an administrator.",
      ],
    },
    {
      id: "tutor-lessons-tab",
      title: "Upcoming Lessons Tab",
      badge: "Lesson Schedule",
      badgeColor: "bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300",
      icon: Calendar,
      targetSelector: '[data-tour="tutor-tab-lessons"]',
      sampleType: "lessons_tab",
      description:
        "Browse your full calendar of scheduled upcoming and past tuition sessions. Filter by student name, search covered topics, or view student homework logs.",
      tips: [
        "Search past sessions by keywords or student names to check topics covered.",
        "Keeps track of scheduled duration, times, and upcoming lesson dates.",
      ],
    },
    {
      id: "tutor-timetable",
      title: "Timetable Grid & Open Slot Finder",
      badge: "Timetable",
      badgeColor: "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300",
      icon: Clock,
      targetSelector: '[data-tour="tutor-timetable"]',
      description:
        "Click 'My Timetable' in the top header to view your full interactive weekly grid. Send 5m/10m delay notices or reschedule lessons conflict-free.",
      tips: [
        "Use 'Find Open Slot' to quickly discover mutual openings across schedules.",
        "Students get real-time delay notices if a lesson starts 5 or 10 minutes late.",
      ],
    },
    {
      id: "tutor-guide",
      title: "Workspace Guide & Help",
      badge: "Top Banner",
      badgeColor: "bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300",
      icon: HelpCircle,
      targetSelector: '[data-tour="navbar-guide"]',
      description:
        "Click the Guide (?) icon in the top banner next to the accessibility options anytime to replay this walkthrough.",
      tips: [
        "Easily accessible from the top banner across all your tutor dashboard views.",
        "Toggle between student and tutor previews anytime using the switcher.",
      ],
    },
  ];

  const steps = activeTab === "student" ? studentSteps : tutorSteps;
  const current = steps[currentStep] || steps[0];
  const isLastStep = currentStep === steps.length - 1;

  // Sync tab when opening
  useEffect(() => {
    if (isAdmin) return;
    if (isOpen) {
      setActiveTab(isTutor ? "tutor" : "student");
      setCurrentStep(0);
    }
  }, [isOpen, isAdmin, isTutor]);

  // Measure and position spotlight when step or tab changes
  useEffect(() => {
    if (!isOpen || isAdmin) return;

    let timeoutId: NodeJS.Timeout;

    const measure = (shouldScroll = false) => {
      const activeSteps = activeTab === "student" ? studentSteps : tutorSteps;
      const targetStep = activeSteps[currentStep] || activeSteps[0];
      const el = document.querySelector(targetStep.targetSelector);

      if (el) {
        if (shouldScroll) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        const rect = el.getBoundingClientRect();
        const padding = 10;
        const newTop = Math.max(8, Math.round(rect.top - padding));
        const newLeft = Math.max(8, Math.round(rect.left - padding));
        const newWidth = Math.min(window.innerWidth - 16, Math.round(rect.width + padding * 2));
        const newHeight = Math.round(rect.height + padding * 2);

        setHighlightRect((prev) => {
          if (
            prev &&
            Math.abs(prev.top - newTop) < 2 &&
            Math.abs(prev.left - newLeft) < 2 &&
            Math.abs(prev.width - newWidth) < 2 &&
            Math.abs(prev.height - newHeight) < 2
          ) {
            return prev;
          }
          return { top: newTop, left: newLeft, width: newWidth, height: newHeight };
        });
        setIsUsingSample((prev) => (prev ? false : prev));
      } else {
        const width = Math.min(460, window.innerWidth - 32);
        const height = 140;
        const top = Math.max(80, Math.round(window.innerHeight * 0.28));
        const left = Math.max(16, Math.round((window.innerWidth - width) / 2));

        setHighlightRect((prev) => {
          if (
            prev &&
            prev.top === top &&
            prev.left === left &&
            prev.width === width &&
            prev.height === height
          ) {
            return prev;
          }
          return { top: newTopOrCenter(top), left, width, height };
        });
        setIsUsingSample((prev) => (!prev ? true : prev));
      }
    };

    function newTopOrCenter(t: number) {
      return t;
    }

    // Initial measure with smooth scroll
    measure(true);
    timeoutId = setTimeout(() => measure(false), 220);

    const handleResizeOrScroll = () => measure(false);
    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, true);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [isOpen, currentStep, activeTab, isAdmin]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || isAdmin) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep, activeTab, isAdmin]);

  const markCompletedInStorage = () => {
    if (dontShowAgain && user?.id && user?.role) {
      try {
        localStorage.setItem(`tutorhub_tutorial_seen_${user.role}_${user.id}`, "true");
      } catch {
        // Safe localStorage fallback
      }
    }
  };

  const handleDismiss = () => {
    markCompletedInStorage();
    onClose();
  };

  const handleNext = () => {
    if (isLastStep) {
      handleDismiss();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  if (!isOpen || !highlightRect || isAdmin) return null;

  const StepIcon = current.icon;

  // Compute popover placement: above or below spotlight box
  const popoverWidth = Math.min(420, window.innerWidth - 32);
  const spaceBelow = window.innerHeight - (highlightRect.top + highlightRect.height);
  const placeBelow = spaceBelow > 280 || highlightRect.top < 180;

  const popoverTop = placeBelow
    ? highlightRect.top + highlightRect.height + 16
    : Math.max(16, highlightRect.top - 310);

  const popoverLeft = Math.max(
    16,
    Math.min(
      window.innerWidth - popoverWidth - 16,
      highlightRect.left + highlightRect.width / 2 - popoverWidth / 2
    )
  );

  // Arrow position relative to popover card
  const arrowLeft = Math.max(
    20,
    Math.min(
      popoverWidth - 20,
      highlightRect.left + highlightRect.width / 2 - popoverLeft
    )
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden pointer-events-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Spotlight cutout border & massive steady shadow that darkens the rest of the screen without flashing */}
      <div
        style={{
          position: "fixed",
          top: `${highlightRect.top}px`,
          left: `${highlightRect.left}px`,
          width: `${highlightRect.width}px`,
          height: `${highlightRect.height}px`,
          borderRadius: "20px",
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.82)",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          pointerEvents: "none",
        }}
        className="border-2 border-[#48A5EE] ring-4 ring-sky-400/30"
      />

      {/* If element is missing from screen, render realistic sample display directly inside spotlight area */}
      {isUsingSample && (
        <div
          ref={sampleContainerRef}
          style={{
            position: "fixed",
            top: `${highlightRect.top}px`,
            left: `${highlightRect.left}px`,
            width: `${highlightRect.width}px`,
            height: `${highlightRect.height}px`,
          }}
          className="flex items-center justify-center p-3 animate-in zoom-in-95 duration-200 pointer-events-none"
        >
          {/* Sample: Teams Link Input for Tutor */}
          {current.sampleType === "teams_input" && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                  <Video className="w-4 h-4 text-[#48A5EE]" />
                  <span>Teams Meeting Link</span>
                  <span
                    className="font-normal text-slate-400 cursor-help"
                    title="This link will be displayed to the student 5 minutes before the lesson"
                  >
                    (Enter ~10 mins before lesson):
                  </span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  Sample Display
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  readOnly
                  value="https://teams.microsoft.com/l/meetup-join/19%3ameeting_live..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 font-mono"
                />
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-xl bg-[#48A5EE] text-white text-xs font-bold"
                >
                  Save Link
                </button>
              </div>
            </div>
          )}

          {/* Sample: What would you like to cover today? */}
          {current.sampleType === "topic_box" && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#48A5EE]/10 text-[#48A5EE] flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    What would you like to cover today?
                  </div>
                  <div className="text-[10px] text-slate-500">Your tutor sees this instantly.</div>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value="Quadratics & Past Paper 2 Q5"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 font-medium"
                />
                <button type="button" className="px-3.5 py-1.5 rounded-xl bg-[#48A5EE] text-white text-xs font-bold">
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Sample: Teams Launcher & Countdown for Student */}
          {current.sampleType === "teams_launcher" && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  GCSE Higher Maths with Luke
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                  Starts in 14m 32s
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#48A5EE]" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Microsoft Teams Meeting
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-md">
                  Unlocks 5m before start
                </span>
              </div>
            </div>
          )}

          {/* Sample: Casio Calculator */}
          {current.sampleType === "calculator" && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Casio fx-83GTX &amp; fx-991CW
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Classic • Pink • Cyan Themes
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                1-Click Launch
              </span>
            </div>
          )}

          {/* Sample: Formulas */}
          {current.sampleType === "formulas" && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    GCSE &amp; A-Level Formula Sheets
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Edexcel • AQA • OCR
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Instant Lookup
              </span>
            </div>
          )}

          {/* Sample: Lesson Controls */}
          {current.sampleType === "lesson_controls" && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xl flex items-center gap-2">
              <button
                type="button"
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Lesson (In Progress)</span>
              </button>
              <button
                type="button"
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700"
              >
                End Lesson &amp; Log Notes
              </button>
            </div>
          )}

          {/* Sample: My Assigned Students Tab */}
          {current.sampleType === "students_tab" && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs">
                    JD
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">John Doe</div>
                    <div className="text-[10px] text-slate-500">Assigned Student • Active</div>
                  </div>
                </div>
                <div className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                  PIN: 4821
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Verified Access</span>
                </span>
                <span className="text-[#48A5EE] font-bold">Copy Magic Link</span>
              </div>
            </div>
          )}

          {/* Sample: Upcoming Lessons Tab */}
          {current.sampleType === "lessons_tab" && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-100">Tomorrow at 16:30</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">Scheduled</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-200">A-Level Pure Maths with Sarah</div>
                  <div className="text-[10px] text-slate-500">Topic: Integration by parts</div>
                </div>
                <span className="text-[#48A5EE] font-bold text-[11px]">60 mins</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Popover Card with directional arrow pointing to the spotlight box */}
      <div
        style={{
          position: "fixed",
          top: `${popoverTop}px`,
          left: `${popoverLeft}px`,
          width: `${popoverWidth}px`,
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-3.5 z-50 animate-in zoom-in-95 duration-200"
      >
        {/* Pointer Arrow */}
        <div
          style={{
            left: `${arrowLeft}px`,
            top: placeBelow ? "-7px" : "auto",
            bottom: placeBelow ? "auto" : "-7px",
          }}
          className={`absolute w-3.5 h-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rotate-45 transform -translate-x-1/2 ${
            placeBelow ? "border-t border-l" : "border-b border-r"
          }`}
        />

        {/* Card Header: Badge, Step, and Close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${current.badgeColor}`}
            >
              <StepIcon className="w-3 h-3" />
              <span>{current.badge}</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Tour Switcher for Tutors/Guests */}
            {(isTutor || !user) && (
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("student");
                    setCurrentStep(0);
                  }}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    activeTab === "student"
                      ? "bg-white dark:bg-slate-700 text-[#48A5EE] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("tutor");
                    setCurrentStep(0);
                  }}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    activeTab === "tutor"
                      ? "bg-white dark:bg-slate-700 text-[#48A5EE] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Tutor
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Dismiss tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card Title & Content */}
        <div className="space-y-1.5">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
            {current.title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Quick Tips */}
        {current.tips && current.tips.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-2.5 space-y-1 border border-slate-100 dark:border-slate-800/80">
            {current.tips.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                <span className="leading-tight">{tip}</span>
              </div>
            ))}
          </div>
        )}

        {/* Card Footer: Navigation & Progress */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          {/* Don't show again checkbox */}
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-500 dark:text-slate-400 select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-[#48A5EE] focus:ring-[#48A5EE]"
            />
            <span className="hidden sm:inline">Don&apos;t show on login</span>
            <span className="sm:hidden">Don&apos;t show</span>
          </label>

          <div className="flex items-center gap-1.5">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-3.5 py-1.5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <span>{isLastStep ? "Finish Tour" : "Next"}</span>
              {isLastStep ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
