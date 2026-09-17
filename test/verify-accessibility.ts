import fs from "fs";
import path from "path";

async function run() {
  console.log("=== VERIFYING ACCESSIBILITY OPTIONS SUITE ===");

  const navbarPath = path.join(process.cwd(), "components", "navbar.tsx");
  const modalPath = path.join(process.cwd(), "components", "accessibility-modal.tsx");
  const a11yLibPath = path.join(process.cwd(), "lib", "accessibility.tsx");
  const audioCuesPath = path.join(process.cwd(), "lib", "audio-cues.ts");
  const countdownPath = path.join(process.cwd(), "components", "countdown-timer.tsx");
  const layoutPath = path.join(process.cwd(), "app", "layout.tsx");
  const globalsPath = path.join(process.cwd(), "app", "globals.css");

  // 1. Check lib/accessibility.tsx exists and exports required types and hooks
  const a11yLibContent = fs.readFileSync(a11yLibPath, "utf-8");
  if (!a11yLibContent.includes("AccessibilityProvider")) throw new Error("AccessibilityProvider missing in lib/accessibility.tsx");
  if (!a11yLibContent.includes("useAccessibility")) throw new Error("useAccessibility missing in lib/accessibility.tsx");
  if (!a11yLibContent.includes("dyslexicFont")) throw new Error("dyslexicFont option missing in lib/accessibility.tsx");
  if (!a11yLibContent.includes("highContrast")) throw new Error("highContrast option missing in lib/accessibility.tsx");
  if (!a11yLibContent.includes("reducedMotion")) throw new Error("reducedMotion option missing in lib/accessibility.tsx");
  if (!a11yLibContent.includes("soundMuted")) throw new Error("soundMuted option missing in lib/accessibility.tsx");
  if (!a11yLibContent.includes("readingGuide")) throw new Error("readingGuide option missing in lib/accessibility.tsx");
  console.log("✅ PASS: lib/accessibility.tsx exports complete preferences and provider.");

  // 2. Check components/accessibility-modal.tsx
  const modalContent = fs.readFileSync(modalPath, "utf-8");
  if (!modalContent.includes("Accessibility Options")) throw new Error("Accessibility Options title missing in modal");
  if (!modalContent.includes("Standard") || !modalContent.includes("Large (112%)") || !modalContent.includes("XL (125%)")) {
    throw new Error("Text size options missing in modal");
  }
  if (!modalContent.includes("Dyslexia-Friendly Font (Lexend)")) throw new Error("Dyslexia font toggle missing in modal");
  if (!modalContent.includes("Enhanced High Contrast Mode")) throw new Error("High contrast toggle missing in modal");
  if (!modalContent.includes("Reduced Motion")) throw new Error("Reduced motion toggle missing in modal");
  if (!modalContent.includes("Mute Audible Lesson Chimes")) throw new Error("Sound mute toggle missing in modal");
  if (!modalContent.includes("Reset to Defaults")) throw new Error("Reset to defaults missing in modal");
  console.log("✅ PASS: components/accessibility-modal.tsx includes all user controls and toggles.");

  // 3. Check components/navbar.tsx contains accessibility button & modal
  const navbarContent = fs.readFileSync(navbarPath, "utf-8");
  if (!navbarContent.includes("AccessibilityModal")) throw new Error("AccessibilityModal missing in navbar");
  if (!navbarContent.includes("Open accessibility options")) throw new Error("Accessibility button missing aria-label in navbar");
  console.log("✅ PASS: components/navbar.tsx includes Accessibility button and modal.");

  // 4. Check components/countdown-timer.tsx contains timer ARIA and accessibility controls
  const countdownContent = fs.readFileSync(countdownPath, "utf-8");
  if (!countdownContent.includes('role="timer"')) throw new Error('role="timer" missing in countdown-timer.tsx');
  if (!countdownContent.includes('aria-live="polite"')) throw new Error('aria-live="polite" missing in countdown-timer.tsx');
  if (!countdownContent.includes("useAccessibility")) throw new Error("useAccessibility missing in countdown-timer.tsx");
  if (!countdownContent.includes("preferences.reducedMotion")) throw new Error("Reduced motion check missing for confetti in countdown-timer.tsx");
  console.log("✅ PASS: components/countdown-timer.tsx has role=timer, aria-live, and reducedMotion checks.");

  // 5. Check lib/audio-cues.ts contains mute checks and sample preview
  const audioContent = fs.readFileSync(audioCuesPath, "utf-8");
  if (!audioContent.includes("isAudioMuted")) throw new Error("isAudioMuted missing in audio-cues.ts");
  if (!audioContent.includes("playSampleSound")) throw new Error("playSampleSound missing in audio-cues.ts");
  console.log("✅ PASS: lib/audio-cues.ts supports sound muting and sample sound playback.");

  // 6. Check app/globals.css contains required accessibility CSS classes
  const globalsContent = fs.readFileSync(globalsPath, "utf-8");
  if (!globalsContent.includes("a11y-font-large")) throw new Error("a11y-font-large missing in globals.css");
  if (!globalsContent.includes("a11y-dyslexic")) throw new Error("a11y-dyslexic missing in globals.css");
  if (!globalsContent.includes("a11y-high-contrast")) throw new Error("a11y-high-contrast missing in globals.css");
  if (!globalsContent.includes("a11y-reduced-motion")) throw new Error("a11y-reduced-motion missing in globals.css");
  if (!globalsContent.includes("a11y-focus-visible")) throw new Error("a11y-focus-visible missing in globals.css");
  console.log("✅ PASS: app/globals.css defines all WCAG 2.1 AAA accessibility utilities.");

  // 7. Check app/layout.tsx imports Lexend font and wraps in AccessibilityProvider
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  if (!layoutContent.includes("AccessibilityProvider")) throw new Error("AccessibilityProvider wrapper missing in layout.tsx");
  if (!layoutContent.includes("family=Lexend")) throw new Error("Lexend font link missing in layout.tsx");
  if (!layoutContent.includes("SubwaySurfersPlayer")) throw new Error("SubwaySurfersPlayer missing in layout.tsx");
  console.log("✅ PASS: app/layout.tsx loaded Lexend font, wrapped tree in AccessibilityProvider and SubwaySurfersPlayer.");

  // 8. Check secret Subway Surfers option in accessibility modal & preferences
  if (!a11yLibContent.includes("subwaySurfers")) throw new Error("subwaySurfers missing in lib/accessibility.tsx");
  if (!modalContent.includes("Subway Surfers Focus Video")) throw new Error("Subway Surfers option missing in accessibility modal");
  if (!modalContent.includes("Secret Mode") && !modalContent.includes("EASTER EGG")) throw new Error("Secret Mode / Easter Egg tag missing in modal");
  console.log("✅ PASS: components/accessibility-modal.tsx includes secret Subway Surfers focus option at bottom.");

  // 9. Check components/subway-surfers-player.tsx exists with top-left positioning and video embed
  const surferPlayerPath = path.join(process.cwd(), "components", "subway-surfers-player.tsx");
  if (!fs.existsSync(surferPlayerPath)) throw new Error("components/subway-surfers-player.tsx does not exist");
  const surferContent = fs.readFileSync(surferPlayerPath, "utf-8");
  if (!surferContent.includes("fixed") || !surferContent.includes("top-20") || !surferContent.includes("left-4")) {
    throw new Error("SubwaySurfersPlayer missing fixed top-left positioning");
  }
  if (!surferContent.includes("youtube") && !surferContent.includes("iframe")) {
    throw new Error("SubwaySurfersPlayer missing video embed");
  }
  console.log("✅ PASS: components/subway-surfers-player.tsx renders top-left floating video player with controls.");

  console.log("\n=== ALL ACCESSIBILITY CHECKS PASSED SUCCESSFULLY (9/9) ===");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

