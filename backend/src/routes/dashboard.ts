import { Router, Response, NextFunction } from "express";
import { eq, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { groups, groupMembers } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { AuthenticatedRequest } from "../types/index.js";

const router = Router();

router.get(
  "/dashboard",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const overallStart = performance.now();
    try {
      const dbStart = performance.now();
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
      const dbTime = performance.now() - dbStart;

      const totalTime = performance.now() - overallStart;
      console.log(`[PERF] GET /api/dashboard: db=${dbTime.toFixed(1)}ms total=${totalTime.toFixed(1)}ms groups=${userGroups.length}`);

      res.json({
        success: true,
        data: {
          user: req.user,
          groups: userGroups,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
