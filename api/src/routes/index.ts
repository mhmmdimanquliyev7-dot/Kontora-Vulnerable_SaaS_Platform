import { Router } from "express";

import { requireAuth } from "@/middleware/requireAuth.js";
import { activityRouter } from "@/routes/activity.routes.js";
import { adminRouter } from "@/routes/admin.routes.js";
import { assistantRouter } from "@/routes/assistant.routes.js";
import { authRouter } from "@/routes/auth.routes.js";
import { blogRouter } from "@/routes/blog.routes.js";
import { clientRouter } from "@/routes/client.routes.js";
import { companyRouter } from "@/routes/company.routes.js";
import { dashboardRouter } from "@/routes/dashboard.routes.js";
import { diagnosticsRouter } from "@/routes/diagnostics.routes.js";
import { documentRouter } from "@/routes/document.routes.js";
import { expenseRouter } from "@/routes/expense.routes.js";
import { healthRouter } from "@/routes/health.routes.js";
import { invoiceRouter } from "@/routes/invoice.routes.js";
import { reportRouter } from "@/routes/report.routes.js";
import { teamRouter } from "@/routes/team.routes.js";
import { webhookRouter } from "@/routes/webhook.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);

// Blog is mounted WITHOUT a global requireAuth: its public read routes serve
// logged-out visitors (the marketing site). The admin routes inside it carry
// their own requireAuth + requireRole (see blog.routes.ts).
apiRouter.use("/blog", blogRouter);

apiRouter.use("/clients", requireAuth, clientRouter);
apiRouter.use("/invoices", requireAuth, invoiceRouter);
apiRouter.use("/expenses", requireAuth, expenseRouter);
apiRouter.use("/team", requireAuth, teamRouter);
apiRouter.use("/dashboard", requireAuth, dashboardRouter);
apiRouter.use("/company", requireAuth, companyRouter);
apiRouter.use("/activity", requireAuth, activityRouter);
apiRouter.use("/admin/diagnostics", requireAuth, diagnosticsRouter);
apiRouter.use("/admin", requireAuth, adminRouter);
apiRouter.use("/reports", requireAuth, reportRouter);
apiRouter.use("/documents", requireAuth, documentRouter);
apiRouter.use("/webhooks", requireAuth, webhookRouter);
apiRouter.use("/assistant", requireAuth, assistantRouter);
