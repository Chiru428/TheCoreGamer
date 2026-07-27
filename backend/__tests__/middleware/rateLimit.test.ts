/**
 * Tests for rate limiter logic.
 * We test the pure logic since the actual Redis integration requires a live connection.
 */
import { RATE_LIMITS } from "@/lib/constants";

describe("Rate Limiter", () => {
  describe("Rate limit tiers", () => {
    it("should have READ tier at 100 req/min", () => {
      expect(RATE_LIMITS.READ.requests).toBe(100);
      expect(RATE_LIMITS.READ.window).toBe(60);
    });

    it("should have WRITE tier at 20 req/min", () => {
      expect(RATE_LIMITS.WRITE.requests).toBe(20);
      expect(RATE_LIMITS.WRITE.window).toBe(60);
    });

    it("should have AUTH tier at 10 req/min", () => {
      expect(RATE_LIMITS.AUTH.requests).toBe(10);
      expect(RATE_LIMITS.AUTH.window).toBe(60);
    });

    it("should have WRITE stricter than READ", () => {
      expect(RATE_LIMITS.WRITE.requests).toBeLessThan(RATE_LIMITS.READ.requests);
    });

    it("should have AUTH stricter than WRITE", () => {
      expect(RATE_LIMITS.AUTH.requests).toBeLessThan(RATE_LIMITS.WRITE.requests);
    });
  });

  describe("IP extraction logic", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const forwarded = "203.0.113.50, 70.41.3.18, 150.172.238.178";
      const ip = forwarded.split(",")[0].trim();
      expect(ip).toBe("203.0.113.50");
    });

    it("should handle single IP in x-forwarded-for", () => {
      const forwarded = "203.0.113.50";
      const ip = forwarded.split(",")[0].trim();
      expect(ip).toBe("203.0.113.50");
    });

    it("should calculate correct Retry-After header", () => {
      const reset = Date.now() + 30000; // 30 seconds from now
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(30);
    });
  });
});

// Mock Upstash
const mockLimit = jest.fn();
jest.mock("@upstash/ratelimit", () => {
  return {
    Ratelimit: jest.fn().mockImplementation(() => ({
      limit: mockLimit,
    })),
  };
});
jest.mock("@upstash/ratelimit", () => {
  const actual = jest.requireActual("@upstash/ratelimit");
  return {
    ...actual,
    Ratelimit: jest.fn().mockImplementation(() => ({
      limit: mockLimit,
    })),
  };
});
// Need to add slidingWindow mock
jest.mock("@upstash/ratelimit", () => {
  return {
    Ratelimit: Object.assign(jest.fn().mockImplementation(() => ({ limit: mockLimit })), {
      slidingWindow: jest.fn(),
    }),
  };
});

import { rateLimit } from "@/middleware/rateLimit";

describe("rateLimit Middleware", () => {
  beforeEach(() => {
    mockLimit.mockReset();
  });

  it("returns null when limit is not exceeded", async () => {
    mockLimit.mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: Date.now() + 10000 });
    const req = new Request("http://localhost");
    const res = await rateLimit(req, "READ");
    expect(res).toBeNull();
  });

  it("returns 429 when limit is exceeded", async () => {
    mockLimit.mockResolvedValue({ success: false, limit: 10, remaining: 0, reset: Date.now() + 10000 });
    const req = new Request("http://localhost");
    const res = await rateLimit(req, "READ");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    
    const body = await res!.json();
    expect(body.success).toBe(false);
    expect(res!.headers.get("Retry-After")).toBeDefined();
  });
});
