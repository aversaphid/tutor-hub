import { z } from "zod";

const singleEmailSchema = z.string().trim().email();

/**
 * Splits a raw string by commas, semicolons, or newlines into an array of trimmed,
 * lowercased, and deduplicated email strings.
 */
export function parseEmailList(raw?: string | null): string[] {
  if (!raw) return [];
  const parts = raw.split(/[,;\n\r]+/);
  const seen = new Set<string>();
  const emails: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim().toLowerCase();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      emails.push(trimmed);
    }
  }

  return emails;
}

/**
 * Checks whether a single email string is valid.
 */
export function isValidEmail(email: string): boolean {
  return singleEmailSchema.safeParse(email.trim()).success;
}

/**
 * Validates a multi-email string (comma, semicolon, or newline separated).
 * Returns validity status, any offending email, and the parsed array of valid emails.
 */
export function validateMultiEmails(raw?: string | null): {
  valid: boolean;
  error?: string;
  emails: string[];
} {
  const emails = parseEmailList(raw);
  if (emails.length === 0) {
    return { valid: true, emails: [] };
  }

  for (const email of emails) {
    if (!isValidEmail(email)) {
      return {
        valid: false,
        error: `"${email}" is not a valid email address. Please check and try again.`,
        emails: [],
      };
    }
  }

  return { valid: true, emails };
}

/**
 * Normalizes a multi-email input into a clean, comma-separated string (e.g. "mum@example.com, dad@example.com"),
 * or returns null if empty.
 */
export function normalizeMultiEmails(raw?: string | null): string | null {
  const result = validateMultiEmails(raw);
  if (!result.valid || result.emails.length === 0) {
    return null;
  }
  return result.emails.join(", ");
}

/**
 * Generates an RFC 6068 compliant mailto: URL for one or more email addresses.
 */
export function getMailtoUrl(rawEmails?: string | string[] | null): string {
  if (!rawEmails) return "";
  const list = Array.isArray(rawEmails) ? rawEmails : parseEmailList(rawEmails);
  if (list.length === 0) return "";
  return `mailto:${list.join(",")}`;
}
