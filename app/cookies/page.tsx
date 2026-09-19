import React from "react";
import LegalPageLayout from "@/components/legal-page-layout";
import { Cookie, ShieldCheck, CheckCircle } from "lucide-react";

export const metadata = {
  title: "Cookie Policy | LB Maths Tuition",
  description: "Cookie and local storage policy for LB Maths Tuition Tutor Hub platform.",
};

export default function CookiesPage() {
  return (
    <LegalPageLayout
      title="Cookie &amp; Local Storage Policy"
      subtitle="Details of essential cookies and browser storage used on this portal"
    >
      <div className="space-y-6">
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block mb-0.5">No Tracking or Marketing Cookies</strong>
            LB MATHS TUITION LTD does not use any third-party advertising, tracking, or marketing cookies.
            We use only strictly necessary technical cookies and browser storage required for you to sign in and use the portal securely.
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Cookie className="w-4 h-4 text-[#48A5EE]" />
            <span>1. What Cookies We Use</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="p-3">Cookie / Key</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3">Lifespan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr className="bg-white dark:bg-slate-900/40">
                  <td className="p-3 font-mono font-semibold text-[#48A5EE]">lb_tutor_token</td>
                  <td className="p-3">First-Party HTTP-Only</td>
                  <td className="p-3">Maintains secure authenticated session for logged-in tutors &amp; administrators</td>
                  <td className="p-3">7 days</td>
                </tr>
                <tr className="bg-white dark:bg-slate-900/40">
                  <td className="p-3 font-mono font-semibold text-[#48A5EE]">next-auth / Theme</td>
                  <td className="p-3">Local Storage</td>
                  <td className="p-3">Stores student portal session context and light/dark theme preference</td>
                  <td className="p-3">Session</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#48A5EE]" />
            <span>2. Legal Exemption from Consent Banners</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            Under Regulation 6 of the <strong>Privacy and Electronic Communications Regulations (PECR)</strong> and UK GDPR, strictly necessary cookies that are essential to provide an explicitly requested service (such as maintaining a secure user login) do not require prior opt-in consent banners.
          </p>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            You can configure your browser to reject cookies; however, disabling strictly necessary cookies will prevent you from logging in to the platform.
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}
