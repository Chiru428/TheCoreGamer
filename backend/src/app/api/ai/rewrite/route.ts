import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/requireRole";
import { rateLimitUser } from "@/middleware/rateLimit";
import { validateBody } from "@/middleware/validateBody";
import { csrfProtection } from "@/middleware/csrfProtection";
import { aiRewriteSchema } from "@/validators";
import { anthropic, AI_MODEL, AI_SYSTEM_PROMPT } from "@/lib/anthropic";
import { captureError } from "@/lib/sentry";
import { errorResponse } from "@/types";

export async function POST(request: NextRequest) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;

  try {
    const { session, error: authError } = await requireAuth(request);
    if (authError) return authError;

    const rateLimitResponse = await rateLimitUser(session!.user.id, "AI_REWRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { data, error } = await validateBody(request, aiRewriteSchema);
    if (error) return error;

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const messageStream = anthropic.messages.stream({
            model: AI_MODEL,
            max_tokens: 1024,
            system: AI_SYSTEM_PROMPT,
            messages: [
              {
                role: "user",
                content: `Rewrite the following excerpt from a gaming article in 3 distinct ways, keeping the meaning intact but varying tone/phrasing. Separate the 3 options with the exact delimiter "---OPTION---" on its own line, with no numbering, labels, or other commentary.\n\nText:\n${data.text}`,
              },
            ],
          });

          for await (const event of messageStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          captureError(err, { route: "POST /api/ai/rewrite (stream)" });
          controller.error(err);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    captureError(err, { route: "POST /api/ai/rewrite" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
