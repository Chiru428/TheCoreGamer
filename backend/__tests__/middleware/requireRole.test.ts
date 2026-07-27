/**
 * Tests for requireRole middleware.
 * We mock the auth() function to simulate different session states.
 */

// Mock auth
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { requireRole } from "@/middleware/requireRole";

describe("requireRole Middleware", () => {
  afterEach(() => {
    mockAuth.mockReset();
  });

  it("should return 401 when no session exists", async () => {
    mockAuth.mockResolvedValue(null);
    const response = await requireRole(["ADMIN"]);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
    const body = await response!.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Unauthorized");
  });

  it("should return 403 when user has wrong role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "user@test.com", role: "USER", username: "testuser" },
    });
    const response = await requireRole(["ADMIN", "EDITOR"]);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(403);
    const body = await response!.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Forbidden");
  });

  it("should return null when user has correct role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "admin@test.com", role: "ADMIN", username: "admin" },
    });
    const response = await requireRole(["ADMIN"]);
    expect(response).toBeNull();
  });

  it("should accept any of multiple allowed roles", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "editor@test.com", role: "EDITOR", username: "editor" },
    });
    const response = await requireRole(["ADMIN", "EDITOR"]);
    expect(response).toBeNull();
  });

  it("should reject VISITOR role for protected routes", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", email: "visitor@test.com", role: "VISITOR", username: "visitor" },
    });
    const response = await requireRole(["AUTHOR", "EDITOR", "ADMIN"]);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(403);
  });
});
