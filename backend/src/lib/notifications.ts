import { prisma } from "./prisma";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  url?: string
): Promise<void> {
  try {
    await prisma.inAppNotification.create({
      data: {
        userId,
        type,
        title: title.slice(0, 100),
        body: body.slice(0, 300),
        url: url ?? null,
      },
    });
  } catch (err) {
    console.error("[notifications] createNotification failed:", err);
  }
}
