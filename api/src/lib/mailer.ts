import nodemailer from "nodemailer";

import { env } from "@/config/env.js";

// MailHog (dev, see docker-compose.yml) accepts any connection with no
// auth and no TLS, so SMTP_USER/SMTP_PASSWORD are left unset there; a real
// provider (production) supplies both, which is also what flips `secure`
// on — plain SMTP+STARTTLS on 587 does not want an upfront TLS handshake.
const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
});

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await transport.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: "Reset your Kontora password",
    text: `We received a request to reset your Kontora password.\n\nReset it here: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't be changed.`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
        <p>We received a request to reset your Kontora password.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #171717; color: #fff; text-decoration: none; border-radius: 6px;">
            Reset password
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this
          email — your password won't be changed.
        </p>
      </div>
    `,
  });
}
