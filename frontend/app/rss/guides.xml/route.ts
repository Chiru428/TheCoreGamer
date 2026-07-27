import { NextResponse } from "next/server";
import { fetchPosts } from "@/lib/api";
import { buildRssFeed, RSS_HEADERS } from "@/lib/rss";
import { SITE_NAME } from "@/lib/constants";
import type { Article } from "@/types";

export async function GET() {
  const [modGuides, walkthroughs] = await Promise.all([
    fetchPosts({ contentType: "MOD_GUIDE", limit: 20, revalidate: 300 }),
    fetchPosts({ contentType: "WALKTHROUGH", limit: 20, revalidate: 300 }),
  ]);

  const articles: Article[] = [...(modGuides.data ?? []), ...(walkthroughs.data ?? [])]
    .sort((a, b) => new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime())
    .slice(0, 20);

  const xml = buildRssFeed(articles, {
    title: `${SITE_NAME} — Guides`,
    description: "The latest mod guides and walkthroughs from TheCoreGamer.",
    selfPath: "/rss/guides.xml",
  });

  return new NextResponse(xml, { headers: RSS_HEADERS });
}
