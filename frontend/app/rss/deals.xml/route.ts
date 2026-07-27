import { NextResponse } from "next/server";
import { fetchPosts } from "@/lib/api";
import { buildRssFeed, RSS_HEADERS } from "@/lib/rss";
import { SITE_NAME } from "@/lib/constants";
import type { Article } from "@/types";

export async function GET() {
  const res = await fetchPosts({ contentType: "DEAL", limit: 20, revalidate: 300 });
  const articles: Article[] = res.data ?? [];

  const xml = buildRssFeed(articles, {
    title: `${SITE_NAME} — Deals`,
    description: "The latest game deals from TheCoreGamer.",
    selfPath: "/rss/deals.xml",
  });

  return new NextResponse(xml, { headers: RSS_HEADERS });
}
