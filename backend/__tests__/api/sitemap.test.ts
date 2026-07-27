/**
 * Tests for sitemap.xml and news-sitemap.xml routes.
 */

const mockFindMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    article: { findMany: (...args: unknown[]) => mockFindMany(...args) },
    game: { findMany: jest.fn().mockResolvedValue([]) },
    tag: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

import { GET as getSitemap } from "@/app/api/sitemap.xml/route";
import { GET as getNewsSitemap } from "@/app/api/news-sitemap.xml/route";

const mockArticles = [
  { slug: "review-1", title: "Game Review", publishedAt: new Date("2026-06-11T12:00:00Z"), updatedAt: new Date("2026-06-11T12:00:00Z"), contentType: "REVIEW" },
  { slug: "news-1", title: "Game News", publishedAt: new Date("2026-06-11T10:00:00Z"), updatedAt: new Date("2026-06-11T10:00:00Z"), contentType: "NEWS" },
  { slug: "guide-1", title: "Game Guide", publishedAt: new Date("2026-06-10T10:00:00Z"), updatedAt: new Date("2026-06-10T10:00:00Z"), contentType: "MOD_GUIDE" },
];

describe("Sitemaps", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/sitemap.xml", () => {
    it("returns valid XML with correct path mapping", async () => {
      mockFindMany.mockResolvedValue(mockArticles);
      
      const res = await getSitemap();
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/xml");
      
      const xml = await res.text();
      // Basic XML check
      expect(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")).toBe(true);
      expect(xml).toContain("<urlset");
      
      // Path mapping checks
      expect(xml).toContain("<loc>http://localhost:3000/reviews/review-1</loc>");
      expect(xml).toContain("<loc>http://localhost:3000/articles/news-1</loc>");
      expect(xml).toContain("<loc>http://localhost:3000/mod-guides/guide-1</loc>");
    });
  });

  describe("GET /api/news-sitemap.xml", () => {
    it("returns valid News Sitemap XML", async () => {
      mockFindMany.mockResolvedValue([mockArticles[1]]); // only news
      
      const res = await getNewsSitemap();
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/xml");
      
      const xml = await res.text();
      expect(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")).toBe(true);
      expect(xml).toContain("<news:news>");
      expect(xml).toContain("<news:name>TheCoreGamer</news:name>");
      expect(xml).toContain("<news:title>Game News</news:title>");
      expect(xml).toContain("<loc>http://localhost:3000/articles/news-1</loc>");
    });

    it("filters articles published within the last 48 hours", async () => {
      mockFindMany.mockResolvedValue([]);
      
      const before = new Date();
      before.setHours(before.getHours() - 48);
      
      await getNewsSitemap();
      
      const findArgs = mockFindMany.mock.calls[0][0];
      const gte = findArgs.where.publishedAt.gte as Date;
      
      expect(gte.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000); // 1s tolerance
      expect(findArgs.where.contentType).toEqual({ in: ["NEWS", "FEATURE"] });
    });
  });
});
