import { NextResponse } from "next/server";
import { fetchPosts } from "@/lib/api";
import { buildRssFeed, RSS_HEADERS } from "@/lib/rss";
import type { Article } from "@/types";

export async function GET() {
  const res = await fetchPosts({ limit: 50, revalidate: 300 });
  const articles: Article[] = res.data ?? [];

  const xml = buildRssFeed(articles, { selfPath: "/rss.xml" });

  return new NextResponse(xml, { headers: RSS_HEADERS });
}
