import React from "react";
import LegalPageLayout from "@/components/legal-page-layout";
import { ShieldCheck, VideoOff, Home, PhoneCall, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Child Safeguarding & Online Safety | LB Maths Tuition",
  description: "Child safeguarding, Enhanced DBS vetting, and online safety policy for LB Maths Tuition.",
};

export default function SafeguardingPage() {
  return (
    <LegalPageLayout
      title="Child Safeguarding &amp; Online Safety"
      subtitle="Safeguarding policies, Enhanced DBS vetting, and online session safety rules"
    >
      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>1. Commitment to Child Protection</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            LB MATHS TUITION LTD provides tutoring exclusively to children and young people under the age of 18.
            The safety, welfare, and well-being of every student is our primary concern. We adhere to the core principles of{" "}
            <em>Keeping Children Safe in Education (KCSIE)</em> and statutory child protection guidance.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>2. Enhanced DBS Vetting &amp; Screening</span>
          </h2>
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
            <strong>100% Enhanced DBS Checked:</strong> All tutors engaged by LB MATHS TUITION LTD hold a valid, clear Enhanced Disclosure and Barring Service (DBS) check before tutoring any student.
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            Tutor qualifications, identity, and background references are verified prior to student assignment.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <VideoOff className="w-4 h-4 text-rose-500" />
            <span>3. Online Tuition Rules (Microsoft Teams)</span>
          </h2>
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 space-y-1">
            <strong className="text-sm block">Strict No-Recording Policy:</strong>
            <p>
              Lessons conducted via Microsoft Teams are <strong>NOT recorded</strong> by LB MATHS TUITION LTD or its tutors.
              Neither tutors, students, nor parents may record, screen-capture, or distribute video or audio of tutoring sessions without explicit, prior written consent from all parties.
            </p>
          </div>

          <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2">
              <Home className="w-4 h-4 text-[#48A5EE] shrink-0 mt-0.5" />
              <div>
                <strong>Learning Environment &amp; Dress Code:</strong> Lessons must be held in an open, family-accessible room (e.g. study, dining room, living room) and never in a private bedroom. Both tutor and student must be dressed appropriately.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#48A5EE] shrink-0 mt-0.5" />
              <div>
                <strong>Parental Presence:</strong> Parents and guardians are encouraged to be in the home during sessions and retain the full right to observe any portion of an online lesson.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong>No Private Messaging:</strong> Tutors do not have access to student personal email addresses or phone numbers on this platform. Tutors are strictly prohibited from contacting students via personal social media or private messaging apps.
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-[#48A5EE]" />
            <span>4. Designated Safeguarding Lead (DSL) &amp; Reporting</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            Any concern regarding child welfare, online safety, or inappropriate conduct must be reported immediately to our Designated Safeguarding Lead:
          </p>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1">
            <div><strong>Designated Safeguarding Lead:</strong> Luke Terry Bowdery</div>
            <div>
              <strong>Email:</strong>{" "}
              <a href="mailto:luke@lbmathstuition.co.uk" className="text-[#48A5EE] underline">
                luke@lbmathstuition.co.uk
              </a>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            If a child is believed to be in immediate physical danger, call emergency services immediately on <strong>999</strong> or contact the NSPCC Child Protection Helpline on <strong>0808 800 5000</strong>.
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}
