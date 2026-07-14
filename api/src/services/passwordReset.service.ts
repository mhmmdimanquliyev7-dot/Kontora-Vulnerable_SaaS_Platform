import { env } from "@/config/env.js";
import { ValidationError } from "@/lib/errors.js";
import { sendPasswordResetEmail } from "@/lib/mailer.js";
import { hashPassword } from "@/lib/password.js";
import { prisma } from "@/lib/prisma.js";
import { generatePasswordResetToken, hashPasswordResetToken } from "@/lib/tokens.js";
import { logoutAllSessions } from "@/services/auth.service.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Always resolves — never reveals whether the email is registered (the
// caller gets the same generic response either way; see
// auth.controller.ts). Doesn't chase timing-safety the way login does
// (verifyPasswordTimingSafe's dummy-hash trick): register() already leaks
// account existence via its 409 on a duplicate email, so a timing side
// channel here wouldn't be closing a real gap.
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  // A fresh request supersedes any still-valid link already in the
  // recipient's inbox, so at most one reset link works at a time.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const rawToken = generatePasswordResetToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashPasswordResetToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${env.CORS_ORIGIN}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashPasswordResetToken(rawToken);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new ValidationError("This reset link is invalid or has expired.");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  // A password reset is a strong signal the old credential may have been
  // compromised — kill every existing session rather than leaving a
  // logged-in attacker's session (or any other stale device) alive.
  await logoutAllSessions(resetToken.userId);
}
