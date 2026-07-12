import { Router } from "express";

import { requireAuth } from "@/middleware/requireAuth.js";
import { authRouter } from "@/routes/auth.routes.js";
import { clientRouter } from "@/routes/client.routes.js";
import { expenseRouter } from "@/routes/expense.routes.js";
import { healthRouter } from "@/routes/health.routes.js";
import { invoiceRouter } from "@/routes/invoice.routes.js";
import { teamRouter } from "@/routes/team.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);

apiRouter.use("/clients", requireAuth, clientRouter);
apiRouter.use("/invoices", requireAuth, invoiceRouter);
apiRouter.use("/expenses", requireAuth, expenseRouter);
apiRouter.use("/team", requireAuth, teamRouter);
