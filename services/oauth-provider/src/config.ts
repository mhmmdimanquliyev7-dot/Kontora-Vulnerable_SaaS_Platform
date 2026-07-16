import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(9000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // The single registered client (Kontora itself). A real provider would keep
  // a client registry in a database; a mock with exactly one confidential
  // client keeps the security-relevant parts (secret check, redirect_uri
  // allowlist) identical while dropping the CRUD that isn't the point.
  OAUTH_CLIENT_ID: z.string().min(1).default("kontora-app"),
  OAUTH_CLIENT_SECRET: z
    .string()
    .min(32, "OAUTH_CLIENT_SECRET must be at least 32 characters — generate with `openssl rand -hex 32`"),

  // Comma-separated EXACT redirect URIs. Exact-match only — see
  // isRegisteredRedirectUri(). This is the control that makes the provider
  // refuse to bounce a victim's authorization code to an attacker's server.
  OAUTH_REDIRECT_URIS: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid oauth-provider environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  redirectUris: parsed.data.OAUTH_REDIRECT_URIS.split(",")
    .map((u) => u.trim())
    .filter(Boolean),
};

// Exact string comparison against the registered set. Deliberately NOT
// startsWith/includes/origin matching: prefix matching is the classic
// open-redirect hole in OAuth deployments (e.g. a registered
// "https://app.example.com/cb" would also accept
// "https://app.example.com/cb.evil.com" or ".../cb/../../open-redirect").
export function isRegisteredRedirectUri(uri: string): boolean {
  return config.redirectUris.includes(uri);
}
