import { prisma } from "./prisma";

export type AuditAction =
  | "CREATED"
  | "DELAYED"
  | "STARTED_EARLY"
  | "TEAMS_LINK_UPDATED"
  | "RESCHEDULED"
  | "COMPLETED"
  | "REPORT_EDITED"
  | "REMINDER_UPDATED"
  | "CONFIRMATION_UPDATED"
  | "CANCELLED";

export interface LogAuditParams {
  sessionId: string;
  actorId: string;
  action: AuditAction;
  details?: string;
}

export async function logSessionAudit({
  sessionId,
  actorId,
  action,
  details,
}: LogAuditParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        sessionId,
        actorId,
        action,
        details,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    return null;
  }
}
