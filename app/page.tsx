"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Image from "next/image";
import { Delete, ShieldAlert, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [lockedMinutes, setLockedMinutes] = useState<number | null>(null);

  const submitPin = React.useCallback(async (completedPin: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/student-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: completedPin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPin("");
        setError(data.error || "Incorrect PIN. Please try again.");
        if (data.lockedMinutesRemaining !== undefined) {
          setLockedMinutes(data.lockedMinutesRemaining);
        }
        return;
      }

      // Success: navigate to student portal
      router.push("/student");
    } catch {
      setPin("");
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleDigit = React.useCallback((digit: string) => {
    if (loading || lockedMinutes) return;
    setPin((prev) => {
      if (prev.length < 4) {
        const nextPin = prev + digit;
        setError("");
        if (nextPin.length === 4) {
          submitPin(nextPin);
        }
        return nextPin;
      }
      return prev;
    });
  }, [loading, lockedMinutes, submitPin]);

  const handleBackspace = React.useCallback(() => {
    if (loading || lockedMinutes) return;
    setPin((prev) => prev.slice(0, -1));
    setError("");
  }, [loading, lockedMinutes]);

  const handleClear = React.useCallback(() => {
    if (loading || lockedMinutes) return;
    setPin("");
    setError("");
  }, [loading, lockedMinutes]);

  // Keyboard support for digit entry
  useEffect(() => {
    if (lockedMinutes) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in another input (like navbar or modals)
      if (
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")
      ) {
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lockedMinutes, handleDigit, handleBackspace]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b1120] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-8 sm:py-14 flex flex-col items-center justify-center space-y-6">
        {/* Centered Logo & Branding */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto relative rounded-full overflow-hidden shadow-md border-2 border-white dark:border-slate-700 flex items-center justify-center shrink-0">
            <Image
              src="/logo.png"
              alt="LB Maths Tuition"
              fill
              sizes="(max-width: 768px) 96px, 112px"
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            LB Maths Tuition
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Enter your unique 4-digit PIN to enter your lesson room
          </p>
        </div>

        {/* PIN Entry Card */}
        <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6 transition-colors">
          {/* Header & Lock Icon */}
          <div className="flex items-center justify-center gap-2 text-slate-700 dark:text-slate-200 font-bold text-sm">
            <KeyRound className="w-4 h-4 text-[#48A5EE]" />
            <span>Student PIN Login</span>
          </div>

          {/* 4 PIN Dots */}
          <div className="flex justify-center items-center gap-3.5 sm:gap-4 py-2">
            {[0, 1, 2, 3].map((index) => {
              const hasDigit = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl flex items-center justify-center text-xl font-bold transition-all duration-200 ${
                    hasDigit
                      ? "bg-[#48A5EE]/10 dark:bg-[#48A5EE]/20 border-2 border-[#48A5EE] text-[#48A5EE]"
                      : "bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 text-slate-400"
                  }`}
                >
                  {hasDigit ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-[#48A5EE]" />
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Error or Lockout message */}
          {lockedMinutes ? (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>
                Account locked for {lockedMinutes} minute{lockedMinutes > 1 ? "s" : ""} due to repeated failed attempts.
              </span>
            </div>
          ) : error ? (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs text-center font-medium">
              {error}
            </div>
          ) : null}

          {/* Interactive Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-xs mx-auto">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                disabled={Boolean(lockedMinutes) || loading}
                onClick={() => handleDigit(num)}
                className="h-13 sm:h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-[#48A5EE]/15 dark:hover:bg-[#48A5EE]/25 hover:text-[#48A5EE] text-slate-800 dark:text-slate-100 font-bold text-lg sm:text-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer flex items-center justify-center"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              disabled={Boolean(lockedMinutes) || loading || pin.length === 0}
              onClick={handleClear}
              className="h-13 sm:h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer flex items-center justify-center"
            >
              Clear
            </button>

            <button
              type="button"
              disabled={Boolean(lockedMinutes) || loading}
              onClick={() => handleDigit("0")}
              className="h-13 sm:h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-[#48A5EE]/15 dark:hover:bg-[#48A5EE]/25 hover:text-[#48A5EE] text-slate-800 dark:text-slate-100 font-bold text-lg sm:text-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer flex items-center justify-center"
            >
              0
            </button>

            <button
              type="button"
              disabled={Boolean(lockedMinutes) || loading || pin.length === 0}
              onClick={handleBackspace}
              className="h-13 sm:h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer flex items-center justify-center"
              aria-label="Delete last digit"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Help note */}
          <div className="text-center pt-2">
            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
              Forgotten your PIN? Check your lesson confirmation message or ask your tutor for your secure Magic Link.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
