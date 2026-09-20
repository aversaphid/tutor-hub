# TutorHub Manual Edge-Case Test Suite

This document outlines high-impact manual test cases specifically designed to verify interactive behaviors, timing boundaries, security guards, and edge cases that automated mock unit tests cannot reliably catch in a real browser.

---

## Quick Reference Matrix

| ID | Feature Area | Edge Case | Key Expected Behavior |
| :--- | :--- | :--- | :--- |
| **TC-01** | Calculator | $\pi$ Exact Evaluation & Toggling | Expressions with $\pi$ evaluate to $k\pi$ or $\frac{n\pi}{d}$ first; `S ⇔ D` toggles decimal $\longleftrightarrow$ exact $\pi$ |
| **TC-02** | Calculator | Nested Natural Display Cursor Trap | Up/Down/Left/Right rocker cleanly navigates inside and out of $\sqrt{\frac{■}{■}}$ and $x^■$ |
| **TC-03** | Calculator | Single-Keystroke Token Deletion | Pressing `DEL` on multi-letter functions (`sin(`, `³√`, `log_(`) removes the entire block, never leaving syntax fragments |
| **TC-04** | Calculator | Scale Persistence Across Reloads | Resizing via drag handle or `Ctrl +`/`Ctrl -` persists in `localStorage` across page refreshes |
| **TC-05** | Lesson Lifecycle | Premature Lesson Completion Guard | Completing a lesson *before* its scheduled start time triggers a warning modal; after start time, it completes directly |
| **TC-06** | Lesson Timing | 10-Min Early Entry vs 5-Min Link Reveal | Status shows "Enter 10 minutes before", while the Teams meeting join button only unlocks 5 minutes before start |
| **TC-07** | Admin Optimization | Activity Logs Lazy-Loading | Network tab confirms `/api/admin/audit-logs` is **not** requested on initial `/admin` load until clicking the tab |
| **TC-08** | Admin Analytics | Date Range & Month Filtering | Switching filters updates the summary statistics bar and filtered table rows in real-time |
| **TC-09** | Security & Auth | Role Privilege Separation | Logged-in student manually navigating to `/admin` or `/tutor` is immediately redirected |
| **TC-10** | Security & Auth | Student PIN Rate Limiting | 5 consecutive wrong PIN entries trigger a 15-minute rate limit lockout badge |
| **TC-11** | Accessibility | Sensory & Audio Preference Muting | Toggling sound off in Accessibility or Calculator completely suppresses audio chimes |

---

## 1. Casio fx-83GT X ClassWiz Calculator

### Test Case 01: Exact $\pi$ Display & `S ⇔ D` Decimal Toggle
- **Context:** Students preparing for GCSE/A-Level questions require answers "in terms of $\pi$" first, with the ability to inspect decimal approximations.
- **Steps:**
  1. Open the calculator modal (click the calculator floating button or header icon).
  2. Input: `2` $\rightarrow$ `×` $\rightarrow$ `SHIFT` $\rightarrow$ `×10ˣ (π)` $\rightarrow$ `5` $\rightarrow$ `=`.
  3. Verify the screen displays **`10π`** (not `31.4159...`).
  4. Press the **`S ⇔ D`** button.
  5. Verify the display toggles to **`31.41592654`**.
  6. Press **`S ⇔ D`** again.
  7. Verify the display toggles back to **`10π`**.
  8. Clear with `AC`, then input a vertical fraction: `■/■` $\rightarrow$ `SHIFT` $\rightarrow$ `π` $\rightarrow$ `DOWN` $\rightarrow$ `2` $\rightarrow$ `=`.
  9. Verify the screen shows a vertical fraction with **$\pi$** in the numerator and **$2$** in the denominator ($\frac{\pi}{2}$).
  10. Press **`S ⇔ D`** $\rightarrow$ verify decimal displays **`1.570796327`**.

### Test Case 02: Complex Natural V.P.A.M. Navigation
- **Context:** Entering nested math blocks (e.g. fractions inside roots) must not trap the cursor or misplace digits.
- **Steps:**
  1. Press `AC`.
  2. Press `√■`.
  3. Inside the radical, press `■/■`.
  4. Type `9` in numerator $\rightarrow$ press `DOWN` on the Replay Rocker $\rightarrow$ type `16` in denominator.
  5. Press `RIGHT` to exit the fraction (cursor still inside radical) $\rightarrow$ press `+` $\rightarrow$ type `1`.
  6. Press `RIGHT` to exit the radical entirely.
  7. Press `×` $\rightarrow$ `2` $\rightarrow$ `=`.
  8. Verify result is **`3.5`** (or $\frac{7}{2}$).

### Test Case 03: Token Deletion Boundaries (`DEL`)
- **Context:** In standard text fields, backspacing `sin(` can leave orphan characters like `si` or `n(`, crashing parsers.
- **Steps:**
  1. Press `AC`.
  2. Press `sin` (screen displays `sin(` with cursor inside).
  3. Press `DEL` once.
  4. Verify the entire `sin(` token is removed and the display returns to empty (`0`).
  5. Repeat for `³√` (`SHIFT` + `√■`), `log_■(■)`, and `|■|`.

### Test Case 04: Calculator Scaling & LocalStorage Persistence
- **Steps:**
  1. Note the current size of the calculator modal.
  2. Click the bottom-right drag handle and resize the calculator to a larger scale (or use `Ctrl` + `+`).
  3. Close the modal (`Esc` or `✕`).
  4. Hard refresh the page (`Ctrl` + `F5`).
  5. Reopen the calculator.
  6. Verify the calculator renders at the custom persisted scale rather than resetting to default.

