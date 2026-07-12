import rateLimit from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";

import { redis } from "@/lib/redis.js";

// Redis-backed so the limit is shared across every api container/replica,
// not per-process — a single instance's in-memory counter would let an
// attacker just spread requests across replicas to bypass it.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: "rl:auth:",
    sendCommand: (...args: string[]) =>
      redis.call(args[0] as string, ...args.slice(1)) as Promise<RedisReply>,
  }),
  handler: (_req, res) => {
    res.status(429).json({
      error: "TooManyRequests",
      message: "Too many attempts. Please try again later.",
    });
  },
});
