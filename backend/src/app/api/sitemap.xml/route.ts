import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { contentTypePath } from "@/lib/seoPaths";

// Force dynamic so Next.js never attempts to prerender this at build time
// (Prisma requires DATABASE_URL which is only available at runtime).
export const dynamic = "force-dynamic";

export async function GET() {
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";

  try {
    const [articles, games] = await Promise.all([
      prisma.article.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true, contentType: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.game.findMany({ select: { slug: true, updatedAt: true } }),
    ]);

    const urls = [
      `<url><loc>${siteUrl}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      ...articles.map((a) => {
        const path = contentTypePath(a.contentType);
        return `<url><loc>${siteUrl}/${path}/${a.slug}</loc><lastmod>${a.updatedAt.toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
      }),
      ...games.map(
        (g) =>
          `<url><loc>${siteUrl}/games/${g.slug}</loc><lastmod>${g.updatedAt.toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`
      ),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch {
    // Return empty sitemap if DB is unavailable
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${siteUrl}</loc></url>
</urlset>`;
    return new NextResponse(xml, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}
