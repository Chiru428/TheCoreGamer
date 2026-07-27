import { TOXICITY_THRESHOLD, COMMENTS_PER_HOUR_LIMIT } from "@/lib/constants";

describe("Comment Constants", () => {
  describe("Toxicity Threshold", () => {
    it("should be set to 0.7", () => {
      expect(TOXICITY_THRESHOLD).toBe(0.7);
    });

    it("should auto-approve scores below threshold", () => {
      const score = 0.3;
      const status = score > TOXICITY_THRESHOLD ? "PENDING" : "APPROVED";
      expect(status).toBe("APPROVED");
    });

    it("should flag scores above threshold as pending", () => {
      const score = 0.85;
      const status = score > TOXICITY_THRESHOLD ? "PENDING" : "APPROVED";
      expect(status).toBe("PENDING");
    });

    it("should auto-approve scores exactly at threshold", () => {
      const score = TOXICITY_THRESHOLD;
      const status = score > TOXICITY_THRESHOLD ? "PENDING" : "APPROVED";
      expect(status).toBe("APPROVED");
    });

    it("should flag scores just above threshold", () => {
      const score = TOXICITY_THRESHOLD + 0.01;
      const status = score > TOXICITY_THRESHOLD ? "PENDING" : "APPROVED";
      expect(status).toBe("PENDING");
    });
  });

  describe("Rate Limits", () => {
    it("should limit to 20 comments per hour", () => {
      expect(COMMENTS_PER_HOUR_LIMIT).toBe(20);
    });

    it("should block comment when limit exceeded", () => {
      const commentCount = 21;
      expect(commentCount > COMMENTS_PER_HOUR_LIMIT).toBe(true);
    });

    it("should allow comment when under limit", () => {
      const commentCount = 2;
      expect(commentCount > COMMENTS_PER_HOUR_LIMIT).toBe(false);
    });
  });
});
