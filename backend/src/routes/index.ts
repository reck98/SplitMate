import { Router } from "express";
import authRoutes from "./auth.js";
import groupRoutes from "./groups.js";
import expenseRoutes from "./expenses.js";
import settlementRoutes from "./settlements.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/groups", groupRoutes);
router.use("/", expenseRoutes);
router.use("/", settlementRoutes);

export default router;
