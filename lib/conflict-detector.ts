import { prisma } from "./prisma";

export interface ConflictCheckParams {
  tutorId: string;
  tuteeId: string;
  startTime: Date;
  endTime: Date;
  excludeSessionId?: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  reason?: string;
  conflictingSessionId?: string;
}

/**
 * Checks for overlapping sessions for both tutor and tutee.
 * Two sessions overlap if (ExistingStart < NewEnd) AND (ExistingEnd > NewStart).
 * Only active statuses (SCHEDULED, DELAYED, IN_PROGRESS) trigger conflicts.
 */
export async function detectSessionConflict(
  params: ConflictCheckParams
): Promise<ConflictResult> {
  const { tutorId, tuteeId, startTime, endTime, excludeSessionId } = params;

  if (endTime <= startTime) {
    return {
      hasConflict: true,
      reason: "Session end time must be after the start time.",
    };
  }

  const activeStatuses = ["SCHEDULED", "DELAYED", "IN_PROGRESS"] as const;

  // 1. Check Tutor's schedule
  const tutorOverlap = await prisma.session.findFirst({
    where: {
      id: excludeSessionId ? { not: excludeSessionId } : undefined,
      tutorId,
      status: { in: activeStatuses as unknown as any[] },
      scheduledStartTime: { lt: endTime },
      scheduledEndTime: { gt: startTime },
    },
    include: {
      tutor: { select: { name: true } },
      tutee: { select: { name: true } },
    },
  });

  if (tutorOverlap) {
    const startStr = tutorOverlap.scheduledStartTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endStr = tutorOverlap.scheduledEndTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      hasConflict: true,
      conflictingSessionId: tutorOverlap.id,
      reason: `Schedule Conflict: Tutor ${tutorOverlap.tutor.name} is already booked for "${tutorOverlap.title}" with ${tutorOverlap.tutee.name} from ${startStr} to ${endStr}.`,
    };
  }

  // 2. Check Tutee's schedule
  const tuteeOverlap = await prisma.session.findFirst({
    where: {
      id: excludeSessionId ? { not: excludeSessionId } : undefined,
      tuteeId,
      status: { in: activeStatuses as unknown as any[] },
      scheduledStartTime: { lt: endTime },
      scheduledEndTime: { gt: startTime },
    },
    include: {
      tutor: { select: { name: true } },
      tutee: { select: { name: true } },
    },
  });

  if (tuteeOverlap) {
    const startStr = tuteeOverlap.scheduledStartTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endStr = tuteeOverlap.scheduledEndTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      hasConflict: true,
      conflictingSessionId: tuteeOverlap.id,
      reason: `Schedule Conflict: Student ${tuteeOverlap.tutee.name} already has an active session "${tuteeOverlap.title}" with Tutor ${tuteeOverlap.tutor.name} from ${startStr} to ${endStr}.`,
    };
  }

  return { hasConflict: false };
}
