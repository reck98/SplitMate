import { Router, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { expenses, expenseParticipants, groupMembers, groups } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/error.js";
import { AuthenticatedRequest } from "../types/index.js";
import { getGroupData } from "../services/group.js";
import { broadcast } from "../services/sse.js";

const router = Router();

const createExpenseSchema = z.discriminatedUnion("split_type", [
  z.object({
    description: z.string().min(1, "Description is required").max(200),
    amount: z.number().positive("Amount must be greater than 0"),
    split_type: z.literal("equal"),
    participants: z
      .array(z.string())
      .min(1, "At least one participant is required"),
  }),
  z.object({
    description: z.string().min(1, "Description is required").max(200),
    amount: z.number().positive("Amount must be greater than 0"),
    split_type: z.literal("custom"),
    participants: z
      .array(
        z.object({
          user_id: z.string(),
          share_amount: z.number().min(0, "Share amount cannot be negative"),
        })
      )
      .min(1, "At least one participant is required"),
  }),
]);

const updateExpenseSchema = z.discriminatedUnion("split_type", [
  z.object({
    description: z.string().min(1, "Description is required").max(200),
    amount: z.number().positive("Amount must be greater than 0"),
    split_type: z.literal("equal"),
    participants: z
      .array(z.string())
      .min(1, "At least one participant is required"),
  }),
  z.object({
    description: z.string().min(1, "Description is required").max(200),
    amount: z.number().positive("Amount must be greater than 0"),
    split_type: z.literal("custom"),
    participants: z
      .array(
        z.object({
          user_id: z.string(),
          share_amount: z.number().min(0, "Share amount cannot be negative"),
        })
      )
      .min(1, "At least one participant is required"),
  }),
]);

async function verifyGroupMembership(groupId: string, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;

  const members = await db
    .select({ user_id: groupMembers.user_id })
    .from(groupMembers)
    .where(
      and(eq(groupMembers.group_id, groupId), inArray(groupMembers.user_id, userIds))
    );

  const memberIds = new Set(members.map((m) => m.user_id));
  const invalidUserIds = userIds.filter((uid) => !memberIds.has(uid));

  if (invalidUserIds.length > 0) {
    throw new AppError(
      400,
      "INVALID_PARTICIPANTS",
      "Some participants are not members of this group."
    );
  }
}

router.post(
  "/groups/:id/expenses",
  requireAuth,
  validate(createExpenseSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const groupId = req.params.id;

      const [group] = await db
        .select()
        .from(groups)
        .where(eq(groups.id, groupId))
        .limit(1);

      if (!group) {
        throw new AppError(404, "GROUP_NOT_FOUND", "The requested group does not exist.");
      }

      const isMember = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.group_id, groupId),
            eq(groupMembers.user_id, req.user!.id)
          )
        )
        .limit(1);

      if (isMember.length === 0) {
        throw new AppError(403, "NOT_MEMBER", "You are not a member of this group.");
      }

      const paid_by = req.user!.id;
      const { description, amount, split_type, participants } = req.body;

      await verifyGroupMembership(groupId, [
        req.user!.id,
        ...(split_type === "equal"
          ? participants
          : participants.map((p: { user_id: string }) => p.user_id)),
      ]);

      if (split_type === "custom") {
        const totalShare = participants.reduce(
          (sum: number, p: { share_amount: number }) => sum + p.share_amount,
          0
        );

        if (Math.abs(totalShare - amount) > 0.01) {
          throw new AppError(
            400,
            "INVALID_SPLIT",
            `Custom split total (₹${totalShare.toFixed(2)}) must equal expense amount (₹${amount.toFixed(2)}).`
          );
        }
      }

      const now = new Date().toISOString();
      const expenseId = uuid();

      await db.insert(expenses).values({
        id: expenseId,
        group_id: groupId,
        description,
        amount,
        split_type,
        paid_by,
        created_by: req.user!.id,
        created_at: now,
        updated_at: now,
      });

      if (split_type === "equal") {
        const shareAmount = Math.round((amount / participants.length) * 100) / 100;
        const shares = participants.map((userId: string) => ({
          expense_id: expenseId,
          user_id: userId,
          share_amount: shareAmount,
        }));

        await db.insert(expenseParticipants).values(shares);
      } else {
        const shares = participants.map(
          (p: { user_id: string; share_amount: number }) => ({
            expense_id: expenseId,
            user_id: p.user_id,
            share_amount: p.share_amount,
          })
        );

        await db.insert(expenseParticipants).values(shares);
      }

      const [created] = await db
        .select()
        .from(expenses)
        .where(eq(expenses.id, expenseId))
        .limit(1);

      const expenseShares = await db
        .select()
        .from(expenseParticipants)
        .where(eq(expenseParticipants.expense_id, expenseId));

      res.status(201).json({
        success: true,
        data: {
          ...created,
          participants: expenseShares,
        },
      });

      try {
        broadcast(groupId, "group_updated", { groupId });
      } catch {}
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/expenses/:id",
  requireAuth,
  validate(updateExpenseSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const expenseId = req.params.id;

      const [expense] = await db
        .select()
        .from(expenses)
        .where(eq(expenses.id, expenseId))
        .limit(1);

      if (!expense) {
        throw new AppError(404, "EXPENSE_NOT_FOUND", "The requested expense does not exist.");
      }

      if (expense.created_by !== req.user!.id) {
        throw new AppError(403, "FORBIDDEN", "You can only edit your own expenses.");
      }

      const { description, amount, split_type, participants } = req.body;

      const [group] = await db
        .select()
        .from(groups)
        .where(eq(groups.id, expense.group_id))
        .limit(1);

      if (!group) {
        throw new AppError(404, "GROUP_NOT_FOUND", "Group not found.");
      }

      await verifyGroupMembership(expense.group_id, [
        expense.paid_by,
        ...(split_type === "equal"
          ? participants
          : participants.map((p: { user_id: string }) => p.user_id)),
      ]);

      if (split_type === "custom") {
        const totalShare = participants.reduce(
          (sum: number, p: { share_amount: number }) => sum + p.share_amount,
          0
        );

        if (Math.abs(totalShare - amount) > 0.01) {
          throw new AppError(
            400,
            "INVALID_SPLIT",
            `Custom split total (₹${totalShare.toFixed(2)}) must equal expense amount (₹${amount.toFixed(2)}).`
          );
        }
      }

      const now = new Date().toISOString();

      await db
        .update(expenses)
        .set({
          description,
          amount,
          split_type,
          updated_at: now,
        })
        .where(eq(expenses.id, expenseId));

      await db
        .delete(expenseParticipants)
        .where(eq(expenseParticipants.expense_id, expenseId));

      if (split_type === "equal") {
        const shareAmount = Math.round((amount / participants.length) * 100) / 100;
        const shares = participants.map((userId: string) => ({
          expense_id: expenseId,
          user_id: userId,
          share_amount: shareAmount,
        }));

        await db.insert(expenseParticipants).values(shares);
      } else {
        const shares = participants.map(
          (p: { user_id: string; share_amount: number }) => ({
            expense_id: expenseId,
            user_id: p.user_id,
            share_amount: p.share_amount,
          })
        );

        await db.insert(expenseParticipants).values(shares);
      }

      const [updated] = await db
        .select()
        .from(expenses)
        .where(eq(expenses.id, expenseId))
        .limit(1);

      const expenseShares = await db
        .select()
        .from(expenseParticipants)
        .where(eq(expenseParticipants.expense_id, expenseId));

      res.json({
        success: true,
        data: {
          ...updated,
          participants: expenseShares,
        },
      });

      try {
        broadcast(expense.group_id, "group_updated", { groupId: expense.group_id });
      } catch {}
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/expenses/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const expenseId = req.params.id;

      const [expense] = await db
        .select()
        .from(expenses)
        .where(eq(expenses.id, expenseId))
        .limit(1);

      if (!expense) {
        throw new AppError(404, "EXPENSE_NOT_FOUND", "The requested expense does not exist.");
      }

      if (expense.created_by !== req.user!.id) {
        throw new AppError(403, "FORBIDDEN", "You can only delete your own expenses.");
      }

      await db
        .delete(expenseParticipants)
        .where(eq(expenseParticipants.expense_id, expenseId));

      await db
        .delete(expenses)
        .where(eq(expenses.id, expenseId));

      res.json({
        success: true,
        data: { message: "Expense deleted successfully." },
      });

      try {
        broadcast(expense.group_id, "group_updated", { groupId: expense.group_id });
      } catch {}
    } catch (error) {
      next(error);
    }
  }
);

export default router;
