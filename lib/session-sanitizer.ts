/**
 * Role-based field masking for session objects:
 * - HEAD_TUTOR: Sees all financial fields (studentPay, tutorPay).
 * - TUTOR: Sees tutorPay (compensation), but NEVER sees studentPay (the family/client fee).
 * - TUTEE (Student): NEVER sees tutorPay.
 */
export function sanitizeSessionForRole<T extends Record<string, any> | null | undefined>(
  session: T,
  role: string
): T {
  if (!session) return session;
  const isHeadTutor = role === "HEAD_TUTOR";
  const isStudent = role === "TUTEE";

  const sanitized: Record<string, any> = { ...session };

  // studentPay (what the student/family pays) is strictly private to HEAD_TUTOR
  if (!isHeadTutor) {
    delete sanitized.studentPay;
    if (sanitized.tutee) {
      sanitized.tutee = { ...sanitized.tutee };
      delete sanitized.tutee.studentPay;
    }
  }

  // tutorPay (what the tutor receives) is strictly hidden from TUTEE (students)
  if (isStudent) {
    delete sanitized.tutorPay;
    if (sanitized.tutee) {
      sanitized.tutee = { ...sanitized.tutee };
      delete sanitized.tutee.tutorPay;
    }
  }

  return sanitized as T;
}

export function sanitizeSessionsForRole<T extends Record<string, any>>(
  sessions: T[],
  role: string
): T[] {
  return sessions.map((s) => sanitizeSessionForRole(s, role));
}
