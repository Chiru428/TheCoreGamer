import {
  registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema,
  totpVerifySchema, createArticleSchema, createReviewSchema,
  createCommentSchema, commentVoteSchema, createReactionSchema,
  newsletterSubscribeSchema, pushSubscribeSchema, updateUserRoleSchema,
} from "@/validators";

describe("Zod Validators", () => {
  describe("registerSchema", () => {
    it("should accept valid registration data", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com", username: "testuser",
        displayName: "Test User", password: "Password123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = registerSchema.safeParse({
        email: "invalid", username: "testuser",
        displayName: "Test User", password: "Password123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject short password", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com", username: "testuser",
        displayName: "Test User", password: "short",
      });
      expect(result.success).toBe(false);
    });

    it("should reject password without uppercase", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com", username: "testuser",
        displayName: "Test User", password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject password without number", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com", username: "testuser",
        displayName: "Test User", password: "PasswordABC",
      });
      expect(result.success).toBe(false);
    });

    it("should reject username with special characters", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com", username: "test user!",
        displayName: "Test User", password: "Password123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject username too short", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com", username: "ab",
        displayName: "Test User", password: "Password123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("should accept valid login", () => {
      const result = loginSchema.safeParse({ email: "test@example.com", password: "pass" });
      expect(result.success).toBe(true);
    });

    it("should accept login with TOTP code", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com", password: "pass", totpCode: "123456",
      });
      expect(result.success).toBe(true);
    });

    it("should reject TOTP code with wrong length", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com", password: "pass", totpCode: "12345",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createArticleSchema", () => {
    it("should accept valid article", () => {
      const result = createArticleSchema.safeParse({
        title: "Test Article", content: { type: "doc" }, contentType: "NEWS",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid contentType", () => {
      const result = createArticleSchema.safeParse({
        title: "Test", content: {}, contentType: "INVALID",
      });
      expect(result.success).toBe(false);
    });

    it("should reject title over 255 chars", () => {
      const result = createArticleSchema.safeParse({
        title: "A".repeat(256), content: {}, contentType: "NEWS",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createCommentSchema", () => {
    it("should accept valid comment", () => {
      const result = createCommentSchema.safeParse({
        articleId: "clxxxxxxxxxxxxxxxxxxxxxxxxx", body: "Great article!",
      });
      expect(result.success).toBe(true);
    });

    it("should reject body over 2000 chars", () => {
      const result = createCommentSchema.safeParse({
        articleId: "clxxxxxxxxxxxxxxxxxxxxxxxxx", body: "A".repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it("should catch honeypot field", () => {
      const result = createCommentSchema.safeParse({
        articleId: "clxxxxxxxxxxxxxxxxxxxxxxxxx", body: "spam", website: "http://spam.com",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("commentVoteSchema", () => {
    it("should accept +1", () => {
      expect(commentVoteSchema.safeParse({ value: 1 }).success).toBe(true);
    });

    it("should accept -1", () => {
      expect(commentVoteSchema.safeParse({ value: -1 }).success).toBe(true);
    });

    it("should reject 0", () => {
      expect(commentVoteSchema.safeParse({ value: 0 }).success).toBe(false);
    });

    it("should reject 2", () => {
      expect(commentVoteSchema.safeParse({ value: 2 }).success).toBe(false);
    });
  });

  describe("createReactionSchema", () => {
    it("should accept valid reactions", () => {
      for (const type of ["LIKE", "FIRE", "AGREE", "FUNNY", "SURPRISED"]) {
        const result = createReactionSchema.safeParse({
          articleId: "clxxxxxxxxxxxxxxxxxxxxxxxxx", type,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should reject empty reaction type", () => {
      const result = createReactionSchema.safeParse({
        articleId: "clxxxxxxxxxxxxxxxxxxxxxxxxx", type: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject reaction type over 10 chars", () => {
      const result = createReactionSchema.safeParse({
        articleId: "clxxxxxxxxxxxxxxxxxxxxxxxxx", type: "TOOLONGTYPE!",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateUserRoleSchema", () => {
    it("should accept valid roles", () => {
      for (const role of ["VISITOR", "USER", "AUTHOR", "EDITOR", "ADMIN"]) {
        expect(updateUserRoleSchema.safeParse({ role }).success).toBe(true);
      }
    });

    it("should reject invalid role", () => {
      expect(updateUserRoleSchema.safeParse({ role: "SUPERADMIN" }).success).toBe(false);
    });
  });
});
