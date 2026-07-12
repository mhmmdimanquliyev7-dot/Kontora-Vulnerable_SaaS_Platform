import { Redis } from "ioredis";

import { env } from "@/config/env.js";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on("error", (err: Error) => {
  console.error("Redis connection error:", err.message);
});
