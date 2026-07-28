import { Router, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, groupMembers } from "../db/schema.js";
import { getAuth } from "../utils/firebase.js";
import { getGroupData } from "../services/group.js";
import { subscribe, unsubscribe, broadcast } from "../services/sse.js";

const router = Router();

router.get("/groups/:id/sse", async (req, res: Response) => {
  try {
    const token = req.query.token as string | undefined;
    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required." },
      });
      return;
    }

    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(token);
    } catch {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid or expired token." },
      });
      return;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.firebase_uid, decoded.uid))
      .limit(1);

    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not found." },
      });
      return;
    }

    const groupId = req.params.id;

    const isMember = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.group_id, groupId),
          eq(groupMembers.user_id, user.id),
        ),
      )
      .limit(1);

    if (isMember.length === 0) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You are not a member of this group.",
        },
      });
      return;
    }

    subscribe(groupId, user.id, res);

    try {
      const data = await getGroupData(groupId, user.id);
      res.write(`event: connected\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      broadcast(groupId, "group_deleted", { groupId });
      unsubscribe(groupId, user.id);
      return;
    }
  } catch {
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Internal server error." },
      });
    }
  }
});

export default router;
