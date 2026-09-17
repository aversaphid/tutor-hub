"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/navbar";
import PinModal from "@/components/pin-modal";
import Footer from "@/components/footer";
import Image from "next/image";
import { Lock, ArrowRight, Search, Users } from "lucide-react";

interface Student {
  id: string;
  name: string;
}

export default function HomePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => {
        if (data.students) setStudents(data.students);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setIsPinModalOpen(true);
  };

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b1120] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-12 sm:py-16 flex flex-col items-center justify-center space-y-8">
        {/* Centered Logo & Branding */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <div className="w-28 h-28 mx-auto relative rounded-full overflow-hidden shadow-md border-2 border-white dark:border-slate-700 flex items-center justify-center shrink-0">
            <Image
              src="/logo.png"
              alt="LB Maths Tuition"
              fill
              sizes="(max-width: 768px) 112px, 140px"
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            LB Maths Tuition
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select your name to join your lesson room
          </p>
        </div>

        {/* Student Selection Card */}
        <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-4 transition-colors">
          <div className="relative">
            <input
              type="text"
              placeholder="Search your name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:border-[#48A5EE] focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
              Loading students...
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Students Registered Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Your tutor will add your student profile before your scheduled lesson.
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
              No student found matching &quot;{searchTerm}&quot;
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => handleStudentSelect(student)}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-[#48A5EE]/10 dark:hover:bg-[#48A5EE]/20 border border-slate-200 dark:border-slate-700/80 hover:border-[#48A5EE]/40 text-left transition-all group flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#48A5EE] transition-colors">
                      {student.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      <span>Enter 4-Digit PIN</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-[#48A5EE] group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      <PinModal
        student={selectedStudent}
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setSelectedStudent(null);
        }}
      />

      <Footer />
    </div>
  );
}
