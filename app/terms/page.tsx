import React from "react";
import LegalPageLayout from "@/components/legal-page-layout";
import { Info, Clock, ShieldAlert, Laptop } from "lucide-react";

export const metadata = {
  title: "Platform Terms of Use | LB Maths Tuition",
  description: "Terms of use governing the LB Maths Tuition Tutor Hub platform.",
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Platform Terms of Use"
      subtitle="Governing access to and use of the Tutor Hub portal"
    >
      <div className="space-y-6">
        <div className="p-4 rounded-2xl bg-[#48A5EE]/10 border border-[#48A5EE]/20 flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
          <Info className="w-4 h-4 text-[#48A5EE] shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900 dark:text-slate-100 block mb-0.5">
              Important: Lessons are booked externally
            </strong>
            Lessons and tuition packages are not booked or purchased through this platform. All tuition
            contracts, hourly fees, and schedules are arranged externally between the client
            (parent/guardian) and LB MATHS TUITION LTD.
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>1. Platform Purpose &amp; Scope</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            1.1 These Terms of Use (&quot;Terms&quot;) govern access to and use of the <strong>Tutor Hub</strong> web
            portal operated by <strong>LB MATHS TUITION LTD</strong> (&quot;the Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) at{" "}
            <code>lbmathstuition.co.uk</code>.
          </p>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            1.2 This platform serves solely as an authenticated operational portal for displaying scheduled lesson
            timetables, launching Microsoft Teams video meeting links, recording attendance, and accessing formula sheets and revision materials.
          </p>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            1.3 <strong>Minors &amp; Parental Authority:</strong> Tutoring services are provided to students under the age of 18 (&quot;Student&quot;).
            Student profiles on this portal are set up following external enrollment authorized by the Student&apos;s parent or legal guardian.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>2. Student Profiles &amp; Security Access</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            2.1 <strong>Profile Creation:</strong> Student profiles are created manually by the platform administrator using solely the student&apos;s name provided during external onboarding. No student email address, home address, or payment details are collected, requested, or stored on this website.
          </p>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            2.2 <strong>Access Credentials:</strong> Students access their individual timetable and lesson links using their name combined with an administrator-issued <strong>4-digit PIN</strong> or private <strong>Magic Link</strong>.
          </p>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            2.3 Parents and students are responsible for maintaining the confidentiality of their PIN and Magic Link. You must notify us immediately at <a href="mailto:luke@lbmathstuition.co.uk" className="text-[#48A5EE] underline">luke@lbmathstuition.co.uk</a> if you suspect unauthorized access.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#48A5EE]" />
            <span>3. Lesson Cancellations &amp; Rescheduling</span>
          </h2>
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
            <strong>3-Hour Cancellation Policy:</strong> Any cancellation or request to reschedule a scheduled lesson must be made with at least <strong>3 hours&apos; notice</strong> prior to the scheduled start time.
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            3.1 In accordance with your external tuition agreement, any cancellation or reschedule request provided with less than 3 hours&apos; notice remains chargeable in full.
          </p>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            3.2 <strong>Tutor Delays:</strong> If a tutor encounters an unavoidable delay, they will update the lesson status with a delay notification (e.g., +5m or +10m). Lost time will be made up or credited accordingly.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Laptop className="w-4 h-4 text-[#48A5EE]" />
            <span>4. Online Delivery (Microsoft Teams) &amp; Conduct</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            4.1 Lessons are conducted remotely via Microsoft Teams. Clients are responsible for providing suitable hardware, microphone, camera, and stable internet connectivity.
          </p>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            4.2 Users agree not to misuse the portal, attempt unauthorized access to other user profiles, or tamper with the underlying software or data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#48A5EE]" />
            <span>5. Academic Disclaimer &amp; Liability</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            5.1 The portal and tuition materials are provided to assist the student&apos;s mathematics studies. While we strive for educational excellence, we make no guarantee of specific examination grades or educational outcomes.
          </p>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
            5.2 The platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the fullest extent permitted by English law, LB MATHS TUITION LTD disclaims liability for any indirect losses or temporary service interruptions.
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}
