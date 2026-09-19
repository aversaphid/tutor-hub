"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  Calendar,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  Award,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { formatCurrency, formatTutorName } from "@/lib/format";

interface RevenueAnalyticsHubProps {
  sessions: any[];
  tutors: any[];
  students: any[];
}

export default function RevenueAnalyticsHub({
  sessions,
  tutors,
  students,
}: RevenueAnalyticsHubProps) {
  const [timeframe, setTimeframe] = useState<"ALL" | "THIS_MONTH" | "LAST_MONTH" | "CUSTOM">("THIS_MONTH");
  const [customMonth, setCustomMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [selectedTutorId, setSelectedTutorId] = useState<string>("ALL");

  // Helper to extract numeric fees
  const getSessionStudentPay = (s: any): number => {
    if (typeof s.studentPay === "number" && !isNaN(s.studentPay)) return s.studentPay;
    if (typeof s.tutee?.studentPay === "number" && !isNaN(s.tutee.studentPay)) return s.tutee.studentPay;
    return 0;
  };

  const getSessionTutorPay = (s: any): number => {
    if (typeof s.tutorPay === "number" && !isNaN(s.tutorPay)) return s.tutorPay;
    if (typeof s.tutee?.tutorPay === "number" && !isNaN(s.tutee.tutorPay)) return s.tutee.tutorPay;
    return 0;
  };

  const getSessionDurationHours = (s: any): number => {
    const start = new Date(s.scheduledStartTime).getTime();
    const end = new Date(s.scheduledEndTime).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return 1;
    return (end - start) / (1000 * 60 * 60);
  };

  // Filter completed lessons by timeframe and tutor
  const filteredCompletedSessions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    return sessions.filter((s) => {
      if (s.status !== "COMPLETED") return false;

      // Tutor filter
      if (selectedTutorId !== "ALL" && s.tutorId !== selectedTutorId) return false;

      const date = new Date(s.scheduledStartTime);
      if (isNaN(date.getTime())) return false;

      if (timeframe === "THIS_MONTH") {
        return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
      }

      if (timeframe === "LAST_MONTH") {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        return (
          date.getFullYear() === lastMonthDate.getFullYear() &&
          date.getMonth() === lastMonthDate.getMonth()
        );
      }

      if (timeframe === "CUSTOM" && customMonth) {
        const itemMonth = date.toISOString().slice(0, 7);
        return itemMonth === customMonth;
      }

      return true; // "ALL"
    });
  }, [sessions, timeframe, customMonth, selectedTutorId]);

  // Aggregate high-level KPIs
  const kpis = useMemo(() => {
    let totalRevenue = 0;
    let totalPayroll = 0;
    let totalHours = 0;
    let unpaidPayroll = 0;

    for (const s of filteredCompletedSessions) {
      const rev = getSessionStudentPay(s);
      const pay = getSessionTutorPay(s);
      const hrs = getSessionDurationHours(s);

      totalRevenue += rev;
      totalPayroll += pay;
      totalHours += hrs;

      if (!s.tutorPaid) {
        unpaidPayroll += pay;
      }
    }

    const grossProfit = totalRevenue - totalPayroll;
    const marginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const avgHourlyRev = totalHours > 0 ? totalRevenue / totalHours : 0;
    const avgHourlyProfit = totalHours > 0 ? grossProfit / totalHours : 0;

    return {
      totalRevenue,
      totalPayroll,
      grossProfit,
      marginPct,
      completedCount: filteredCompletedSessions.length,
      totalHours,
      avgHourlyRev,
      avgHourlyProfit,
      unpaidPayroll,
    };
  }, [filteredCompletedSessions]);

  // Tutor breakdown
  const tutorBreakdown = useMemo(() => {
    const map = new Map<string, {
      tutor: any;
      completedCount: number;
      hours: number;
      revenue: number;
      payroll: number;
      unpaidPayroll: number;
    }>();

    for (const s of filteredCompletedSessions) {
      const tutorId = s.tutorId;
      const tutor = s.tutor || tutors.find((t) => t.id === tutorId) || { name: "Unknown Tutor", email: "" };
      const rev = getSessionStudentPay(s);
      const pay = getSessionTutorPay(s);
      const hrs = getSessionDurationHours(s);

      const existing = map.get(tutorId) || {
        tutor,
        completedCount: 0,
        hours: 0,
        revenue: 0,
        payroll: 0,
        unpaidPayroll: 0,
      };

      existing.completedCount += 1;
      existing.hours += hrs;
      existing.revenue += rev;
      existing.payroll += pay;
      if (!s.tutorPaid) {
        existing.unpaidPayroll += pay;
      }

      map.set(tutorId, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredCompletedSessions, tutors]);

  // Student breakdown
  const studentBreakdown = useMemo(() => {
    const map = new Map<string, {
      student: any;
      tutor: any;
      completedCount: number;
      hours: number;
      revenue: number;
      payroll: number;
    }>();

    for (const s of filteredCompletedSessions) {
      const studentId = s.tuteeId;
      const student = s.tutee || students.find((st) => st.id === studentId) || { name: "Unknown Student" };
      const tutor = s.tutor || tutors.find((t) => t.id === s.tutorId) || { name: "Unassigned" };
      const rev = getSessionStudentPay(s);
      const pay = getSessionTutorPay(s);
      const hrs = getSessionDurationHours(s);

      const existing = map.get(studentId) || {
        student,
        tutor,
        completedCount: 0,
        hours: 0,
        revenue: 0,
        payroll: 0,
      };

      existing.completedCount += 1;
      existing.hours += hrs;
      existing.revenue += rev;
      existing.payroll += pay;

      map.set(studentId, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredCompletedSessions, students, tutors]);

  // Month-on-month trend (last 6 months)
  const monthlyTrends = useMemo(() => {
    const monthsMap = new Map<string, {
      monthKey: string;
      label: string;
      lessons: number;
      hours: number;
      revenue: number;
      payroll: number;
      profit: number;
    }>();

    for (const s of sessions) {
      if (s.status !== "COMPLETED") continue;
      if (selectedTutorId !== "ALL" && s.tutorId !== selectedTutorId) continue;

      const d = new Date(s.scheduledStartTime);
      if (isNaN(d.getTime())) continue;

      const monthKey = d.toISOString().slice(0, 7); // "YYYY-MM"
      const label = d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

      const rev = getSessionStudentPay(s);
      const pay = getSessionTutorPay(s);
      const hrs = getSessionDurationHours(s);

      const existing = monthsMap.get(monthKey) || {
        monthKey,
        label,
        lessons: 0,
        hours: 0,
        revenue: 0,
        payroll: 0,
        profit: 0,
      };

      existing.lessons += 1;
      existing.hours += hrs;
      existing.revenue += rev;
      existing.payroll += pay;
      existing.profit += (rev - pay);

      monthsMap.set(monthKey, existing);
    }

    // Sort chronologically descending
    return Array.from(monthsMap.values())
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      .slice(0, 6);
  }, [sessions, selectedTutorId]);

  // CSV Export for financial reporting
  const handleExportFinancialCSV = () => {
    const headers = [
      "Lesson ID",
      "Date",
      "Start Time",
      "End Time",
      "Student Name",
      "Tutor Name",
      "Hours",
      "Tuition Fee Charged (£)",
      "Tutor Pay (£)",
      "Gross Profit (£)",
      "Tutor Paid Status",
    ];

    const rows = filteredCompletedSessions.map((s) => {
      const d = new Date(s.scheduledStartTime);
      const dateStr = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "";
      const startTimeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
      const endDate = new Date(s.scheduledEndTime);
      const endTimeStr = !isNaN(endDate.getTime()) ? endDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";

      const studentName = s.tutee?.name || "Student";
      const tutorName = s.tutor?.name || "Tutor";
      const hrs = getSessionDurationHours(s).toFixed(2);
      const rev = getSessionStudentPay(s).toFixed(2);
      const pay = getSessionTutorPay(s).toFixed(2);
      const profit = (getSessionStudentPay(s) - getSessionTutorPay(s)).toFixed(2);
      const tutorPaidStr = s.tutorPaid ? "PAID" : "UNPAID";

      return [
        s.id,
        dateStr,
        startTimeStr,
        endTimeStr,
        `"${studentName}"`,
        `"${tutorName}"`,
        hrs,
        rev,
        pay,
        profit,
        tutorPaidStr,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lbmaths-revenue-report-${timeframe.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner & Filters */}
      <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#48A5EE]/10 text-[#48A5EE]">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Tuition Business &amp; Revenue Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time financial performance, tutor payroll expenditure, and gross profit margins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setTimeframe("THIS_MONTH")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeframe === "THIS_MONTH"
                  ? "bg-[#48A5EE] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeframe("LAST_MONTH")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeframe === "LAST_MONTH"
                  ? "bg-[#48A5EE] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setTimeframe("ALL")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeframe === "ALL"
                  ? "bg-[#48A5EE] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeframe("CUSTOM")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeframe === "CUSTOM"
                  ? "bg-[#48A5EE] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              Month Picker
            </button>
          </div>

          {timeframe === "CUSTOM" && (
            <input
              type="month"
              value={customMonth}
              onChange={(e) => setCustomMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:border-[#48A5EE]"
            />
          )}

          {/* Tutor Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedTutorId}
              onChange={(e) => setSelectedTutorId(e.target.value)}
              className="bg-transparent border-none text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Tutors</option>
              {tutors.map((t) => (
                <option key={t.id} value={t.id}>
                  {formatTutorName(t.name)}
                </option>
              ))}
            </select>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportFinancialCSV}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Download full revenue and payroll ledger as CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#48A5EE]" />
            <span>Export Financials</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tuition Revenue */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tuition Revenue
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(kpis.totalRevenue)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {kpis.completedCount} lessons
              </span>
              <span>completed</span>
            </p>
          </div>
        </div>

        {/* Tutor Payroll Expense */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tutor Payroll
            </span>
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(kpis.totalPayroll)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <span>Pending pay:</span>
              <span className={`font-bold ${kpis.unpaidPayroll > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}`}>
                {formatCurrency(kpis.unpaidPayroll)}
              </span>
            </p>
          </div>
        </div>

        {/* Gross Business Profit */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Gross Profit
            </span>
            <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#48A5EE]">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#48A5EE]">
              {formatCurrency(kpis.grossProfit)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <span>Gross Margin:</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-100">
                {kpis.marginPct.toFixed(1)}%
              </span>
            </p>
          </div>
        </div>

        {/* Teaching Hours & Avg Rate */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Hours Taught
            </span>
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {kpis.totalHours.toFixed(1)} hrs
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <span>Avg Revenue:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {formatCurrency(kpis.avgHourlyRev)}/hr
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Month-on-Month Trends & Tutor Breakdown 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month-on-Month Historical Trend (1 Col) */}
        <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#48A5EE]" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Monthly Performance
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Last 6 Months
            </span>
          </div>

          {monthlyTrends.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No completed lesson history yet.
            </div>
          ) : (
            <div className="space-y-3">
              {monthlyTrends.map((m) => {
                const margin = m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0;
                return (
                  <div
                    key={m.monthKey}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {m.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {m.lessons} lessons • {m.hours.toFixed(1)} hrs
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        {formatCurrency(m.revenue)}
                      </div>
                      <div className="text-[11px] font-bold text-[#48A5EE]">
                        +{formatCurrency(m.profit)} ({margin.toFixed(0)}%)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tutor Workload & Margin Contributions (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Tutor Financials &amp; Workload
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {tutorBreakdown.length} Tutors Active
            </span>
          </div>

          {tutorBreakdown.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No tutor session data in the selected timeframe.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">Tutor</th>
                    <th className="px-3 py-2.5 text-center">Lessons</th>
                    <th className="px-3 py-2.5 text-center">Hours</th>
                    <th className="px-3 py-2.5 text-right">Revenue</th>
                    <th className="px-3 py-2.5 text-right">Tutor Pay</th>
                    <th className="px-3 py-2.5 text-right">Gross Profit</th>
                    <th className="px-3 py-2.5 text-right">Pending Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tutorBreakdown.map((item) => {
                    const profit = item.revenue - item.payroll;
                    const margin = item.revenue > 0 ? (profit / item.revenue) * 100 : 0;
                    return (
                      <tr key={item.tutor.id || item.tutor.name} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-3 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {formatTutorName(item.tutor.name)}
                          {item.tutor.email && (
                            <span className="block text-[10px] font-normal text-slate-400">
                              {item.tutor.email}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                          {item.completedCount}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-400">
                          {item.hours.toFixed(1)}h
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-400 font-semibold">
                          {formatCurrency(item.payroll)}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <span className="font-extrabold text-[#48A5EE]">
                            {formatCurrency(profit)}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-semibold">
                            {margin.toFixed(0)}% margin
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-bold whitespace-nowrap">
                          {item.unpaidPayroll > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              {formatCurrency(item.unpaidPayroll)}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Student Tuition Volume Ledger */}
      <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Student Tuition Revenue &amp; Volumes
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {studentBreakdown.length} Students in Period
          </span>
        </div>

        {studentBreakdown.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No student billing records in the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5">Student</th>
                  <th className="px-3 py-2.5">Assigned Tutor</th>
                  <th className="px-3 py-2.5 text-center">Lessons</th>
                  <th className="px-3 py-2.5 text-center">Hours</th>
                  <th className="px-3 py-2.5 text-right">Tuition Paid</th>
                  <th className="px-3 py-2.5 text-right">Tutor Cost</th>
                  <th className="px-3 py-2.5 text-right">Business Net Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {studentBreakdown.map((item) => {
                  const profit = item.revenue - item.payroll;
                  const margin = item.revenue > 0 ? (profit / item.revenue) * 100 : 0;
                  return (
                    <tr key={item.student.id || item.student.name} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-3 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        {item.student.name}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                        {formatTutorName(item.tutor?.name || "Unassigned")}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {item.completedCount}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-400">
                        {item.hours.toFixed(1)}h
                      </td>
                      <td className="px-3 py-3 text-right font-black text-slate-900 dark:text-white">
                        {formatCurrency(item.revenue)}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-400 font-semibold">
                        {formatCurrency(item.payroll)}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="font-extrabold text-[#48A5EE]">
                          {formatCurrency(profit)}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-semibold">
                          {margin.toFixed(0)}% margin
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
