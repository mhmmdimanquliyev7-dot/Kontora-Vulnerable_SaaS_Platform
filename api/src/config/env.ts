import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  JWT_SECRET: z
    .string()
    .min(
      32,
      "JWT_SECRET must be at least 32 characters — generate one with `openssl rand -hex 32`",
    ),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  LOGIN_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(5),

  MONGODB_URL: z.string().min(1, "MONGODB_URL is required"),

  // Outbound mail (currently: password reset links). Points at MailHog in
  // dev/docker-compose.yml (no auth, no TLS); a real SMTP provider in
  // production, which is why SMTP_USER/SMTP_PASSWORD exist but are
  // optional — MailHog needs neither.
  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().min(1, "MAIL_FROM is required"),

  // Internal-only satellite services (report-service, export-worker) — never
  // published to the host, reachable only over the Docker network — plus
  // the shared secret every call to them must carry. Network isolation is
  // one layer; this header is the other, in case a service ever gets
  // exposed by a compose misconfiguration.
  REPORT_SERVICE_URL: z.string().min(1, "REPORT_SERVICE_URL is required"),
  EXPORT_WORKER_URL: z.string().min(1, "EXPORT_WORKER_URL is required"),
  INTERNAL_API_KEY: z
    .string()
    .min(32, "INTERNAL_API_KEY must be at least 32 characters — generate one with `openssl rand -hex 32`"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
