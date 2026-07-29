import crypto from "crypto";
import { prisma } from "./prisma";
import type { UserDevice } from "@/generated/prisma";

/**
 * Anonymize an IP address for storage: /24 for IPv4, /48 for IPv6.
 */
export function anonymizeIp(ip: string): string {
  const trimmed = ip.trim();

  if (trimmed.includes(":")) {
    // IPv6 — expand the "::" shorthand so groups after it aren't silently
    // dropped, then keep the first 3 groups (/48 prefix).
    let groups: string[];
    if (trimmed.includes("::")) {
      const [left, right] = trimmed.split("::");
      const leftGroups = left ? left.split(":") : [];
      const rightGroups = right ? right.split(":") : [];
      const zerosNeeded = Math.max(0, 8 - leftGroups.length - rightGroups.length);
      groups = [...leftGroups, ...Array(zerosNeeded).fill("0"), ...rightGroups];
    } else {
      groups = trimmed.split(":");
    }
    const first3 = groups.slice(0, 3);
    while (first3.length < 3) first3.push("0");
    return `${first3.join(":")}::/48`;
  }

  // IPv4 — zero out the last octet (/24 prefix)
  const octets = trimmed.split(".");
  if (octets.length !== 4) return trimmed;
  return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
}

/**
 * Stable hash identifying a "device" from its user agent only.
 *
 * Deliberately excludes IP: dynamic IPs, VPN toggles, and network switches
 * would otherwise create a new device record on every login from the same
 * physical device, leading to dozens of duplicate entries.
 */
export function hashDevice(userAgent: string): string {
  return crypto.createHash("sha256").update(userAgent).digest("hex");
}

/**
 * Very small user-agent parser — good enough for "wasn't you?" alert emails
 * and the sessions list. Not meant to be exhaustive.
 */
export function parseUserAgent(userAgent: string): { browser: string; os: string; deviceType: "mobile" | "tablet" | "desktop"; browserVersion?: string } {
  const ua = userAgent || "";

  let browser = "Unknown browser";
  let browserVersion: string | undefined;

  const getMatch = (regex: RegExp) => {
    const match = ua.match(regex);
    return match ? match[1] : undefined;
  };

  if (/Edg\//.test(ua)) { browser = "Edge"; browserVersion = getMatch(/Edg\/([\d.]+)/); }
  else if (/OPR\//.test(ua)) { browser = "Opera"; browserVersion = getMatch(/OPR\/([\d.]+)/); }
  else if (/Chrome\//.test(ua)) { browser = "Chrome"; browserVersion = getMatch(/Chrome\/([\d.]+)/); }
  else if (/Firefox\//.test(ua)) { browser = "Firefox"; browserVersion = getMatch(/Firefox\/([\d.]+)/); }
  else if (/Safari\//.test(ua)) { browser = "Safari"; browserVersion = getMatch(/Version\/([\d.]+)/); }

  let os = "Unknown OS";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/iPhone|iPad|iPod|iOS/.test(ua)) os = "iOS";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Linux/.test(ua)) os = "Linux";

  let deviceType: "mobile" | "tablet" | "desktop" = "desktop";
  if (/iPad/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) deviceType = "tablet";
  else if (/iPhone|iPod|Mobile/.test(ua)) deviceType = "mobile";

  return { browser, os, deviceType, browserVersion };
}

/**
 * Record (or refresh) the device a user just logged in from.
 *
 * isNewDevice is true only when this is a brand-new device AND the user
 * already has at least one other device that's been around for >5 minutes —
 * this avoids sending a "new device" alert for someone's very first login.
 */
export async function recordLoginDevice(
  userId: string,
  req: Request
): Promise<{ device: UserDevice; isNewDevice: boolean }> {
  const userAgent = req.headers.get("user-agent") || "unknown";

  // Hash by user agent only — IP is intentionally excluded so that network
  // changes (dynamic IP, VPN, switching WiFi ↔ mobile data) don't create
  // duplicate device records for the same physical browser.
  const deviceHash = hashDevice(userAgent);

  // For GeoIP we need the real client IP.
  // On Vercel, the FIRST entry of x-forwarded-for is the original client IP
  // (set by Vercel's edge before it appends its own IPs). The last entry
  // is Vercel's own US-based server, which is why location was showing
  // "United States" for all users regardless of their actual location.
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const realClientIp = xForwardedFor
    ? xForwardedFor.split(",")[0].trim()   // first = real client
    : (req.headers.get("x-real-ip") ?? "127.0.0.1");

  const anonymizedIp = anonymizeIp(realClientIp);

  const existing = await prisma.userDevice.findUnique({
    where: { userId_deviceHash: { userId, deviceHash } },
  });

  let location: string | undefined = undefined;
  if (!existing) {
    try {
      const res = await fetch(`http://ip-api.com/json/${realClientIp}?fields=country`);
      if (res.ok) {
        const data = await res.json();
        if (data.country) {
          location = data.country;
        }
      }
    } catch (e) {
      // Ignore network errors for geoip
    }
  }

  const device = await prisma.userDevice.upsert({
    where: { userId_deviceHash: { userId, deviceHash } },
    update: { lastSeenAt: new Date(), revokedAt: null },
    create: { userId, deviceHash, userAgent, ipAddress: anonymizedIp, location },
  });

  let isNewDevice = false;
  if (!existing) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const olderDevice = await prisma.userDevice.findFirst({
      where: { userId, id: { not: device.id }, createdAt: { lt: fiveMinutesAgo } },
    });
    isNewDevice = !!olderDevice;
  }

  return { device, isNewDevice };
}
