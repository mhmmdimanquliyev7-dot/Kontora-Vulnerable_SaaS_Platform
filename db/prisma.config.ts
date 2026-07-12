import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Node's native TypeScript support (not tsx/esbuild) — esbuild ships a
    // platform-specific native binary that breaks when node_modules
    // installed on one OS is bind-mounted into a container on another
    // (see the `migrate` service in docker-compose.yml).
    seed: "node prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
