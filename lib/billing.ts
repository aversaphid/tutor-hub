/**
 * Billing & Finance Duration Multiplier Engine
 *
 * Supports two system-wide calculation modes:
 * 1. ROUND_NEAREST_HOUR (Default):
 *    Rounds lesson duration in hours to the nearest integer hour (minimum 1).
 *    e.g. 1 hour 25 mins -> 1 hour
 *         1 hour 30 mins -> 2 hours
 *         2 hours -> 2 hours
 * 2. PROPORTIONAL:
 *    Calculates fees strictly proportional to duration (half an hour = 0.5x, 1h 30m = 1.5x, 2h = 2.0x).
 */

export type BillingDurationMode = "ROUND_NEAREST_HOUR" | "PROPORTIONAL";

export const DEFAULT_BILLING_DURATION_MODE: BillingDurationMode = "ROUND_NEAREST_HOUR";

/**
 * Calculates raw duration in hours between two dates, or extracts duration from a session object.
 */
export function getLessonDurationHours(
  startTimeOrSession?: any,
  endTime?: Date | string | null
): number {
  let startVal = startTimeOrSession;
  let endVal = endTime;

  if (
    startTimeOrSession &&
    typeof startTimeOrSession === "object" &&
    !(startTimeOrSession instanceof Date)
  ) {
    startVal = startTimeOrSession.scheduledStartTime ?? startTimeOrSession.startTime;
    endVal = startTimeOrSession.scheduledEndTime ?? startTimeOrSession.endTime;
  }

  if (!startVal || !endVal) return 1;
  const start = new Date(startVal).getTime();
  const end = new Date(endVal).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return 1;
  return (end - start) / (1000 * 60 * 60);
}

/**
 * Calculates the billing multiplier based on system-wide mode.
 * Supports either getLessonDurationMultiplier(session, mode) or getLessonDurationMultiplier(start, end, mode).
 */
export function getLessonDurationMultiplier(
  startTimeOrSession?: any,
  endTimeOrMode?: any,
  maybeMode?: BillingDurationMode
): number {
  let mode: BillingDurationMode = DEFAULT_BILLING_DURATION_MODE;
  let rawHours: number;

  if (
    startTimeOrSession &&
    typeof startTimeOrSession === "object" &&
    !(startTimeOrSession instanceof Date)
  ) {
    rawHours = getLessonDurationHours(startTimeOrSession);
    if (typeof endTimeOrMode === "string") {
      mode = endTimeOrMode as BillingDurationMode;
    }
  } else {
    rawHours = getLessonDurationHours(startTimeOrSession, endTimeOrMode);
    if (typeof maybeMode === "string") {
      mode = maybeMode;
    }
  }

  if (mode === "PROPORTIONAL") {
    return Math.max(0, rawHours);
  }
  // Round to nearest integer hour, minimum 1
  return Math.max(1, Math.round(rawHours));
}

export interface SessionAmountInfo {
  durationHours: number;
  multiplier: number;
  studentPay: number;      // Total client fee for this session
  tutorPay: number;        // Total tutor payout for this session
  baseStudentRate: number; // Underlying hourly client rate
  baseTutorRate: number;   // Underlying hourly tutor rate
}

/**
 * Calculates both student fee and tutor payout for a session,
 * applying the duration multiplier to base hourly rates.
 */
export function calculateSessionAmounts(
  session: {
    scheduledStartTime?: Date | string | null;
    scheduledEndTime?: Date | string | null;
    studentPay?: number | null;
    tutorPay?: number | null;
    tutee?: {
      studentPay?: number | null;
      tutorPay?: number | null;
    } | null;
  },
  mode: BillingDurationMode = DEFAULT_BILLING_DURATION_MODE
): SessionAmountInfo {
  const durationHours = getLessonDurationHours(
    session.scheduledStartTime,
    session.scheduledEndTime
  );
  const multiplier = getLessonDurationMultiplier(
    session.scheduledStartTime,
    session.scheduledEndTime,
    mode
  );

  const baseStudentRate =
    typeof session.studentPay === "number" && !isNaN(session.studentPay)
      ? session.studentPay
      : typeof session.tutee?.studentPay === "number" && !isNaN(session.tutee.studentPay)
      ? session.tutee.studentPay
      : 0;

  const baseTutorRate =
    typeof session.tutorPay === "number" && !isNaN(session.tutorPay)
      ? session.tutorPay
      : typeof session.tutee?.tutorPay === "number" && !isNaN(session.tutee.tutorPay)
      ? session.tutee.tutorPay
      : 0;

  const studentPay = Math.round(baseStudentRate * multiplier * 100) / 100;
  const tutorPay = Math.round(baseTutorRate * multiplier * 100) / 100;

  return {
    durationHours,
    multiplier,
    studentPay,
    tutorPay,
    baseStudentRate,
    baseTutorRate,
  };
}

export function getSessionStudentPay(
  session: any,
  mode: BillingDurationMode = DEFAULT_BILLING_DURATION_MODE
): number {
  return calculateSessionAmounts(session, mode).studentPay;
}

export function getSessionTutorPay(
  session: any,
  mode: BillingDurationMode = DEFAULT_BILLING_DURATION_MODE
): number {
  return calculateSessionAmounts(session, mode).tutorPay;
}
