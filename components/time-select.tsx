"use client";

import React, { useState, useRef, useEffect } from "react";
import { Clock, ChevronDown, Check } from "lucide-react";
import { TIME_OPTIONS_5MIN } from "@/lib/format";

interface TimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
}

export default function TimeSelect({
  value,
  onChange,
  options = TIME_OPTIONS_5MIN,
  disabled = false,
  className = "",
  id,
  placeholder = "Select time",
}: TimeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // When dropdown opens, center the currently selected item in the middle of the scroll area
  useEffect(() => {
    if (isOpen) {
      // Use requestAnimationFrame so DOM layout is calculated
      requestAnimationFrame(() => {
        if (selectedItemRef.current && listRef.current) {
          const container = listRef.current;
          const selected = selectedItemRef.current;
          const containerHeight = container.clientHeight;
          const itemOffset = selected.offsetTop;
          const itemHeight = selected.offsetHeight;

          container.scrollTop = itemOffset - containerHeight / 2 + itemHeight / 2;
        }
      });
    }
  }, [isOpen]);

  const handleSelect = (timeStr: string) => {
    onChange(timeStr);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-[#48A5EE] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
      >
        <span className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#48A5EE] shrink-0" />
          <span className={value ? "font-semibold tracking-wide" : "text-slate-400"}>
            {value || placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#48A5EE]" : ""
          }`}
        />
      </button>

      {/* Centered Scroll Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div
            ref={listRef}
            className="max-h-48 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700"
          >
            {options.map((t) => {
              const isSelected = t === value;
              return (
                <button
                  key={t}
                  ref={isSelected ? selectedItemRef : undefined}
                  type="button"
                  onClick={() => handleSelect(t)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#48A5EE] text-white font-bold shadow-sm"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{t}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
