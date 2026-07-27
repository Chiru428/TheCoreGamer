import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireRole";
import { rateLimitUser } from "@/middleware/rateLimit";
import { validateBody } from "@/middleware/validateBody";
import { csrfProtection } from "@/middleware/csrfProtection";
import { aiTagsSchema } from "@/validators";
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

    const { data, error } = await validateBody(request, aiTagsSchema);
    if (error) return error;

    const allTags = await prisma.tag.findMany({ select: { id: true, name: true } });
    const availableTags = allTags.filter((t) => !data.existingTagIds.includes(t.id));

    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      system: AI_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Given the gaming article content below and this list of existing tags: ${JSON.stringify(
            availableTags.map((t) => t.name)
          )}\n\n1. Pick up to 5 tags from that list that are clearly relevant to the article.\n2. Suggest up to 3 new tag names (not in that list) that would also be relevant.\n\nRespond with ONLY a JSON object in the form {"existingTags": ["..."], "newTags": ["..."]}, no other text.\n\nArticle content:\n${data.content}`,
        },
      ],
    });

    const block = message.content.find((b) => b.type === "text");
    const text = block && block.type === "text" ? block.text : "";
    const obj = extractJsonObject(text);

    const existingTagNames = Array.isArray(obj?.existingTags)
      ? obj!.existingTags.filter((n): n is string => typeof n === "string")
      : [];
    const newTagNames = Array.isArray(obj?.newTags)
      ? obj!.newTags.filter((n): n is string => typeof n === "string")
      : [];

    const suggestedTagIds = availableTags
      .filter((t) => existingTagNames.some((n) => n.toLowerCase() === t.name.toLowerCase()))
      .map((t) => t.id);

    const suggestedNewTags = newTagNames
      .filter((n) => !allTags.some((t) => t.name.toLowerCase() === n.toLowerCase()))
      .slice(0, 3);

    return NextResponse.json(successResponse({ suggestedTagIds, suggestedNewTags }));
  } catch (err) {
    captureError(err, { route: "POST /api/ai/tags" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
