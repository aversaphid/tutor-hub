import React from "react";
import LegalPageLayout from "@/components/legal-page-layout";
import { Lock, Database, ShieldCheck, UserCheck } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | LB Maths Tuition",
  description: "UK GDPR and Data Protection Act 2018 privacy policy for LB Maths Tuition Tutor Hub.",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="Compliant with the UK General Data Protection Regulation (UK GDPR) and Data Protection Act 2018"
    >
      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#48A5EE]" />
            <span>1. Overview &amp; Data Controller</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            <strong>LB MATHS TUITION LTD</strong> (Company No. 17119191, registered at 38 Macmurdo Road, Leigh-On-Sea, England, SS9 5AQ) is the Data Controller responsible for personal data processed via this website.
          </p>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            For any privacy inquiries or to exercise your statutory rights under UK GDPR, contact Luke Terry Bowdery directly at{" "}
            <a href="mailto:luke@lbmathstuition.co.uk" className="text-[#48A5EE] underline">
              luke@lbmathstuition.co.uk
            </a>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#48A5EE]" />
            <span>2. Strict Data Minimization: What We Collect</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            Because lesson bookings and billing are processed externally, personal data held on this platform is strictly minimized:
          </p>
          <div className="space-y-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1">
              <strong className="text-slate-800 dark:text-slate-200 block">Students (Minors under 18):</strong>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                <li><strong>Student Name:</strong> Provided by parents externally, used solely to identify the student and build their timetable profile.</li>
                <li><strong>Security Credentials:</strong> A random 4-digit PIN and secure Magic Link token for passwordless portal entry.</li>
                <li><strong>Lesson Records:</strong> Scheduled dates, times, attendance confirmation status, topics covered, and optional ratings/feedback.</li>
                <li><em>We do <strong>NOT</strong> collect or store student emails, phone numbers, home addresses, or financial data on this website.</em></li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1">
              <strong className="text-slate-800 dark:text-slate-200 block">Tutors:</strong>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Full name, company email address (<code>@lbmathstuition.co.uk</code>), bcrypt password hash, hourly pay rate, and lesson logs.</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1">
              <strong className="text-slate-800 dark:text-slate-200 block">Technical &amp; Audit Logs:</strong>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                <li>IP addresses, browser user agent, action timestamps, and audit trail logs (e.g. login events, attendance confirmations) to protect portal security.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>3. Lawful Bases for Processing (UK GDPR Art. 6)</span>
          </h2>
          <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            <li><strong>Contract Performance (Art. 6(1)(b)):</strong> To manage lesson timetables, launch Microsoft Teams calls, and verify attendance.</li>
            <li><strong>Legitimate Interests (Art. 6(1)(f)):</strong> To maintain a secure timetable audit log and prevent unauthorized access.</li>
            <li><strong>Parental Consent (Art. 6(1)(a) &amp; Art. 8):</strong> Parental authorization obtained during external enrollment to create the student profile.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-[#48A5EE]" />
            <span>4. Third-Party Infrastructure &amp; Sub-Processors</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            Platform data is stored and processed with trusted enterprise infrastructure providers:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            <li><strong>Cloud Database:</strong> <strong>Turso (ChiselStrike Inc.)</strong> hosted on <strong>AWS EU-West-1 (Europe/Ireland)</strong>. All database records remain strictly within the UK/EEA.</li>
            <li><strong>Web Hosting:</strong> <strong>Deno Deploy</strong> (Deno Land Inc.) — Serverless execution and application hosting.</li>
            <li><strong>Video Meetings:</strong> <strong>Microsoft Ireland Operations Limited (Microsoft Teams)</strong> — Live video calling. <em>No audio or video recordings are made or retained on the platform.</em></li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#48A5EE]" />
            <span>5. Data Retention, Deletion &amp; Your Rights</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            When an administrator deletes a student profile from the portal, all associated lesson history and audit entries are permanently purged from the database.
          </p>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            Under UK GDPR, you have the right to request access to your data, request rectification or erasure (&quot;right to be forgotten&quot;), or object to processing. You may also lodge a complaint with the UK supervisory authority:
          </p>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300">
            <strong>Information Commissioner&apos;s Office (ICO)</strong><br />
            Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF<br />
            Website: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-[#48A5EE] underline">ico.org.uk</a> &bull; Helpline: 0303 123 1113
          </div>
        </section>
      </div>
    </LegalPageLayout>
  );
}
