"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, Key, User, Clock, Eye, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import ChangePasswordModal from "./change-password-modal";
import TutorLoginModal from "./tutor-login-modal";
import AccessibilityModal from "./accessibility-modal";
import ThemeToggle from "./theme-toggle";
import { formatTutorName } from "@/lib/format";

interface NavbarProps {
  user?: {
    name: string;
    role: string;
    email?: string | null;
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [timeStr, setTimeStr] = useState<string>("");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isA11yModalOpen, setIsA11yModalOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      router.push("/");
    }
  };

  const handleOpenSettings = () => {
    if (isHeadTutor) {
      if (pathname === "/admin") {
        window.dispatchEvent(new CustomEvent("switch-tab", { detail: "settings" }));
      } else {
        router.push("/admin?tab=settings");
      }
    } else if (isRegularTutor) {
      if (pathname === "/tutor") {
        window.dispatchEvent(new CustomEvent("switch-tab", { detail: "settings" }));
      } else {
        router.push("/tutor?tab=settings");
      }
    }
  };

  const isHeadTutor = user?.role === "HEAD_TUTOR";
  const isRegularTutor = user?.role === "TUTOR";
  const isStaff = isHeadTutor || isRegularTutor;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 group transition-transform hover:scale-[1.01]"
          >
            <div className="w-11 h-11 relative rounded-full overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
              <Image
                src="/logo.png"
                alt="LB Maths Tuition"
                fill
                sizes="44px"
                className="object-cover"
                priority
              />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight text-slate-800 dark:text-slate-100 leading-tight">
                LB Maths Tuition
              </div>
            </div>
          </Link>

          {/* Time, Theme Toggle & Accessibility */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-[#48A5EE]" />
              <span>{timeStr || "--:--"}</span>
            </div>

            {/* Dark Mode Toggle */}
            <ThemeToggle />

            {/* Accessibility Options Button */}
            <button
              onClick={() => setIsA11yModalOpen(true)}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#48A5EE]"
              title="Accessibility Options (Text size, Dyslexia font, Audio, Contrast)"
              aria-label="Open accessibility options"
            >
              <Eye className="w-4 h-4 text-[#48A5EE]" />
            </button>
          </div>

          {/* Right Action: Tutor Login or Staff Menu */}
          <div className="flex items-center gap-2.5">
            {user && isStaff ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-block text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  {isHeadTutor ? "Luke (Admin)" : formatTutorName(user.name) || "Tutor"}
                </span>

                {isHeadTutor && pathname !== "/admin" && (
                  <Link
                    href="/admin"
                    className="text-xs px-3.5 py-2 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold transition-all shadow-sm"
                  >
                    Admin Dashboard
                  </Link>
                )}

                {isRegularTutor && pathname !== "/tutor" && (
                  <Link
                    href="/tutor"
                    className="text-xs px-3.5 py-2 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold transition-all shadow-sm"
                  >
                    Tutor Dashboard
                  </Link>
                )}

                <button
                  onClick={handleOpenSettings}
                  className="text-xs px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Account & Platform Settings"
                >
                  <Settings className="w-3.5 h-3.5 text-[#48A5EE]" />
                  <span className="hidden sm:inline">Settings</span>
                </button>

                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="py-2 px-4 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Tutor Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tutor Login Modal */}
      <TutorLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      {/* Accessibility Options Modal */}
      <AccessibilityModal
        isOpen={isA11yModalOpen}
        onClose={() => setIsA11yModalOpen(false)}
      />
    </>
  );
}
