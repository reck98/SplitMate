import { Router, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { settlements, groupMembers, groups } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/error.js";
import { AuthenticatedRequest } from "../types/index.js";
import { getGroupData } from "../services/group.js";
import { getBalances } from "../services/balance.js";
import { broadcast } from "../services/sse.js";

const router = Router();

const createSettlementSchema = z.object({
  payer_id: z.string().min(1, "Payer is required"),
  receiver_id: z.string().min(1, "Receiver is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  expense_id: z.string().optional(),
  expenseId: z.string().optional(),
});

router.post(
  "/groups/:id/settlements",
  requireAuth,
  validate(createSettlementSchema),
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const groupId = req.params.id;

      const [group] = await db
        .select()
        .from(groups)
        .where(eq(groups.id, groupId))
        .limit(1);

      if (!group) {
        throw new AppError(
          404,
          "GROUP_NOT_FOUND",
          "The requested group does not exist.",
        );
      }

      const isMember = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.group_id, groupId),
            eq(groupMembers.user_id, req.user!.id),
          ),
        )
        .limit(1);

      if (isMember.length === 0) {
        throw new AppError(
          403,
          "NOT_MEMBER",
          "You are not a member of this group.",
        );
      }

      const payer_id = req.body.payer_id || req.body.payerId;
      const receiver_id = req.body.receiver_id || req.body.receiverId;
      const amount = req.body.amount;
      const expense_id = req.body.expense_id || req.body.expenseId;

      if (payer_id === receiver_id) {
        throw new AppError(
          400,
          "INVALID_SETTLEMENT",
          "Payer and receiver must be different.",
        );
      }

      const members = await db
        .select()
        .from(groupMembers)
        .where(eq(groupMembers.group_id, groupId));

      const memberIds = new Set(members.map((m) => m.user_id));

      if (!memberIds.has(payer_id)) {
        throw new AppError(
          400,
          "INVALID_PAYER",
          "Payer is not a member of this group.",
        );
      }

      if (!memberIds.has(receiver_id)) {
        throw new AppError(
          400,
          "INVALID_RECEIVER",
          "Receiver is not a member of this group.",
        );
      }

      const { simplified_debts: activeDebts } = await getBalances(groupId);

      let maxAllowedAmount = 0;
      if (expense_id) {
        const targetDebt = activeDebts.find(
          (d) =>
            d.expense_id === expense_id &&
            d.from.user_id === payer_id &&
            d.to.user_id === receiver_id,
        );
        if (targetDebt) {
          maxAllowedAmount = targetDebt.amount;
        }
      } else {
        const matchingDebts = activeDebts.filter(
          (d) => d.from.user_id === payer_id && d.to.user_id === receiver_id,
        );
        maxAllowedAmount = matchingDebts.reduce((sum, d) => sum + d.amount, 0);
      }

      if (maxAllowedAmount < 0.01) {
        throw new AppError(
          400,
          "NO_DEBT_FOUND",
          "There is no outstanding debt between these members to settle.",
        );
      }

      if (amount > maxAllowedAmount + 0.01) {
        throw new AppError(
          400,
          "EXCEEDS_DEBT",
          `Settlement amount (₹${amount.toFixed(2)}) cannot exceed the owed amount (₹${maxAllowedAmount.toFixed(2)}).`,
        );
      }

      const now = new Date().toISOString();
      const settlementId = uuid();

      await db.insert(settlements).values({
        id: settlementId,
        group_id: groupId,
        payer_id,
        receiver_id,
        amount,
        expense_id: expense_id || null,
        created_at: now,
      });

      const [created] = await db
        .select()
        .from(settlements)
        .where(eq(settlements.id, settlementId))
        .limit(1);

      res.status(201).json({
        success: true,
        data: created,
      });

      try {
        broadcast(groupId, "group_updated", { groupId });
      } catch {}
    } catch (error) {
      next(error);
    }
  },
);

export default router;
