import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// A hash of a password nobody will ever type, used to keep bcrypt.compare's
// timing consistent when no user was found — otherwise "unknown email" would
// return faster than "wrong password" and leak which emails are registered.
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO2A0e1i6dUAv5wYE8ZfP8T5MYP.SS8Fq";

export async function verifyPasswordTimingSafe(
  plain: string,
  hash: string | null,
): Promise<boolean> {
  return bcrypt.compare(plain, hash ?? DUMMY_HASH);
}
