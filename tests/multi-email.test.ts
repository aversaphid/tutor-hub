import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseEmailList,
  isValidEmail,
  validateMultiEmails,
  normalizeMultiEmails,
  getMailtoUrl,
} from "../lib/email-utils";
import { CreateUserSchema, UpdateStudentSchema } from "../lib/validations";

describe("Multi-Email Utilities & Validation", () => {
  it("parses single, comma-separated, semicolon-separated, and newline-separated emails", () => {
    assert.deepEqual(parseEmailList("single@example.com"), ["single@example.com"]);
    assert.deepEqual(parseEmailList("mum@example.com, dad@example.com"), [
      "mum@example.com",
      "dad@example.com",
    ]);
    assert.deepEqual(parseEmailList("mum@example.com; dad@example.com"), [
      "mum@example.com",
      "dad@example.com",
    ]);
    assert.deepEqual(parseEmailList("mum@example.com\ndad@example.com"), [
      "mum@example.com",
      "dad@example.com",
    ]);
  });

  it("normalizes case, trims spaces, and deduplicates identical emails", () => {
    const raw = "  MUM@Example.com , dad@example.com; mum@example.com  ";
    assert.deepEqual(parseEmailList(raw), ["mum@example.com", "dad@example.com"]);
    assert.equal(normalizeMultiEmails(raw), "mum@example.com, dad@example.com");
  });

  it("validates multi-email strings correctly", () => {
    assert.equal(validateMultiEmails("").valid, true);
    assert.equal(validateMultiEmails(null).valid, true);
    assert.equal(validateMultiEmails("mum@example.com, dad@example.com").valid, true);

    const invalidSingle = validateMultiEmails("invalid-email");
    assert.equal(invalidSingle.valid, false);

    const invalidInList = validateMultiEmails("mum@example.com, not-an-email, dad@example.com");
    assert.equal(invalidInList.valid, false);
    assert.match(invalidInList.error || "", /not-an-email/);
  });

  it("generates correct RFC 6068 mailto URLs", () => {
    assert.equal(getMailtoUrl(["mum@example.com"]), "mailto:mum@example.com");
    assert.equal(
      getMailtoUrl(["mum@example.com", "dad@example.com"]),
      "mailto:mum@example.com,dad@example.com"
    );
    assert.equal(
      getMailtoUrl("mum@example.com, dad@example.com"),
      "mailto:mum@example.com,dad@example.com"
    );
  });

  it("allows multiple parent emails in CreateUserSchema and UpdateStudentSchema", () => {
    const validCreate = CreateUserSchema.safeParse({
      name: "Alex Smith",
      role: "TUTEE",
      parentEmail: "mum@example.com, dad@example.com",
    });
    assert.equal(validCreate.success, true);

    const invalidCreate = CreateUserSchema.safeParse({
      name: "Alex Smith",
      role: "TUTEE",
      parentEmail: "mum@example.com, invalid-email",
    });
    assert.equal(invalidCreate.success, false);

    const validUpdate = UpdateStudentSchema.safeParse({
      studentId: "student-123",
      parentEmail: "guardian1@test.co.uk; guardian2@test.co.uk",
    });
    assert.equal(validUpdate.success, true);

    const invalidUpdate = UpdateStudentSchema.safeParse({
      studentId: "student-123",
      parentEmail: "bad-email",
    });
    assert.equal(invalidUpdate.success, false);
  });
});
