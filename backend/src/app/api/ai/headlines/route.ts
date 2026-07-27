import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/requireRole";
import { rateLimitUser } from "@/middleware/rateLimit";
import { validateBody } from "@/middleware/validateBody";
import { csrfProtection } from "@/middleware/csrfProtection";
import { aiHeadlinesSchema } from "@/validators";
import { anthropic, AI_MODEL, AI_SYSTEM_PROMPT, extractJsonArray } from "@/lib/anthropic";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function POST(request: NextRequest) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const { session, error: authError } = await requireAuth(request);
    if (authError) return authError;

    const rateLimitResponse = await rateLimitUser(session!.user.id, "AI_STANDARD");
    if (rateLimitResponse) return rateLimitResponse;

    const { data, error } = await validateBody(request, aiHeadlinesSchema);
    if (error) return error;

    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      system: AI_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate 5 punchy headline options for a gaming article based on the content below. Each headline must be at most 80 characters, written in a direct, engaging gaming-journalism style. Avoid clickbait. Respond with ONLY a JSON array of 5 strings, no other text.\n\nArticle content:\n${data.content}`,
        },
      ],
    });

    const block = message.content.find((b) => b.type === "text");
    const text = block && block.type === "text" ? block.text : "";
    const headlines = extractJsonArray(text)
      .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
      .map((h) => h.slice(0, 80))
      .slice(0, 5);

    if (headlines.length === 0) {
      return NextResponse.json(errorResponse("Failed to generate headlines"), { status: 502 });
    }

    return NextResponse.json(successResponse({ headlines }));
  } catch (err) {
    captureError(err, { route: "POST /api/ai/headlines" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
