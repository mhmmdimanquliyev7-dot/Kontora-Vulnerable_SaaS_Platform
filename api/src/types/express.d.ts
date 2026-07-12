import type { Role } from "@kontora/db";

declare global {
  namespace Express {
    interface Request {
      /** Populated by requireAuth. The authenticated user's identity and
       *  active tenant (company) context — every service call that reads
       *  or writes company-scoped data must be filtered by auth.companyId. */
      auth?: {
        userId: string;
        companyId: string;
        role: Role;
        sessionId: string;
      };
    }
  }
}

export {};
