import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { z } from "zod";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

export const runtime = "nodejs";

const USERNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const STAFF_ROLES = ["AUTHOR", "EDITOR", "ADMIN"];

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username may only contain letters, numbers, underscores, and hyphens"
    )
    .optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().optional(),
  // Author credentialing fields
  authorBio: z.string().max(1000).optional(),
  expertise: z.array(z.string().max(50)).max(10).optional(),
  yearsExperience: z.number().int().min(0).max(50).optional().nullable(),
  twitterHandle: z.string().max(100).optional().nullable(),
  linkedinUrl: z.string().url().max(200).optional().nullable().or(z.literal('')),
  // Profile visibility — authors/editors/admins are always public, so this
  // only takes effect for regular users (enforced server-side below).
  profileVisibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
});

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const user = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        authorBio: true,
        expertise: true,
        yearsExperience: true,
        twitterHandle: true,
        linkedinUrl: true,
        profileVisibility: true,
        role: true,
        emailVerified: true,
        twoFactorEnabled: true,
        oauthProvider: true,
        premiumUntil: true,
        createdAt: true,
        lastLoginAt: true,
        usernameChangedAt: true,
        passwordHash: true,
      },
    });

    if (!user)
      return NextResponse.json(errorResponse("Session invalidated: User not found in database"), {
        status: 401,
      });

    // Never expose the hash itself — only whether a password is set.
    const { passwordHash, usernameChangedAt, ...publicUser } = user;
    const cooldownEnds = usernameChangedAt
      ? new Date(usernameChangedAt.getTime() + USERNAME_COOLDOWN_MS)
      : null;

    return NextResponse.json(
      successResponse({
        ...publicUser,
        hasPassword: !!passwordHash,
        usernameChangedAt,
        usernameCooldownUntil:
          cooldownEnds && cooldownEnds > new Date() ? cooldownEnds.toISOString() : null,
      })
    );
  } catch (err) {
    captureError(err, { route: "GET /api/user/profile" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function PUT(request: Request) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { data, error: validationError } = await validateBody(request, updateProfileSchema);
    if (validationError) return validationError;

    // Username changes are rate-limited to once every 30 days (displayName is not).
    const current = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { username: true, usernameChangedAt: true, role: true },
    });
    if (!current) {
      return NextResponse.json(errorResponse("User not found"), { status: 401 });
    }

    // Staff profiles are always public — silently ignore the field for them
    // rather than letting them hide their author page from readers.
    const isStaff = STAFF_ROLES.includes(current.role);

    const isUsernameChange = !!data.username && data.username !== current.username;

    if (isUsernameChange) {
      if (current.usernameChangedAt) {
        const nextAllowed = new Date(
          current.usernameChangedAt.getTime() + USERNAME_COOLDOWN_MS
        );
        if (nextAllowed > new Date()) {
          return NextResponse.json(
            {
              ...errorResponse(
                `You can only change your username once every 30 days. Next change allowed on ${nextAllowed.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}.`
              ),
              nextAllowedAt: nextAllowed.toISOString(),
            },
            { status: 429 }
          );
        }
      }

      const existing = await prisma.user.findFirst({
        where: { username: data.username, NOT: { id: session!.user.id } },
      });
      if (existing) {
        return NextResponse.json(errorResponse("Username is already taken"), { status: 409 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: session!.user.id },
      data: {
        ...(data.displayName && { displayName: data.displayName }),
        ...(isUsernameChange && { username: data.username, usernameChangedAt: new Date() }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.authorBio !== undefined && { authorBio: data.authorBio || null }),
        ...(data.expertise !== undefined && { expertise: data.expertise }),
        ...(data.yearsExperience !== undefined && { yearsExperience: data.yearsExperience ?? null }),
        ...(data.twitterHandle !== undefined && { twitterHandle: data.twitterHandle || null }),
        ...(data.linkedinUrl !== undefined && { linkedinUrl: data.linkedinUrl || null }),
        ...(data.profileVisibility !== undefined && !isStaff && { profileVisibility: data.profileVisibility }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        authorBio: true,
        expertise: true,
        yearsExperience: true,
        twitterHandle: true,
        linkedinUrl: true,
        profileVisibility: true,
        role: true,
        emailVerified: true,
        twoFactorEnabled: true,
        oauthProvider: true,
        premiumUntil: true,
        createdAt: true,
        lastLoginAt: true,
        usernameChangedAt: true,
        passwordHash: true,
      },
    });

    const { passwordHash, usernameChangedAt, ...publicUpdated } = updated;
    const cooldownEnds = usernameChangedAt
      ? new Date(usernameChangedAt.getTime() + USERNAME_COOLDOWN_MS)
      : null;

    return NextResponse.json(
      successResponse(
        {
          ...publicUpdated,
          hasPassword: !!passwordHash,
          usernameChangedAt,
          usernameCooldownUntil:
            cooldownEnds && cooldownEnds > new Date() ? cooldownEnds.toISOString() : null,
        },
        "Profile updated"
      )
    );
  } catch (err) {
    captureError(err, { route: "PUT /api/user/profile" });
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        { success: false, error: "Internal server error", debug: err instanceof Error ? { message: err.message, stack: err.stack } : String(err) },
        { status: 500 }
      );
    }
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
