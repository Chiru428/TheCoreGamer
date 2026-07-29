import { prisma } from "./src/lib/prisma";
async function test() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true, twoFactorBackupCodes: true } });
    console.log("Found user:", user?.id);
  } catch (err) {
    console.error("Prisma error:", err);
  }
}
test();
