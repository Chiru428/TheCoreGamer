import { NextResponse } from "next/server";
import { requireRole } from "@/middleware/requireRole";
import { csrfProtection } from "@/middleware/csrfProtection";
import { validateBody } from "@/middleware/validateBody";
import { pushSendSchema } from "@/validators";
import { addPushJob } from "@/lib/bullmq";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function POST(request: Request) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { data, error } = await validateBody(request, pushSendSchema);
    if (error) return error;

    await addPushJob({ title: data.title, body: data.body, url: data.url, icon: data.icon });

    return NextResponse.json(successResponse(null, "Push notification queued"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
