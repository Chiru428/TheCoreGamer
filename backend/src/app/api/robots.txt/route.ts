import { NextResponse } from "next/server";

export async function GET() {
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/*
Disallow: /api/*
Disallow: /auth/*

Sitemap: ${siteUrl}/sitemap.xml
Sitemap: ${siteUrl}/news-sitemap.xml`;

  return new NextResponse(robotsTxt, {
    headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=86400" },
  });
}
