import { NextResponse } from "next/server";

/**
 * Serves /ads.txt from the apex domain. AdSense crawlers only honor ads.txt
 * when it's reachable at https://<root-domain>/ads.txt — a copy on the
 * backend/API subdomain (backend/src/app/api/ads.txt) is not sufficient.
 */
export async function GET() {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID || "";
  const publisherId = adsenseId.replace(/^ca-/, "") || "pub-xxxxxxxxxxxxxxxx";
  const adsTxt = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0`;

  return new NextResponse(adsTxt, {
    headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=86400" },
  });
}
