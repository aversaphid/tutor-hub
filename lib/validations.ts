import { z } from "zod";

// Strict 4-digit numeric PIN
export const PinSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, { message: "PIN must be exactly 4 digits (0-9)." });

// Strict Microsoft Teams URL validation
export const TeamsUrlSchema = z
  .string()
  .trim()
  .refine(
    (url) => {
      if (!url) return true; // optional
      try {
        const parsed = new URL(url);
        if (parsed.protocol === "msteams:") return true;
        if (parsed.protocol === "https:") {
          const host = parsed.hostname.toLowerCase();
          return (
            host === "teams.microsoft.com" ||
            host.endsWith(".teams.microsoft.com") ||
            host === "teams.live.com" ||
            host.endsWith(".teams.office.com")
          );
        }
        return false;
      } catch {
        return false;
      }
    },
    {
      message:
        "Please provide a valid Microsoft Teams meeting URL (e.g. https://teams.microsoft.com/l/meetup-join/... or msteams://...)",
    }
  );

// Student PIN login payload (supports direct PIN entry or tuteeId + PIN)
export const StudentPinLoginSchema = z.object({
  tuteeId: z.string().optional(),
  pin: PinSchema,
});

// Magic key validation
export const MagicKeySchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9-_]{6,64}$/, "Invalid magic link format");

// User creation/update
export const CreateUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  role: z.enum(["HEAD_TUTOR", "TUTOR", "TUTEE"]),
  password: z.string().min(5, "Password must be at least 5 characters").optional(),
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits").optional().or(z.literal("")),
  assignedTutorId: z.string().optional().nullable(),
  studentPay: z.number().min(0, "Student pay must be 0 or more").optional().nullable(),
  tutorPay: z.number().min(0, "Tutor pay must be 0 or more").optional().nullable(),
});

// Change password schema
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(5, "New password must be at least 5 characters"),
});

// Reassign student tutor
export const ReassignStudentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  assignedTutorId: z.string().nullable().optional(),
});

// Update student profile and pay rates
export const UpdateStudentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
  assignedTutorId: z.string().nullable().optional(),
  studentPay: z.number().min(0).nullable().optional(),
  tutorPay: z.number().min(0).nullable().optional(),
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits").optional().nullable().or(z.literal("")),
  active: z.boolean().optional(),
  cycleMagicKey: z.boolean().optional(),
});

// Toggle user active status
export const ToggleUserActiveSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  active: z.boolean().optional(),
});

// Batch archive sessions by date range or tutor
export const BatchArchiveSessionsSchema = z.object({
  startDate: z.string().datetime({ message: "Invalid ISO start date" }),
  endDate: z.string().datetime({ message: "Invalid ISO end date" }),
  sessionIds: z.array(z.string()).optional(),
  tutorId: z.string().optional(),
});

// Admin update user password
export const AdminUpdateUserPasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  newPassword: z.string().min(5, "New password must be at least 5 characters"),
});

// Lesson Completion by Student (What was covered, 1-5 star rating, optional notes)
export const LessonCompletionSchema = z.object({
  feedbackCovered: z.string().trim().min(2, "Please specify what you covered in the lesson"),
  feedbackRating: z.number().int().min(1, "Please give a rating between 1 and 5 stars").max(5),
  feedbackNotes: z.string().trim().max(1000).optional(),
});

// Session creation (Topic / Title is OPTIONAL and defaults to Maths Lesson)
export const CreateSessionSchema = z.object({
  title: z.string().trim().max(150).optional(),
  tutorId: z.string().min(1, "Please select a tutor"),
  tuteeId: z.string().min(1, "Please select a student"),
  scheduledStartTime: z.string().datetime({ message: "Invalid ISO start time" }),
  scheduledEndTime: z.string().datetime({ message: "Invalid ISO end time" }),
  teamsMeetingUrl: TeamsUrlSchema.optional().or(z.literal("")),
  unlockEarlyMinutes: z.number().int().min(1).max(60).optional().default(5),
  notes: z.string().max(1000).optional(),
  adminReminder: z.string().max(1000).optional().or(z.literal("")),
  tutorConfirmed: z.boolean().optional(),
  tuteeConfirmed: z.boolean().optional(),
  repeatWeeks: z.number().int().min(1).max(12).optional(),
  repeatIntervalWeeks: z.number().int().min(1).max(4).optional(),
  allowOverlap: z.boolean().optional(),
});

// Session update
export const UpdateSessionSchema = z.object({
  title: z.string().trim().max(150).optional(),
  tutorId: z.string().optional(),
  scheduledStartTime: z.string().datetime().optional(),
  scheduledEndTime: z.string().datetime().optional(),
  teamsMeetingUrl: TeamsUrlSchema.optional().nullable().or(z.literal("")),
  unlockEarlyMinutes: z.number().int().min(1).max(60).optional().nullable(),
  status: z.enum(["SCHEDULED", "DELAYED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  tutorPaid: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable(),
  adminReminder: z.string().max(1000).optional().nullable(),
  tutorConfirmed: z.boolean().optional(),
  tuteeConfirmed: z.boolean().optional(),
  feedbackCovered: z.string().optional().nullable(),
  feedbackRating: z.number().int().min(1).max(5).optional().nullable(),
  feedbackNotes: z.string().optional().nullable(),
  allowOverlap: z.boolean().optional(),
});

// Session delay schema
export const DelaySessionSchema = z.object({
  delayMinutes: z.number().int().min(1).max(180),
  reason: z.string().max(250).optional(),
});

// Shared Resource schemas
export const CreateResourceSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  url: z.string().trim().min(1, "URL is required").max(1000),
  description: z.string().trim().max(1000).optional().nullable(),
  category: z.string().trim().max(50).optional().default("General"),
});

export const UpdateResourceSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150).optional(),
  url: z.string().trim().min(1, "URL is required").max(1000).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  category: z.string().trim().max(50).optional(),
});

