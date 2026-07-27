import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/requireRole";
import { rateLimitUser } from "@/middleware/rateLimit";
import { validateBody } from "@/middleware/validateBody";
import { csrfProtection } from "@/middleware/csrfProtection";
import { aiExcerptSchema } from "@/validators";
import { anthropic, AI_MODEL, AI_SYSTEM_PROMPT, extractJsonObject } from "@/lib/anthropic";
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

    const { data, error } = await validateBody(request, aiExcerptSchema);
    if (error) return error;

    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 256,
      system: AI_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Write a factual, non-clickbait excerpt summarizing the gaming article below. Maximum 200 characters. Respond with ONLY a JSON object in the form {"excerpt": "..."}, no other text.\n\nArticle content:\n${data.content}`,
        },
      ],
    });

    const block = message.content.find((b) => b.type === "text");
    const text = block && block.type === "text" ? block.text : "";
    const obj = extractJsonObject(text);
    const excerpt = typeof obj?.excerpt === "string" ? obj.excerpt.trim().slice(0, 200) : "";

    if (!excerpt) {
      return NextResponse.json(errorResponse("Failed to generate excerpt"), { status: 502 });
    }

    return NextResponse.json(successResponse({ excerpt }));
  } catch (err) {
    captureError(err, { route: "POST /api/ai/excerpt" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
