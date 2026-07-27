import { prisma } from "@/lib/prisma";

export async function issueStrike(
  userId: string,
  reason: string,
  severity: number = 1,
  issuedById?: string,
  expiresAt?: Date | null
) {
  const strike = await prisma.userStrike.create({
    data: { userId, reason, severity, issuedById: issuedById ?? null, expiresAt: expiresAt ?? null },
  });
  // Auto-restrict after 3 strikes
  const count = await prisma.userStrike.count({ where: { userId } });
  if (count >= 3) {
    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await prisma.user.update({ where: { id: userId }, data: { lockUntil: until } });
  }
  return strike;
}

export async function logModerationAction(params: {
  action: string;
  targetType: string;
  targetId: string;
  moderatorId?: string;
  reason?: string;
}) {
  return prisma.moderationLog.create({ data: params }).catch(() => null);
}
