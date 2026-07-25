import { Router, Request, Response } from "express";
import authRoutes from "./auth.js";
import dashboardRoutes from "./dashboard.js";
import groupRoutes from "./groups.js";
import expenseRoutes from "./expenses.js";
import settlementRoutes from "./settlements.js";
import sseRoutes from "./sse.js";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

router.use("/", authRoutes);
router.use("/", dashboardRoutes);
router.use("/groups", groupRoutes);
router.use("/", expenseRoutes);
router.use("/", settlementRoutes);
router.use("/", sseRoutes);

export default router;
