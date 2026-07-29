import { verifyTOTP } from "./src/lib/totp";
import { prisma } from "./src/lib/prisma";
import { redis } from "./src/lib/redis";
import { generateRecoveryCodes, hashRecoveryCodes } from "./src/lib/recovery";

async function run() {
  try {
    const userId = "cmoy1ctcm0001wnos1hpbsot8"; // From the previous test
    
    // Simulate /api/auth/2fa/setup
    console.log("Setting up fake Redis key...");
    const fakeSecret = "BZKFAWSEHZ4TC6QR";
    const redisKey = `2fa-setup:${userId}`;
    await redis.set(redisKey, fakeSecret, { ex: 600 });
    
    // Simulate /api/auth/2fa/verify
    console.log("Verifying...");
    const pendingSecret = await redis.get<string>(redisKey);
    console.log("Redis returned:", pendingSecret);
    
    if (!pendingSecret) throw new Error("No pending secret");
    
    // generate valid code for this exact moment to pass verifyTOTP
    const { authenticator } = require("otplib");
    const validCode = authenticator.generate(pendingSecret);
    console.log("Valid code:", validCode);
    
    const isValid = verifyTOTP(pendingSecret, validCode);
    console.log("isValid:", isValid);
    if (!isValid) throw new Error("Invalid TOTP");
    
    console.log("Generating backup codes...");
    const backupCodes = generateRecoveryCodes();
    
    console.log("Hashing backup codes...");
    const hashedBackupCodes = await hashRecoveryCodes(backupCodes);
    
    console.log("Updating DB...");
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: pendingSecret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes,
      },
    });
    
    console.log("Cleaning up Redis...");
    await redis.del(redisKey);
    
    console.log("SUCCESS!");
  } catch(e) {
    console.error("FAILED:", e);
  }
}
run();
