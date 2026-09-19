"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { FileText, Shield, Lock, Cookie, Building2, Mail } from "lucide-react";

interface LegalLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

const TABS = [
  { href: "/terms", label: "Terms of Use", icon: FileText },
  { href: "/privacy", label: "Privacy Policy", icon: Lock },
  { href: "/safeguarding", label: "Child Safeguarding", icon: Shield },
  { href: "/cookies", label: "Cookie Policy", icon: Cookie },
];

export default function LegalPageLayout({ children, title, subtitle }: LegalLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b1120] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Header with Company Details */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#48A5EE] bg-[#48A5EE]/10 px-2.5 py-1 rounded-full">
                Legal &amp; Compliance
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2 tracking-tight">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {subtitle}
              </p>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 sm:text-right space-y-1 shrink-0">
              <div className="flex items-center sm:justify-end gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                <Building2 className="w-3.5 h-3.5 text-[#48A5EE]" />
                <span>LB MATHS TUITION LTD</span>
              </div>
              <div>Company No. 17119191 &bull; England &amp; Wales</div>
              <div className="flex items-center sm:justify-end gap-1 text-slate-500 dark:text-slate-400">
                <Mail className="w-3 h-3 text-slate-400" />
                <a
                  href="mailto:luke@lbmathstuition.co.uk"
                  className="text-[#48A5EE] hover:underline"
                >
                  luke@lbmathstuition.co.uk
                </a>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#48A5EE] text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Document Content Card */}
        <article className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm transition-colors text-slate-800 dark:text-slate-200 text-sm leading-relaxed space-y-6">
          {children}
        </article>
      </main>

      <Footer />
    </div>
  );
}
