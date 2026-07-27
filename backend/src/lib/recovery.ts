import crypto from "crypto";
import bcrypt from "bcrypt";

// Excludes ambiguous characters (0/O, 1/I/L) to keep codes easy to transcribe by hand.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return code;
}

/** Generates human-friendly one-time recovery codes, e.g. "XXXXX-XXXXX". */
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => `${randomCode(5)}-${randomCode(5)}`);
}

export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
}

/** Returns the index of the matching hash for a submitted code, or -1 if none match. */
export async function findRecoveryCodeIndex(code: string, hashedCodes: string[]): Promise<number> {
  const normalized = code.trim().toUpperCase();
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await bcrypt.compare(normalized, hashedCodes[i])) return i;
  }
  return -1;
}
