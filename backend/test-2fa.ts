import { generateTOTPSecret, generateTOTPUri, verifyTOTP } from "./src/lib/totp";
import { generateRecoveryCodes, hashRecoveryCodes } from "./src/lib/recovery";

async function test() {
  try {
    console.log("1. Generating secret");
    const secret = generateTOTPSecret();
    console.log("Secret:", secret);
    
    console.log("2. Generating URI");
    const uri = generateTOTPUri("test@test.com", secret);
    console.log("URI:", uri);
    
    console.log("3. Verifying TOTP (with fake code)");
    try {
      const valid = verifyTOTP(secret, "123456");
      console.log("Is valid?", valid);
    } catch(e) {
      console.error("verifyTOTP threw:", e);
    }

    console.log("4. Generating recovery codes");
    const codes = generateRecoveryCodes(10);
    console.log("Codes:", codes);

    console.log("5. Hashing recovery codes");
    const hashed = await hashRecoveryCodes(codes);
    console.log("Hashed codes length:", hashed.length);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
