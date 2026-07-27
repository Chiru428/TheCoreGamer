import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireRole } from "@/middleware/requireRole";
import { uploadToR2 } from "@/lib/r2";
import { captureError } from "@/lib/sentry";
import { MAX_FILE_SIZE } from "@/lib/constants";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export const runtime = "nodejs";

export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const roleCheck = await requireRole(["AUTHOR", "EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const session = await auth();
    const { slug } = await params;
    const article = await prisma.article.findUnique({
      where: { slug },
      include: { ModGuide: true },
    });
    if (!article || !article.ModGuide)
      return NextResponse.json(errorResponse("Guide not found"), { status: 404 });

    const isOwner = article.authorId === session!.user.id;
    const isEditorOrAdmin = ["EDITOR", "ADMIN"].includes(session!.user.role);
    if (!isOwner && !isEditorOrAdmin)
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json(errorResponse("No file provided"), { status: 400 });
    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json(errorResponse("File too large (max 50MB)"), { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `mod-guides/${article.ModGuide.id}/${Date.now()}-${file.name}`;
    const fileUrl = await uploadToR2(key, buffer, file.type);

    const attachment = await prisma.mediaAttachment.create({
      data: {
        modGuideId: article.ModGuide.id,
        filename: file.name,
        fileUrl,
        fileSizeBytes: BigInt(file.size),
        mimeType: file.type,
      },
    });

    return NextResponse.json(
      successResponse(
        { ...attachment, fileSizeBytes: attachment.fileSizeBytes.toString() },
        "Attachment uploaded"
      ),
      { status: 201 }
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
