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
import { broadcast } from "../services/sse.js";

const router = Router();

const createSettlementSchema = z.object({
  payer_id: z.string().min(1, "Payer is required"),
  receiver_id: z.string().min(1, "Receiver is required"),
  amount: z.number().positive("Amount must be greater than 0"),
});

router.post(
  "/groups/:id/settlements",
  requireAuth,
  validate(createSettlementSchema),
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

      const { payer_id, receiver_id, amount } = req.body;

      if (payer_id === receiver_id) {
        throw new AppError(400, "INVALID_SETTLEMENT", "Payer and receiver must be different.");
      }

      const members = await db
        .select()
        .from(groupMembers)
        .where(eq(groupMembers.group_id, groupId));

      const memberIds = new Set(members.map((m) => m.user_id));

      if (!memberIds.has(payer_id)) {
        throw new AppError(400, "INVALID_PAYER", "Payer is not a member of this group.");
      }

      if (!memberIds.has(receiver_id)) {
        throw new AppError(400, "INVALID_RECEIVER", "Receiver is not a member of this group.");
      }

      const now = new Date().toISOString();
      const settlementId = uuid();

      await db.insert(settlements).values({
        id: settlementId,
        group_id: groupId,
        payer_id,
        receiver_id,
        amount,
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
        const groupData = await getGroupData(groupId, req.user!.id);
        broadcast(groupId, "group_updated", groupData);
      } catch {}
    } catch (error) {
      next(error);
    }
  }
);

export default router;
