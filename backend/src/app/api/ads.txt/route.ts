import { NextResponse } from "next/server";

export async function GET() {
  const publisherId = process.env.GOOGLE_ADSENSE_PUBLISHER_ID || "pub-xxxxxxxxxxxxxxxx";
  const adsTxt = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0`;

  return new NextResponse(adsTxt, {
    headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=86400" },
  });
}
