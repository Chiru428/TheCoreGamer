import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Google News Sitemap — /news-sitemap.xml
 *
 * Spec: https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
 *
 * Covers NEWS articles published within the last 48 hours.
 * Google News only indexes articles published within the past 2 days.
 *
 * Path mapping MUST stay in sync with:
 *   backend/src/app/api/sitemap.xml/route.ts → contentTypePath()
 *   frontend/lib/seo.ts → contentTypePath()
 */

import { contentTypePath } from "@/lib/seoPaths";

/** XML-escape the five special characters. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";

  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 48);

  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      contentType: "NEWS",
      publishedAt: { gte: cutoff },
    },
    select: { slug: true, title: true, publishedAt: true, contentType: true },
    orderBy: { publishedAt: "desc" },
  });

  const urls = articles.map((a) => {
    const path = contentTypePath(a.contentType);
    const loc = `${siteUrl}/${path}/${a.slug}`;
    const pubDate = (a.publishedAt ?? new Date()).toISOString();
    const title = escapeXml(a.title);

    return `  <url>
    <loc>${loc}</loc>
    <news:news>
      <news:publication>
        <news:name>TheCoreGamer</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>
  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls.join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=600",
    },
  });
}
