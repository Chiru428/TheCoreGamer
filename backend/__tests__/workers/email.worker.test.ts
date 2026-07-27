/**
 * Tests for the email BullMQ worker.
 * Verifies that each job type dispatches the correct resend helper.
 */

// ── Resend helpers mock ───────────────────────────────────────────────────────
const mockSendVerificationEmail = jest.fn().mockResolvedValue(undefined);
const mockSendPasswordResetEmail = jest.fn().mockResolvedValue(undefined);
const mockSendWelcomeEmail = jest.fn().mockResolvedValue(undefined);
const mockSendArticleApprovalEmail = jest.fn().mockResolvedValue(undefined);
const mockSendArticleRejectionEmail = jest.fn().mockResolvedValue(undefined);
const mockSendEditorNotificationEmail = jest.fn().mockResolvedValue(undefined);
const mockSendNewsletterConfirmationEmail = jest.fn().mockResolvedValue(undefined);

jest.mock("@/lib/resend", () => ({
  sendVerificationEmail: (...args: unknown[]) => mockSendVerificationEmail(...args),
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
  sendWelcomeEmail: (...args: unknown[]) => mockSendWelcomeEmail(...args),
  sendArticleApprovalEmail: (...args: unknown[]) => mockSendArticleApprovalEmail(...args),
  sendArticleRejectionEmail: (...args: unknown[]) => mockSendArticleRejectionEmail(...args),
  sendEditorNotificationEmail: (...args: unknown[]) => mockSendEditorNotificationEmail(...args),
  sendNewsletterConfirmationEmail: (...args: unknown[]) => mockSendNewsletterConfirmationEmail(...args),
}));

// ── BullMQ Worker mock — capture the processor function instead of spinning up Redis ──
type ProcessorFn = (job: { data: Record<string, unknown> }) => Promise<void>;
let capturedProcessor: ProcessorFn | null = null;

jest.mock("@/lib/bullmq", () => {
  class MockWorker {
    constructor(_queue: string, processor: ProcessorFn, _opts: unknown) {
      capturedProcessor = processor;
    }
    on(_event: string, _cb: unknown) {
      return this;
    }
  }
  const connection = {};
  return { Worker: MockWorker, connection };
});

// ── Import worker (side-effect: registers capturedProcessor) ──────────────────
import "@/workers/email.worker";

// ── Helper: build a mock BullMQ Job ──────────────────────────────────────────
function makeJob(type: string, to: string | string[], data: Record<string, unknown>) {
  return { id: "job-1", data: { type, to, data } };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("Email Worker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("processes a 'welcome' job and calls sendWelcomeEmail", async () => {
    expect(capturedProcessor).not.toBeNull();
    await capturedProcessor!(makeJob("welcome", "user@example.com", { displayName: "Alice" }));
    expect(mockSendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(mockSendWelcomeEmail).toHaveBeenCalledWith("user@example.com", "Alice");
  });

  it("processes a 'verification' job and calls sendVerificationEmail", async () => {
    await capturedProcessor!(
      makeJob("verification", "user@example.com", { token: "raw-token-123", displayName: "Bob" })
    );
    expect(mockSendVerificationEmail).toHaveBeenCalledWith("user@example.com", "raw-token-123", "Bob");
  });

  it("processes a 'reset' job and calls sendPasswordResetEmail", async () => {
    await capturedProcessor!(
      makeJob("reset", "user@example.com", { token: "reset-token-abc" })
    );
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith("user@example.com", "reset-token-abc");
  });

  it("processes an 'approval' job and calls sendArticleApprovalEmail", async () => {
    await capturedProcessor!(
      makeJob("approval", "author@example.com", {
        displayName: "Author",
        articleTitle: "Great Article",
        articleSlug: "great-article",
      })
    );
    expect(mockSendArticleApprovalEmail).toHaveBeenCalledWith(
      "author@example.com",
      "Author",
      "Great Article",
      "great-article"
    );
  });

  it("processes a 'rejection' job and calls sendArticleRejectionEmail", async () => {
    await capturedProcessor!(
      makeJob("rejection", "author@example.com", {
        displayName: "Author",
        articleTitle: "Bad Article",
        reason: "Needs more work",
      })
    );
    expect(mockSendArticleRejectionEmail).toHaveBeenCalledWith(
      "author@example.com",
      "Author",
      "Bad Article",
      "Needs more work"
    );
  });

  it("processes a 'newsletter-confirm' job and calls sendNewsletterConfirmationEmail", async () => {
    await capturedProcessor!(
      makeJob("newsletter-confirm", "sub@example.com", { token: "confirm-xyz" })
    );
    expect(mockSendNewsletterConfirmationEmail).toHaveBeenCalledWith("sub@example.com", "confirm-xyz");
  });

  it("processes an 'editor-notification' job and calls sendEditorNotificationEmail", async () => {
    await capturedProcessor!(
      makeJob("editor-notification", ["ed1@example.com", "ed2@example.com"], {
        articleTitle: "New Submission",
        authorName: "Writer",
      })
    );
    expect(mockSendEditorNotificationEmail).toHaveBeenCalledWith(
      ["ed1@example.com", "ed2@example.com"],
      "New Submission",
      "Writer"
    );
  });

  it("does not throw on unknown job type", async () => {
    await expect(
      capturedProcessor!(makeJob("unknown-type", "x@example.com", {}))
    ).resolves.toBeUndefined();
  });
});
