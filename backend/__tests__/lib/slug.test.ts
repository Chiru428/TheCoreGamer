// Mock prisma to avoid DB connection in unit tests
jest.mock("@/lib/prisma", () => ({
  prisma: {
    article: { findUnique: jest.fn().mockResolvedValue(null) },
    game: { findUnique: jest.fn().mockResolvedValue(null) },
    category: { findUnique: jest.fn().mockResolvedValue(null) },
    tag: { findUnique: jest.fn().mockResolvedValue(null) },
  },
}));

import { generateBaseSlug } from "@/lib/slug";

describe("Slug Generation", () => {
  describe("generateBaseSlug", () => {
    it("should lowercase and hyphenate", () => {
      expect(generateBaseSlug("Hello World")).toBe("hello-world");
    });

    it("should remove stop words", () => {
      expect(generateBaseSlug("The Best Games of the Year")).toBe("best-games-year");
    });

    it("should remove special characters", () => {
      expect(generateBaseSlug("What's New in Gaming? #1 Guide!")).toBe("whats-new-gaming-1-guide");
    });

    it("should handle multiple spaces", () => {
      expect(generateBaseSlug("Elder   Scrolls   VI")).toBe("elder-scrolls-vi");
    });

    it("should truncate to 75 characters max", () => {
      const longTitle = "A".repeat(10) + " " + "B".repeat(10) + " " + "C".repeat(10) + " " +
        "D".repeat(10) + " " + "E".repeat(10) + " " + "F".repeat(10) + " " + "G".repeat(10) + " " + "H".repeat(10);
      const result = generateBaseSlug(longTitle);
      expect(result.length).toBeLessThanOrEqual(75);
    });

    it("should not cut in the middle of a word when truncating", () => {
      const longTitle = "longword ".repeat(15);
      const result = generateBaseSlug(longTitle);
      expect(result).not.toMatch(/-$/);
      expect(result.length).toBeLessThanOrEqual(75);
    });

    it("should return 'untitled' for empty input", () => {
      expect(generateBaseSlug("")).toBe("untitled");
    });

    it("should fall back to all words when input is only stop words", () => {
      expect(generateBaseSlug("the a an is of")).toBe("the-a-an-is-of");
    });

    it("should handle numeric titles", () => {
      expect(generateBaseSlug("Top 10 Games")).toBe("top-10-games");
    });

    it("should remove stop words: the, a, an, is, of, in, on, at, to", () => {
      expect(generateBaseSlug("The Game of the Year is Here")).toBe("game-year-here");
      expect(generateBaseSlug("A Guide to an Amazing Mod")).toBe("guide-amazing-mod");
      expect(generateBaseSlug("Updates in the World of Gaming on PC at E3")).toBe("updates-world-gaming-pc-e3");
    });
  });
});
