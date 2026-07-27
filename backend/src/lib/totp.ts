import { authenticator } from "otplib";

export function generateTOTPSecret(): string {
  return authenticator.generateSecret();
}

export function generateTOTPUri(email: string, secret: string): string {
  return authenticator.keyuri(email, "TheCoreGamer", secret);
}

export function verifyTOTP(secret: string, token: string): boolean {
  return authenticator.verify({ secret, token });
}
