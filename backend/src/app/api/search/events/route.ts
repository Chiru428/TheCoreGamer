import { NextResponse } from "next/server";
import { rateLimit } from "@/middleware/rateLimit";
import { validateBody } from "@/middleware/validateBody";
import { csrfProtection } from "@/middleware/csrfProtection";
import { sendAlgoliaEventSchema } from "@/validators";
import { algoliaInsightsClient } from "@/lib/algolia";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import type { EventsItems } from "algoliasearch";

export async function POST(request: Request) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const { data, error } = await validateBody(request, sendAlgoliaEventSchema);
    if (error) return error;

    const base = {
      eventName: data.eventName,
      index: data.index,
      userToken: data.userToken,
      objectIDs: data.objectIDs,
      timestamp: Date.now(),
    };

    let event: EventsItems;
    if (data.eventType === "click" && data.queryID && data.positions) {
      event = { ...base, eventType: "click", queryID: data.queryID, positions: data.positions };
    } else if (data.eventType === "click") {
      event = { ...base, eventType: "click" };
    } else if (data.eventType === "view") {
      event = { ...base, eventType: "view" };
    } else {
      event = { ...base, eventType: "conversion" };
    }

    await algoliaInsightsClient.pushEvents({ events: [event] });

    return NextResponse.json(successResponse({ sent: true }));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
