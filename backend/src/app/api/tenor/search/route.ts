import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

const GIPHY_SEARCH_URL = "https://api.giphy.com/v1/gifs/search";
const GIPHY_TRENDING_URL = "https://api.giphy.com/v1/gifs/trending";

interface GiphyImage {
  url: string;
  webp?: string;
}

interface GiphyResult {
  id: string;
  title: string;
  images: {
    original: GiphyImage;
    fixed_height_small: GiphyImage;
    fixed_height: GiphyImage;
  };
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "TENOR");
    if (rateLimitResponse) return rateLimitResponse;

    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey) {
      // Graceful degradation: GIF feature disabled when key not configured
      return NextResponse.json(successResponse({ results: [] }));
    }

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim();
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

    let apiUrl: URL;
    if (!q) {
      // No query → return trending GIFs (better UX than empty state)
      apiUrl = new URL(GIPHY_TRENDING_URL);
      apiUrl.searchParams.set("api_key", apiKey);
      apiUrl.searchParams.set("limit", String(limit));
      apiUrl.searchParams.set("rating", "g"); // safe content only
    } else {
      apiUrl = new URL(GIPHY_SEARCH_URL);
      apiUrl.searchParams.set("api_key", apiKey);
      apiUrl.searchParams.set("q", q);
      apiUrl.searchParams.set("limit", String(limit));
      apiUrl.searchParams.set("rating", "g"); // safe content only
      apiUrl.searchParams.set("lang", "en");
    }

    const res = await fetch(apiUrl.toString());
    if (!res.ok) {
      return NextResponse.json(errorResponse("GIF search failed"), { status: 502 });
    }

    const json = await res.json();

    const results = ((json.data as GiphyResult[]) || []).map((r) => ({
      id: r.id,
      // Prefer WebP for smaller payload; fall back to gif URL
      url: r.images?.original?.webp || r.images?.original?.url || "",
      previewUrl:
        r.images?.fixed_height_small?.webp ||
        r.images?.fixed_height_small?.url ||
        r.images?.fixed_height?.webp ||
        r.images?.fixed_height?.url ||
        r.images?.original?.url ||
        "",
      title: r.title || "",
    }));

    return NextResponse.json(successResponse({ results }));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