---

## 2. Lesson Lifecycle & Early Completion Guard

### Test Case 05: Premature Lesson Completion Confirmation
- **Context:** Tutors accidentally marking lessons complete ahead of schedule disrupts attendance records and audit logs.
- **Steps:**
  1. Log in as Tutor or Head Tutor.
  2. Find or schedule a session whose start time is in the future (e.g. 30 minutes from now).
  3. Locate the session card and click **"Complete Lesson"**.
  4. **Expected Result:** A yellow/amber alert modal must pop up with the warning:
     > *"Are you sure you want to complete this lesson before its scheduled start time?"*
  5. Click **"Cancel"** $\rightarrow$ verify the session remains active and in-progress.
  6. Now find or start a lesson whose scheduled start time has already passed (or click "Start Lesson" first).
  7. Click **"Complete Lesson"**.
  8. **Expected Result:** The premature warning modal does **not** block completion; the standard rating/notes completion flow proceeds.

---

## 3. Link Reveal & Countdown Boundaries

### Test Case 06: "Enter 10 Mins Before" vs "Link Revealed 5 Mins Before"
- **Context:** Safeguarding rules prevent students from lingering unattended in Microsoft Teams meetings too early.
- **Steps:**
  1. Create a session starting in **12 minutes**.
  2. Open the Student Portal for that student.
  3. Verify the session badge/countdown says: **"Enter 10 minutes before"** and the Teams link is locked/disabled.
  4. Fast forward or wait until **8 minutes** remain before start:
     - Verify status indicates the window is approaching, but the **"Join Teams Call"** button remains locked until 5 minutes before.
  5. Fast forward or wait until **4 minutes 59 seconds** before start:
     - Verify the chime plays (`playSessionStartChime`) and the bright Teams button unlocks.

---

## 4. Security, Auth & Next.js 16 Proxy Isolation

### Test Case 07: Direct Route Access & Role Redirection
- **Context:** Next.js 16 `proxy.ts` guards route boundaries before page render.
- **Steps:**
  1. Log in with a Student magic key or PIN.
  2. In the browser address bar, manually change the URL to `http://localhost:3000/admin` and press Enter.
  3. **Expected Result:** Immediate redirection to `/tutor` or `/login?redirect=/admin`. The admin layout/dashboard must never flash or render.
  4. In the address bar, change URL to `http://localhost:3000/tutor` and press Enter.
  5. **Expected Result:** Immediate redirection to `/student`.

### Test Case 08: Student PIN Brute-Force Rate Limiting
- **Context:** Student 4-digit PINs must be defended against automated brute-force attempts.
- **Steps:**
  1. Navigate to `/login` and select "Student PIN Login".
  2. Enter a valid student name and an incorrect 4-digit PIN (e.g. `0000`).
  3. Submit 5 consecutive incorrect attempts within 1 minute.
  4. **Expected Result:** On the 5th attempt, the form must lock with an HTTP 429 response showing:
     > *"Too many failed login attempts. Please try again in 15 minutes."*

---

## 5. Admin Performance & Lazy Loading

### Test Case 09: Lazy-Loaded Activity / Audit Logs
- **Context:** Fetching all historical audit logs on initial `/admin` load wastes database egress on Turso.
- **Steps:**
  1. Open DevTools (`F12`) $\rightarrow$ select the **Network** tab $\rightarrow$ filter by `Fetch/XHR`.
  2. Navigate to `http://localhost:3000/admin`.
  3. Inspect the list of requests.
  4. **Verify:** `/api/admin/audit-logs` is **NOT** present in the network waterfall on initial load.
  5. Click on the **"Activity Logs"** tab.
  6. **Verify:** `/api/admin/audit-logs` is requested immediately upon tab selection and populates the table.

### Test Case 10: Date Range & Month Filtering on Lesson Records
- **Steps:**
  1. In the `/admin` Sessions tab, observe the top 1-line quick summary bar (Total Hours, Total Revenue, Completed Lessons).
  2. Switch the Date Filter dropdown from "All Time" to "This Month".
  3. **Verify:** Both the summary numbers and table rows update instantly without full-page reload.
  4. Switch to "Last Month" and test with a custom date range spanning 3 specific days.

---

## 6. Accessibility & Audio Preferences

### Test Case 11: Audio Muting & Sensory Preferences
- **Steps:**
  1. Open the Accessibility modal from the navbar/footer.
  2. Turn **Sound Effects** OFF (or mute audio cues).
  3. Open the Casio calculator and press keys (`1`, `+`, `2`, `=`).
  4. **Verify:** No mechanical key click sounds play.
  5. Trigger a lesson timer or test chime $\rightarrow$ verify complete silence.
  6. Re-enable sound $\rightarrow$ verify audio cues immediately return.

---

## Defect Reporting Template
If any manual test fails, record the failure using this format:
```markdown
- **Test ID**: TC-XX
- **Browser/OS**: Chrome 129 / Windows 11
- **Step Failed**: Step X
- **Observed Behavior**: [e.g. "Modal did not appear"]
- **Expected Behavior**: [e.g. "Warning confirmation modal should have prompted"]
- **Console Errors**: [Paste any Red DevTools errors]
```
