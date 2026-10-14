"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Download, X, Smartphone, Share, PlusSquare, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 1. In development on localhost, unregister any existing service worker and clear caches
    if (typeof window !== "undefined") {
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
              registration.unregister().catch(() => {});
            }
          });
        }
        if ("caches" in window) {
          caches.keys().then((keys) => {
            keys.forEach((key) => caches.delete(key));
          });
        }
        return;
      }

      // Register Service Worker in production
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            reg.update().catch(() => {});
          })
          .catch((err) => {
            console.warn("[PWA] Service worker registration notice:", err);
          });
      }
    }

    // 2. Check if already installed
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) {
        setIsInstalled(true);
        return;
      }

      // Check iOS detection
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIosDevice);

      // Check banner dismissal state
      const dismissedUntil = localStorage.getItem("lbmaths_pwa_dismissed");
      const isDismissed = dismissedUntil && Date.now() < parseInt(dismissedUntil, 10);

      // 3. Listen for Chrome/Edge/Android beforeinstallprompt
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        if (!isDismissed) {
          setShowBanner(true);
        }
      };

      // 4. Listen for appinstalled
      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setShowBanner(false);
      };

      // 5. Custom event trigger from Navbar or other buttons
      const handleTriggerInstall = () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === "accepted") {
              setIsInstalled(true);
              setShowBanner(false);
            }
            setDeferredPrompt(null);
          });
        } else if (isIosDevice) {
          setShowIosModal(true);
        } else {
          // Desktop Chrome/Safari without prompt or installed
          setShowBanner(true);
        }
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstall);
      window.addEventListener("appinstalled", handleAppInstalled);
      window.addEventListener("trigger-pwa-install", handleTriggerInstall);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        window.removeEventListener("appinstalled", handleAppInstalled);
        window.removeEventListener("trigger-pwa-install", handleTriggerInstall);
      };
    }
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIosModal(true);
      setShowBanner(false);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    // Dismiss for 7 days
    try {
      localStorage.setItem("lbmaths_pwa_dismissed", (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
    } catch {}
  };

  if (isInstalled) return null;

  return (
    <>
      {/* Floating Bottom Install Banner (Responsive for Mobile & Desktop) */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <Image
                src="/logo.png"
                alt="LB Maths Logo"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                Install LB Maths Portal
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Fast 1-tap access to your lessons
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismissBanner}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Install Guide Modal */}
      {showIosModal && (
        <div
          onClick={() => setShowIosModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 relative"
          >
            <button
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                <Image
                  src="/logo.png"
                  alt="LB Maths Logo"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  Install LB Maths
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add to your iPhone / iPad Home Screen
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="w-6 h-6 rounded-lg bg-[#48A5EE]/10 text-[#48A5EE] flex items-center justify-center shrink-0 font-bold">
                  1
                </div>
                <div>
                  Tap the <span className="font-bold text-slate-800 dark:text-slate-100">Share button</span>{" "}
                  <Share className="w-3.5 h-3.5 inline text-[#48A5EE] -mt-0.5" /> at the bottom of Safari.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="w-6 h-6 rounded-lg bg-[#48A5EE]/10 text-[#48A5EE] flex items-center justify-center shrink-0 font-bold">
                  2
                </div>
                <div>
                  Scroll down and tap{" "}
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    &apos;Add to Home Screen&apos;
                  </span>{" "}
                  <PlusSquare className="w-3.5 h-3.5 inline text-[#48A5EE] -mt-0.5" />.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="w-6 h-6 rounded-lg bg-[#48A5EE]/10 text-[#48A5EE] flex items-center justify-center shrink-0 font-bold">
                  3
                </div>
                <div>
                  Tap <span className="font-bold text-slate-800 dark:text-slate-100">&apos;Add&apos;</span> in the top-right corner.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
