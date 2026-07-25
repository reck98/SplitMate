import { Router, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { groups, groupMembers, users, expenses, expenseParticipants, settlements } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/error.js";
import { AuthenticatedRequest } from "../types/index.js";
import { generateInviteCode } from "../utils/invite.js";
import { getBalances } from "../services/balance.js";

const router = Router();

const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Group name too long"),
});

const joinGroupSchema = z.object({
  invite_code: z.string().min(1, "Invite code is required"),
});

router.post(
  "/",
  requireAuth,
  validate(createGroupSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.body;
      const now = new Date().toISOString();
      const id = uuid();
      const inviteCode = generateInviteCode();

      await db.insert(groups).values({
        id,
        name,
        owner_id: req.user!.id,
        invite_code: inviteCode,
        created_at: now,
      });

      await db.insert(groupMembers).values({
        group_id: id,
        user_id: req.user!.id,
        joined_at: now,
      });

      const [group] = await db
        .select()
        .from(groups)
        .where(eq(groups.id, id))
        .limit(1);

      res.status(201).json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userGroups = await db
        .select({
          id: groups.id,
          name: groups.name,
          owner_id: groups.owner_id,
          invite_code: groups.invite_code,
          created_at: groups.created_at,
          member_count: sql<number>`(
            SELECT COUNT(*) FROM ${groupMembers}
            WHERE ${groupMembers.group_id} = ${groups.id}
          )`,
        })
        .from(groupMembers)
        .innerJoin(groups, eq(groupMembers.group_id, groups.id))
        .where(eq(groupMembers.user_id, req.user!.id))
        .orderBy(groups.created_at);

      res.json({
        success: true,
        data: userGroups,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const [group] = await db
        .select()
        .from(groups)
        .where(eq(groups.id, id))
        .limit(1);

      if (!group) {
        throw new AppError(404, "GROUP_NOT_FOUND", "The requested group does not exist.");
      }

      const isMember = await db
        .select()
        .from(groupMembers)
        .where(
          and(eq(groupMembers.group_id, id), eq(groupMembers.user_id, req.user!.id))
        )
        .limit(1);

      if (isMember.length === 0) {
        throw new AppError(403, "NOT_MEMBER", "You are not a member of this group.");
      }

      const members = await db
        .select({
          user_id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          upi_id: users.upi_id,
          joined_at: groupMembers.joined_at,
        })
        .from(groupMembers)
        .innerJoin(users, eq(groupMembers.user_id, users.id))
        .where(eq(groupMembers.group_id, id));

      const groupExpenses = await db
        .select()
        .from(expenses)
        .where(eq(expenses.group_id, id))
        .orderBy(expenses.created_at);

      const expenseIds = groupExpenses.map((e) => e.id);

      let allParticipants: Array<{
        expense_id: string;
        user_id: string;
        share_amount: number;
      }> = [];

      if (expenseIds.length > 0) {
        allParticipants = await db
          .select()
          .from(expenseParticipants)
          .where(inArray(expenseParticipants.expense_id, expenseIds));
      }

      const expenseData = groupExpenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        paid_by: e.paid_by,
        paid_by_name: members.find((m) => m.user_id === e.paid_by)?.name || "Unknown",
        created_by: e.created_by,
        participants: allParticipants
          .filter((p) => p.expense_id === e.id)
          .map((p) => ({
            user_id: p.user_id,
            share_amount: p.share_amount,
          })),
        created_at: e.created_at,
        updated_at: e.updated_at,
      }));

      const groupSettlements = await db
        .select()
        .from(settlements)
        .where(eq(settlements.group_id, id))
        .orderBy(settlements.created_at);

      const settlementData = groupSettlements.map((s) => ({
        id: s.id,
        payer_id: s.payer_id,
        payer_name: members.find((m) => m.user_id === s.payer_id)?.name || "Unknown",
        receiver_id: s.receiver_id,
        receiver_name: members.find((m) => m.user_id === s.receiver_id)?.name || "Unknown",
        amount: s.amount,
        created_at: s.created_at,
      }));

      const { balances, simplified_debts } = await getBalances(id, {
        groupExpenses,
        allParticipants,
        groupSettlements,
      });

      res.json({
        success: true,
        data: {
          group,
          members,
          expenses: expenseData,
          balances,
          settlements: settlementData,
          simplified_debts,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const [group] = await db
        .select()
        .from(groups)
        .where(eq(groups.id, id))
        .limit(1);

      if (!group) {
        throw new AppError(404, "GROUP_NOT_FOUND", "The requested group does not exist.");
      }

      if (group.owner_id !== req.user!.id) {
        throw new AppError(403, "FORBIDDEN", "Only the group owner can delete this group.");
      }

      const groupExpenses = await db
        .select({ id: expenses.id })
        .from(expenses)
        .where(eq(expenses.group_id, id));

      const expenseIds = groupExpenses.map((e) => e.id);

      if (expenseIds.length > 0) {
        await db
          .delete(expenseParticipants)
          .where(inArray(expenseParticipants.expense_id, expenseIds));

        await db
          .delete(expenses)
          .where(inArray(expenses.id, expenseIds));
      }

      await db
        .delete(settlements)
        .where(eq(settlements.group_id, id));

      await db
        .delete(groupMembers)
        .where(eq(groupMembers.group_id, id));

      await db
        .delete(groups)
        .where(eq(groups.id, id));

      res.json({
        success: true,
        data: { message: "Group deleted successfully." },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/join",
  requireAuth,
  validate(joinGroupSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { invite_code } = req.body;

      const [group] = await db
        .select()
        .from(groups)
        .where(eq(groups.invite_code, invite_code))
        .limit(1);

      if (!group) {
        throw new AppError(404, "INVALID_INVITE_CODE", "Invalid invite code. Please check and try again.");
      }

      const [existing] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.group_id, group.id),
            eq(groupMembers.user_id, req.user!.id)
          )
        )
        .limit(1);

      if (existing) {
        throw new AppError(409, "ALREADY_MEMBER", "You are already a member of this group.");
      }

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(groupMembers)
        .where(eq(groupMembers.group_id, group.id));

      if (countResult.count >= 100) {
        throw new AppError(409, "GROUP_FULL", "This group has reached the maximum of 100 members.");
      }

      await db.insert(groupMembers).values({
        group_id: group.id,
        user_id: req.user!.id,
        joined_at: new Date().toISOString(),
      });

      res.json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/leave",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const [group] = await db
        .select()
        .from(groups)
        .where(eq(groups.id, id))
        .limit(1);

      if (!group) {
        throw new AppError(404, "GROUP_NOT_FOUND", "The requested group does not exist.");
      }

      if (group.owner_id === req.user!.id) {
        throw new AppError(409, "OWNER_CANNOT_LEAVE", "Group owner cannot leave. Delete the group instead.");
      }

      const { balances } = await getBalances(id);
      const userBalance = balances.find((b) => b.user_id === req.user!.id);

      if (userBalance && Math.abs(userBalance.net_balance) > 0.01) {
        throw new AppError(
          409,
          "NON_ZERO_BALANCE",
          `You have an outstanding balance of ₹${userBalance.net_balance.toFixed(2)}. Settle all debts before leaving.`
        );
      }

      await db
        .delete(groupMembers)
        .where(
          and(
            eq(groupMembers.group_id, id),
            eq(groupMembers.user_id, req.user!.id)
          )
        );

      res.json({
        success: true,
        data: { message: "You have left the group." },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
