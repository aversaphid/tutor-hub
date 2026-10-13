import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AccessibilityProvider } from "@/lib/accessibility";
import SubwaySurfersPlayer from "@/components/subway-surfers-player";
import PwaInstaller from "@/components/pwa-installer";

export const viewport: Viewport = {
  themeColor: "#48A5EE",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "LB Maths Tuition | Student Portal & Online Lessons",
  description:
    "Join your online maths tuition session with your tutor. Simple, reliable, and account-conflict free Microsoft Teams lessons.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/icon-192.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LB Maths",
  },
  openGraph: {
    title: "LB Maths Tuition | Student Portal & Online Lessons",
    description:
      "Join your online maths tuition session with your tutor. Simple, reliable, and account-conflict free Microsoft Teams lessons.",
    type: "website",
    siteName: "LB Maths Tuition",
  },
  twitter: {
    card: "summary",
    title: "LB Maths Tuition | Student Portal & Online Lessons",
    description:
      "Join your online maths tuition session with your tutor. Simple, reliable, and account-conflict free Microsoft Teams lessons.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storedTheme = localStorage.getItem('theme');
                if (storedTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }

                const storedA11y = localStorage.getItem('a11y_preferences');
                if (storedA11y) {
                  const p = JSON.parse(storedA11y);
                  if (p.fontSize === 'large') document.documentElement.classList.add('a11y-font-large');
                  if (p.fontSize === 'xlarge') document.documentElement.classList.add('a11y-font-xlarge');
                  if (p.dyslexicFont) document.documentElement.classList.add('a11y-dyslexic');
                  if (p.highContrast) document.documentElement.classList.add('a11y-high-contrast');
                  if (p.reducedMotion) document.documentElement.classList.add('a11y-reduced-motion');
                  if (p.keyboardFocus) document.documentElement.classList.add('a11y-focus-visible');
                }
              } catch (e) {}
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lexend:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LB Maths" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-[#0b1120] text-slate-800 dark:text-slate-100 selection:bg-[#48A5EE] selection:text-white transition-colors duration-200">
        <AccessibilityProvider>
          {children}
          <SubwaySurfersPlayer />
          <PwaInstaller />
        </AccessibilityProvider>
      </body>
    </html>
  );
}
