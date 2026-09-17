"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface AccessibilityPreferences {
  fontSize: "normal" | "large" | "xlarge";
  dyslexicFont: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  soundMuted: boolean;
  readingGuide: boolean;
  keyboardFocus: boolean;
  subwaySurfers: boolean;
}

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  fontSize: "normal",
  dyslexicFont: false,
  highContrast: false,
  reducedMotion: false,
  soundMuted: false,
  readingGuide: false,
  keyboardFocus: false,
  subwaySurfers: false,
};

const STORAGE_KEY = "a11y_preferences";

interface AccessibilityContextType {
  preferences: AccessibilityPreferences;
  updatePreferences: (partial: Partial<AccessibilityPreferences>) => void;
  resetPreferences: () => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(DEFAULT_PREFERENCES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [readingGuideY, setReadingGuideY] = useState<number>(-100);

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch {}
  }, []);

  // Synchronize CSS classes and attributes to DOM
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // Font size
    root.classList.remove("a11y-font-large", "a11y-font-xlarge");
    if (preferences.fontSize === "large") root.classList.add("a11y-font-large");
    if (preferences.fontSize === "xlarge") root.classList.add("a11y-font-xlarge");

    // Dyslexia-friendly font
    if (preferences.dyslexicFont) {
      root.classList.add("a11y-dyslexic");
    } else {
      root.classList.remove("a11y-dyslexic");
    }

    // High Contrast
    if (preferences.highContrast) {
      root.classList.add("a11y-high-contrast");
    } else {
      root.classList.remove("a11y-high-contrast");
    }

    // Reduced Motion
    if (preferences.reducedMotion) {
      root.classList.add("a11y-reduced-motion");
    } else {
      root.classList.remove("a11y-reduced-motion");
    }

    // High-visibility focus indicators
    if (preferences.keyboardFocus) {
      root.classList.add("a11y-focus-visible");
    } else {
      root.classList.remove("a11y-focus-visible");
    }

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {}
  }, [preferences]);

  // Reading guide mouse tracker
  useEffect(() => {
    if (!preferences.readingGuide) return;
    const handleMouseMove = (e: MouseEvent) => {
      setReadingGuideY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [preferences.readingGuide]);

  const updatePreferences = (partial: Partial<AccessibilityPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...partial }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
    } catch {}
  };

  return (
    <AccessibilityContext.Provider
      value={{
        preferences,
        updatePreferences,
        resetPreferences,
        isModalOpen,
        setIsModalOpen,
      }}
    >
      {children}

      {/* Reading Guide Ruler Overlay */}
      {preferences.readingGuide && readingGuideY >= 0 && (
        <div
          aria-hidden="true"
          className="fixed left-0 right-0 pointer-events-none z-50 transition-all duration-75 ease-out"
          style={{
            top: `${readingGuideY - 24}px`,
            height: "48px",
            backgroundColor: "rgba(72, 165, 238, 0.12)",
            borderTop: "2px solid #48A5EE",
            borderBottom: "2px solid #48A5EE",
            boxShadow: "0 0 20px rgba(72, 165, 238, 0.2)",
          }}
        />
      )}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}
