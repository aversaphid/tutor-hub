"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X, User, GraduationCap } from "lucide-react";
import { formatTutorName } from "@/lib/format";

export interface StudentItem {
  id: string;
  name: string;
  assignedTutorId?: string | null;
  assignedTutor?: { id: string; name: string } | null;
  active?: boolean;
  [key: string]: any;
}

export interface StudentComboboxProps {
  students: StudentItem[];
  value: string;
  onChange: (studentId: string, student?: StudentItem, regularTutorId?: string) => void;
  tutors?: any[];
  sessions?: any[];
  preferredTutorId?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

/**
 * Resolves the regular tutor for a given student.
 * 1. Uses explicit assignedTutor / assignedTutorId if present.
 * 2. If absent, derives regular tutor by counting historical sessions.
 */
export function resolveStudentRegularTutor(
  student: StudentItem,
  tutors: any[] = [],
  sessions: any[] = []
): { id?: string; name: string } | null {
  if (student.assignedTutor?.name) {
    return {
      id: student.assignedTutor.id,
      name: formatTutorName(student.assignedTutor.name),
    };
  }

  if (student.assignedTutorId) {
    const matched = tutors.find((t) => t.id === student.assignedTutorId);
    if (matched) {
      return { id: matched.id, name: formatTutorName(matched.name) };
    }
  }

  if (sessions.length > 0) {
    const tutorCounts: Record<string, { count: number; name: string }> = {};
    for (const s of sessions) {
      const sTuteeId = s.tuteeId || s.tutee?.id;
      if (sTuteeId === student.id) {
        const tId = s.tutorId || s.tutor?.id;
        const tName = s.tutor?.name;
        if (tId) {
          if (!tutorCounts[tId]) {
            const tObj = tutors.find((t) => t.id === tId);
            tutorCounts[tId] = {
              count: 0,
              name: tObj ? formatTutorName(tObj.name) : tName ? formatTutorName(tName) : "Tutor",
            };
          }
          tutorCounts[tId].count++;
        }
      }
    }

    const sortedTutors = Object.entries(tutorCounts).sort((a, b) => b[1].count - a[1].count);
    if (sortedTutors.length > 0 && sortedTutors[0][1].count > 0) {
      return { id: sortedTutors[0][0], name: sortedTutors[0][1].name };
    }
  }

  return null;
}

export default function StudentCombobox({
  students,
  value,
  onChange,
  tutors = [],
  sessions = [],
  preferredTutorId,
  placeholder = "Choose student...",
  disabled = false,
  required = false,
  id = "student-combobox",
}: StudentComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Map each student with their regular tutor information once
  const studentsWithTutor = useMemo(() => {
    return students.map((st) => {
      const reg = resolveStudentRegularTutor(st, tutors, sessions);
      return {
        ...st,
        regularTutor: reg,
        regularTutorName: reg?.name || null,
        regularTutorId: reg?.id || null,
      };
    });
  }, [students, tutors, sessions]);

  // Selected student object
  const selectedStudent = useMemo(() => {
    return studentsWithTutor.find((s) => s.id === value) || null;
  }, [studentsWithTutor, value]);

  // Filtered and smart-grouped list
  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return studentsWithTutor;
    }
    return studentsWithTutor.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(q);
      const tutorMatch = s.regularTutorName
        ? s.regularTutorName.toLowerCase().includes(q)
        : false;
      return nameMatch || tutorMatch;
    });
  }, [studentsWithTutor, query]);

  // Smart sections when query is empty
  const { preferredStudents, otherStudents } = useMemo(() => {
    if (query.trim().length > 0 || !preferredTutorId) {
      return {
        preferredStudents: [],
        otherStudents: filteredStudents,
      };
    }

    const preferred: typeof studentsWithTutor = [];
    const others: typeof studentsWithTutor = [];

    for (const st of filteredStudents) {
      if (st.regularTutorId === preferredTutorId) {
        preferred.push(st);
      } else {
        others.push(st);
      }
    }

    return { preferredStudents: preferred, otherStudents: others };
  }, [filteredStudents, query, preferredTutorId]);

  // Flat list for keyboard navigation
  const flatDisplayList = useMemo(() => {
    if (preferredStudents.length > 0) {
      return [...preferredStudents, ...otherStudents];
    }
    return otherStudents;
  }, [preferredStudents, otherStudents]);

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (student: typeof studentsWithTutor[0]) => {
    onChange(student.id, student, student.regularTutorId || undefined);
    setIsOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", undefined, undefined);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < flatDisplayList.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : flatDisplayList.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatDisplayList[highlightedIndex]) {
        handleSelect(flatDisplayList[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full text-xs" ref={containerRef}>
      {/* Hidden input for form required validation */}
      {required && (
        <input
          type="text"
          value={value}
          required={required}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full px-3 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
          isOpen
            ? "bg-white dark:bg-slate-900 border-[#48A5EE] ring-2 ring-[#48A5EE]/20 shadow-sm"
            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
              selectedStudent
                ? "bg-[#48A5EE]/10 text-[#48A5EE] dark:bg-[#48A5EE]/20"
                : "bg-slate-200 dark:bg-slate-800 text-slate-400"
            }`}
          >
            <User className="w-3.5 h-3.5" />
          </div>

          {selectedStudent ? (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                {selectedStudent.name}
              </span>
              {selectedStudent.regularTutorName && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                  <span>Regular Tutor:</span>
                  <span className="font-semibold text-[#48A5EE]">
                    {selectedStudent.regularTutorName}
                  </span>
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 font-medium truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedStudent && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#48A5EE]" : ""
            }`}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[280px] z-50 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search student or regular tutor..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-[#48A5EE]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List Options */}
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100/50 dark:divide-slate-800/50"
          >
            {flatDisplayList.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                No students found matching &quot;{query}&quot;
              </div>
            ) : (
              <>
                {/* 1. Preferred / Regular Students of Selected Tutor */}
                {preferredStudents.length > 0 && (
                  <div className="space-y-0.5">
                    <div className="px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-[#48A5EE] uppercase flex items-center gap-1.5">
                      <GraduationCap className="w-3 h-3" />
                      <span>Regularly Taught by Selected Tutor ({preferredStudents.length})</span>
                    </div>
                    {preferredStudents.map((st, idx) => {
                      const isSelected = st.id === value;
                      const isHighlighted = highlightedIndex === idx;
                      return (
                        <div
                          key={st.id}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(st)}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-[#48A5EE]/15 text-[#48A5EE] font-bold"
                              : isHighlighted
                              ? "bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-100"
                              : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-[#48A5EE]/20 text-[#48A5EE] flex items-center justify-center text-[10px] font-extrabold shrink-0">
                              {st.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate font-semibold">{st.name}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {st.regularTutorName && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#48A5EE]/10 text-[#48A5EE] dark:bg-[#48A5EE]/20">
                                {st.regularTutorName}
                              </span>
                            )}
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#48A5EE]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Other Students */}
                {otherStudents.length > 0 && (
                  <div className={`space-y-0.5 ${preferredStudents.length > 0 ? "pt-1.5" : ""}`}>
                    {preferredStudents.length > 0 && (
                      <div className="px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                        All Other Students ({otherStudents.length})
                      </div>
                    )}
                    {otherStudents.map((st, i) => {
                      const globalIdx = preferredStudents.length + i;
                      const isSelected = st.id === value;
                      const isHighlighted = highlightedIndex === globalIdx;
                      return (
                        <div
                          key={st.id}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(st)}
                          onMouseEnter={() => setHighlightedIndex(globalIdx)}
                          className={`px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-[#48A5EE]/15 text-[#48A5EE] font-bold"
                              : isHighlighted
                              ? "bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-100"
                              : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {st.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate">{st.name}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {st.regularTutorName ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                Tutor: {st.regularTutorName}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                Unassigned
                              </span>
                            )}
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#48A5EE]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
