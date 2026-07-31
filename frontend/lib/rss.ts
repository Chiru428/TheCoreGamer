import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";
import type { Article } from "@/types";

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function articleUrl(article: Article): string {
  const base =
    article.contentType === "REVIEW"
      ? "/reviews"
      : article.contentType === "GUIDE"
      ? "/guides"
      : "/articles";
  return `${SITE_URL}${base}/${article.slug}`;
}

export function contentTypeLabel(ct: string): string {
  const map: Record<string, string> = {
    NEWS: "News",
    REVIEW: "Review",
    GUIDE: "Guide",
    OPINION: "Opinion",
    DEAL: "Deal",
    FEATURE: "Feature",
    LISTICLE: "List",
  };
  return map[ct] ?? ct;
}

export function toRfc822(date: string | null | undefined): string {
  if (!date) return new Date().toUTCString();
  return new Date(date).toUTCString();
}

interface RssFeedOptions {
  title?: string;
  description?: string;
  /** Path of this feed relative to SITE_URL, e.g. "/rss.xml" or "/rss/news.xml" */
  selfPath: string;
}

export function buildRssFeed(articles: Article[], options: RssFeedOptions): string {
  const title = options.title ?? SITE_NAME;
  const description = options.description ?? SITE_DESCRIPTION;
  const logoUrl = `${SITE_URL}/icon-192.png`;

  const lastBuildDate = articles[0]?.publishedAt
    ? toRfc822(articles[0].publishedAt)
    : new Date().toUTCString();

  const items = articles
    .map((article) => {
      const link = articleUrl(article);
      const itemDescription = article.excerpt
        ? article.excerpt
        : `${article.title} — read more on ${SITE_NAME}`;
      const author = article.author?.displayName ?? SITE_NAME;
      const pubDate = toRfc822(article.publishedAt);
      const category = contentTypeLabel(article.contentType);
      const enclosure = article.featuredImageUrl
        ? `\n      <enclosure url="${escapeXml(article.featuredImageUrl)}" type="image/jpeg" length="0" />`
        : "";

      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(link)}</link>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(author)}</author>
      <description>${escapeXml(itemDescription.slice(0, 160))}</description>
      <category>${escapeXml(category)}</category>
      <guid isPermaLink="true">${escapeXml(link)}</guid>${enclosure}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(description)}</description>
    <language>en-US</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(SITE_URL)}${options.selfPath}" rel="self" type="application/rss+xml" />
    <image>
      <url>${escapeXml(logoUrl)}</url>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(SITE_URL)}</link>
    </image>
${items}
  </channel>
</rss>`;
}

export const RSS_HEADERS = {
  "Content-Type": "application/rss+xml; charset=utf-8",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
};
