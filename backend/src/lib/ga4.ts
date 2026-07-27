import crypto from "crypto";
import { logger } from "@/lib/logger";

interface GA4OverviewResult {
  activeUsers: number;
  bounceRate: number;
  averageSessionDuration: number;
  pageViews: { date: string; views: number }[];
}

let cachedToken: string | null = null;
let cachedTokenExpiry = 0;

function base64url(stringOrBuffer: string | Buffer): string {
  const buf = Buffer.isBuffer(stringOrBuffer) ? stringOrBuffer : Buffer.from(stringOrBuffer);
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if it's still valid (with 60-second buffer)
  if (cachedToken && cachedTokenExpiry > now + 60) {
    return cachedToken;
  }

  const iat = now;
  const exp = now + 3600;

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: exp,
    iat: iat,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.write(signatureInput);
  signer.end();
  const signature = signer.sign(privateKey);
  const encodedSignature = base64url(signature);

  const jwt = `${signatureInput}.${encodedSignature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Google Auth OAuth error: ${data.error_description || data.error}`);
  }

  cachedToken = data.access_token;
  cachedTokenExpiry = exp;
  return data.access_token;
}

function parseServiceAccountKey(raw: string | undefined) {
  if (!raw) return null;
  // Strip surrounding single or double quotes that some .env editors add
  const cleaned = raw.replace(/^(['"])([\s\S]*)\1$/, "$2");
  return JSON.parse(cleaned);
}

export async function fetchGA4Overview(): Promise<GA4OverviewResult | null> {
  const serviceAccountKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const propertyIdRaw = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

  if (!serviceAccountKeyRaw || !propertyIdRaw) {
    return null;
  }

  try {
    const key = parseServiceAccountKey(serviceAccountKeyRaw);
    const token = await getAccessToken(key.client_email, key.private_key);
    const propertyId = propertyIdRaw.replace("properties/", "");

    // Call batchRunReports endpoint to get aggregates and daily data in one go
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            // Report 1: Exact 30-day totals/aggregates
            {
              dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
              metrics: [
                { name: "activeUsers" },
                { name: "bounceRate" },
                { name: "averageSessionDuration" },
              ],
            },
            // Report 2: Daily views for the chart
            {
              dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
              metrics: [{ name: "screenPageViews" }],
              dimensions: [{ name: "date" }],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    if (data.error) {
      logger.error({ error: data.error }, "GA4 Data API Error");
      return null;
    }

    const reports = data.reports || [];
    if (reports.length < 2) {
      return null;
    }

    const summaryReport = reports[0];
    const dailyReport = reports[1];

    const summaryRow = summaryReport.rows?.[0];
    if (!summaryRow) {
      return null; // No data exists at all
    }

    const activeUsers = parseInt(summaryRow.metricValues[0]?.value || "0", 10);
    const bounceRate = parseFloat(summaryRow.metricValues[1]?.value || "0");
    const averageSessionDuration = parseFloat(summaryRow.metricValues[2]?.value || "0");

    // If there is zero visitor activity, trigger DB fallback
    if (activeUsers === 0) {
      return null;
    }

    // Process daily page views
    const dailyRows = dailyReport.rows || [];
    const viewsByDate: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      viewsByDate[d.toISOString().slice(0, 10)] = 0;
    }

    for (const row of dailyRows) {
      const dateStr = row.dimensionValues?.[0]?.value; // Format: YYYYMMDD
      if (dateStr && dateStr.length === 8) {
        const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
        const views = parseInt(row.metricValues?.[0]?.value || "0", 10);
        if (formattedDate in viewsByDate) {
          viewsByDate[formattedDate] = views;
        }
      }
    }

    const pageViews = Object.entries(viewsByDate)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      activeUsers,
      bounceRate,
      averageSessionDuration,
      pageViews,
    };
  } catch (err) {
    logger.error({ err }, "Failed to fetch GA4 analytics overview");
    return null;
  }
}

interface GA4RealtimeResult {
  activeUsers: number;
  topPages: { path: string; activeUsers: number }[];
  trafficSources: { source: string; users: number }[];
}

export async function fetchGA4Realtime(): Promise<GA4RealtimeResult | null> {
  const serviceAccountKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const propertyIdRaw = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

  if (!serviceAccountKeyRaw || !propertyIdRaw) {
    return null;
  }

  try {
    const key = parseServiceAccountKey(serviceAccountKeyRaw);
    const token = await getAccessToken(key.client_email, key.private_key);
    const propertyId = propertyIdRaw.replace("properties/", "");

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // The Realtime API has no batch endpoint, so issue the reports separately.
    // "unifiedScreenName" / "sessionSource" are the realtime-report equivalents
    // of pagePath / trafficSource (those dimensions don't exist on this endpoint).
    const [totalsRes, pagesRes, sourcesRes] = await Promise.all([
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`, {
        method: "POST",
        headers,
        body: JSON.stringify({ metrics: [{ name: "activeUsers" }] }),
      }),
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
          dimensions: [{ name: "unifiedScreenName" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 10,
        }),
      }),
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          metrics: [{ name: "activeUsers" }],
          dimensions: [{ name: "sessionSource" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 10,
        }),
      }),
    ]);

    const [totalsData, pagesData, sourcesData] = await Promise.all([
      totalsRes.json(),
      pagesRes.json(),
      sourcesRes.json(),
    ]);

    if (totalsData.error || pagesData.error || sourcesData.error) {
      logger.error(
        { error: totalsData.error || pagesData.error || sourcesData.error },
        "GA4 Realtime API Error"
      );
      return null;
    }

    const activeUsers = parseInt(totalsData.rows?.[0]?.metricValues?.[0]?.value || "0", 10);

    const topPages = (pagesData.rows || []).map((row: any) => ({
      path: row.dimensionValues?.[0]?.value || "(unknown)",
      activeUsers: parseInt(row.metricValues?.[0]?.value || "0", 10),
    }));

    const trafficSources = (sourcesData.rows || []).map((row: any) => ({
      source: row.dimensionValues?.[0]?.value || "(direct)",
      users: parseInt(row.metricValues?.[0]?.value || "0", 10),
    }));

    return { activeUsers, topPages, trafficSources };
  } catch (err) {
    logger.error({ err }, "Failed to fetch GA4 realtime analytics");
    return null;
  }
}

export async function fetchGA4Traffic(range: string = "week", fromDate?: string, toDate?: string) {
  const serviceAccountKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const propertyIdRaw = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

  if (!serviceAccountKeyRaw || !propertyIdRaw) {
    return null;
  }

  try {
    const key = parseServiceAccountKey(serviceAccountKeyRaw);
    const token = await getAccessToken(key.client_email, key.private_key);
    const propertyId = propertyIdRaw.replace("properties/", "");

    let startDate = "7daysAgo";
    let endDate = "today";

    if (fromDate && toDate) {
      startDate = fromDate;
      endDate = toDate;
    } else {
      if (range === "day") startDate = "1daysAgo";
      if (range === "month") startDate = "30daysAgo";
    }

    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
          dimensions: [{ name: "date" }],
        }),
      }
    );

    const data = await response.json();
    if (data.error) {
      logger.error({ error: data.error }, "GA4 Data API Error in traffic");
      return null;
    }

    const rows = data.rows || [];
    const results = rows.map((row: any) => {
      const dateStr = row.dimensionValues?.[0]?.value || "";
      const formattedDate = dateStr.length === 8 
        ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
        : dateStr;
      
      return {
        date: formattedDate,
        pageViews: parseInt(row.metricValues?.[0]?.value || "0", 10),
        uniqueVisitors: parseInt(row.metricValues?.[1]?.value || "0", 10),
      };
    }).sort((a: any, b: any) => a.date.localeCompare(b.date));

    return results;
  } catch (err) {
    logger.error({ err }, "Failed to fetch GA4 analytics traffic");
    return null;
  }
}

