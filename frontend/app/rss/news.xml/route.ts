import { NextResponse } from "next/server";
import { fetchPosts } from "@/lib/api";
import { buildRssFeed, RSS_HEADERS } from "@/lib/rss";
import { SITE_NAME } from "@/lib/constants";
import type { Article } from "@/types";

export async function GET() {
  const res = await fetchPosts({ contentType: "NEWS", limit: 20, revalidate: 300 });
  const articles: Article[] = res.data ?? [];

  const xml = buildRssFeed(articles, {
    title: `${SITE_NAME} — News`,
    description: "The latest gaming news from TheCoreGamer.",
    selfPath: "/rss/news.xml",
  });

  return new NextResponse(xml, { headers: RSS_HEADERS });
}
