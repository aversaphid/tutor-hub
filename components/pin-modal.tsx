"use client";

import React, { useState, useEffect } from "react";
import { Lock, Delete, X, ShieldAlert, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";

interface PinModalProps {
  student: { id: string; name: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PinModal({
  student,
  isOpen,
  onClose,
  onSuccess,
}: PinModalProps) {
  const router = useRouter();
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [lockedMinutes, setLockedMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError("");
      setLockedMinutes(null);
    }
  }, [isOpen, student]);

  useEffect(() => {
    if (!isOpen || lockedMinutes) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, pin, lockedMinutes]);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError("");
      if (nextPin.length === 4) {
        submitPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  const submitPin = async (completedPin: string) => {
    if (!student) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/student-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tuteeId: student.id,
          pin: completedPin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPin("");
        setError(data.error || "Incorrect PIN.");
        if (data.lockedMinutesRemaining !== undefined) {
          setLockedMinutes(data.lockedMinutesRemaining);
        }
        return;
      }

      onSuccess?.();
      router.push("/student");
    } catch {
      setPin("");
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xs sm:max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5 transition-colors">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#48A5EE]/15 text-[#48A5EE] flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Student PIN: {student.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter your 4-digit PIN provided for your lessons
          </p>
        </div>

        {/* Masked Dots */}
        <div className="flex justify-center items-center gap-3 py-1">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                  isFilled
                    ? "bg-[#48A5EE] border-[#48A5EE] scale-110 shadow-sm shadow-[#48A5EE]/50"
                    : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs text-center flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              disabled={loading || Boolean(lockedMinutes)}
              onClick={() => handleDigit(digit)}
              className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#48A5EE] hover:text-white dark:hover:bg-[#48A5EE] active:bg-[#3292dc] text-slate-800 dark:text-slate-100 font-mono text-lg font-bold transition-all disabled:opacity-40 cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            disabled={loading || Boolean(lockedMinutes)}
            onClick={() => setPin("")}
            className="py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
          >
            Clear
          </button>
          <button
            disabled={loading || Boolean(lockedMinutes)}
            onClick={() => handleDigit("0")}
            className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#48A5EE] hover:text-white dark:hover:bg-[#48A5EE] active:bg-[#3292dc] text-slate-800 dark:text-slate-100 font-mono text-lg font-bold transition-all disabled:opacity-40 cursor-pointer"
          >
            0
          </button>
          <button
            disabled={loading || Boolean(lockedMinutes) || pin.length === 0}
            onClick={handleBackspace}
            className="py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <Lock className="w-3.5 h-3.5" />
          <span>Locked for 15 mins after 5 failed attempts</span>
        </div>
      </div>
    </div>
  );
}
