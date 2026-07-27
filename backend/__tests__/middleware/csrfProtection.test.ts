describe("csrfProtection Middleware", () => {
  const originalEnv = process.env;
  let csrfProtection: any;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      FRONTEND_URL: "https://thecoregamer.com",
      NEXT_PUBLIC_SITE_URL: "https://thecoregamer.com",
      NODE_ENV: "development",
      CSRF_STRICT: "false",
    };
    csrfProtection = require("@/middleware/csrfProtection").csrfProtection;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function makeReq(method: string, headers: Record<string, string> = {}) {
    const reqHeaders = new Headers();
    for (const [k, v] of Object.entries(headers)) {
      reqHeaders.set(k, v);
    }
    return new Request("http://localhost/api/test", { method, headers: reqHeaders });
  }

  it("returns null for non-mutating methods", () => {
    expect(csrfProtection(makeReq("GET", { origin: "evil.com" }))).toBeNull();
    expect(csrfProtection(makeReq("OPTIONS", { origin: "evil.com" }))).toBeNull();
  });

  it("returns null when origin is allowed", () => {
    expect(csrfProtection(makeReq("POST", { origin: "https://thecoregamer.com" }))).toBeNull();
    expect(csrfProtection(makeReq("PUT", { referer: "http://localhost:3000/page" }))).toBeNull();
  });

  it("returns 403 when origin is not allowed", () => {
    const res = csrfProtection(makeReq("POST", { origin: "https://evil.com" }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("returns null when origin/referer missing in development and not strict", () => {
    (process.env as any).NODE_ENV = "development";
    process.env.CSRF_STRICT = "false";
    expect(csrfProtection(makeReq("POST"))).toBeNull();
  });

  it("returns 403 when origin/referer missing in production", () => {
    (process.env as any).NODE_ENV = "production";
    const res = csrfProtection(makeReq("POST"));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("returns 403 when origin/referer missing in development if CSRF_STRICT=true", () => {
    (process.env as any).NODE_ENV = "development";
    process.env.CSRF_STRICT = "true";
    const res = csrfProtection(makeReq("POST"));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });
});
