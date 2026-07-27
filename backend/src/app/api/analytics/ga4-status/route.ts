import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/middleware/requireRole";
import { successResponse } from "@/types";
import crypto from "crypto";

async function testGA4Connection() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const propertyIdRaw = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

  if (!raw || !propertyIdRaw) {
    return { configured: false, step: "env-missing", message: "GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_ANALYTICS_PROPERTY_ID not set in .env" };
  }

  // Strip surrounding single/double quotes (common .env issue)
  const cleaned = raw.replace(/^(['"])([\s\S]*)\1$/, "$2");

  let key: any;
  try {
    key = JSON.parse(cleaned);
  } catch {
    return {
      configured: true,
      step: "parse-error",
      message: "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. Check the .env value (no surrounding quotes needed).",
      raw_starts_with: raw.slice(0, 20),
    };
  }

  if (!key.client_email || !key.private_key) {
    return { configured: true, step: "key-fields-missing", message: "JSON parsed but missing client_email or private_key fields." };
  }

  // Try to get an OAuth token
  let token: string;
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = base64url(JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }));
    const signer = crypto.createSign("RSA-SHA256");
    signer.write(`${header}.${payload}`);
    signer.end();
    const sig = base64url(signer.sign(key.private_key));
    const jwt = `${header}.${payload}.${sig}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return {
        configured: true,
        step: "auth-error",
        message: `OAuth token request failed: ${tokenData.error_description || tokenData.error}`,
        service_account: key.client_email,
        hint: "This usually means the private key is malformed or the service account no longer exists.",
      };
    }
    token = tokenData.access_token;
  } catch (err: any) {
    return {
      configured: true,
      step: "auth-exception",
      message: `Exception while getting OAuth token: ${err?.message}`,
      service_account: key.client_email,
    };
  }

  // Try calling the GA4 Data API
  const propertyId = propertyIdRaw.replace("properties/", "");
  const apiRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "screenPageViews" }],
      }),
    }
  );
  const apiData = await apiRes.json();

  if (apiData.error) {
    const code = apiData.error.code;
    let hint = "";
    if (code === 403) {
      hint = `The service account "${key.client_email}" does not have access to GA4 property ${propertyIdRaw}. Fix: GA4 Admin → Property Access Management → Add "${key.client_email}" with Viewer role.`;
    } else if (code === 404) {
      hint = `Property ${propertyIdRaw} not found. Verify the property ID in GA4 Admin → Property Settings.`;
    } else if (code === 401) {
      hint = "Authentication failed — the token was obtained but GA4 rejected it. Try re-downloading the service account key.";
    }
    return {
      configured: true,
      step: "api-error",
      message: `GA4 Data API returned error ${code}: ${apiData.error.message}`,
      service_account: key.client_email,
      property: propertyIdRaw,
      hint,
    };
  }

  const rowCount = (apiData.rows || []).length;
  return {
    configured: true,
    step: "success",
    message: rowCount > 0
      ? `GA4 is working. ${rowCount} data point(s) returned for the last 7 days.`
      : "GA4 connected successfully, but no pageview data yet. This is normal for a new property — data appears after users visit the site and GA4 processes it (up to 48h delay).",
    service_account: key.client_email,
    property: propertyIdRaw,
    row_count: rowCount,
  };
}

function base64url(s: string | Buffer): string {
  const buf = Buffer.isBuffer(s) ? s : Buffer.from(s);
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export async function GET(request: NextRequest) {
  const roleCheck = await requireRole(["ADMIN"], request);
  if (roleCheck) return roleCheck;
  const result = await testGA4Connection();
  return NextResponse.json(successResponse(result));
}
