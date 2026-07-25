import { Router, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { getAuth } from "../utils/firebase.js";
import { validateUpiId } from "../services/upi.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/error.js";
import { AuthenticatedRequest } from "../types/index.js";

const router = Router();

const updateProfileSchema = z.object({
  upi_id: z.string().min(1, "UPI ID is required"),
});

function generateAvatar(name: string): string {
  const encoded = encodeURIComponent(name);
  return `https://api.dicebear.com/8.x/initials/svg?seed=${encoded}&backgroundColor=3b82f6&textColor=ffffff`;
}

router.post(
  "/auth/firebase",
  async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
      }

      const token = authHeader.slice(7);
      const decoded = await getAuth().verifyIdToken(token);

      if (!decoded.uid || !decoded.email) {
        throw new AppError(400, "INVALID_TOKEN", "Invalid Firebase token.");
      }

      const now = new Date().toISOString();

      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.firebase_uid, decoded.uid))
        .limit(1);

      let user;
      if (existing) {
        const name = decoded.name || existing.name;
        const avatar = decoded.picture || existing.avatar;

        if (name !== existing.name || (avatar !== existing.avatar && avatar)) {
          await db
            .update(users)
            .set({
              name,
              avatar,
              email: decoded.email || existing.email,
              updated_at: now,
            })
            .where(eq(users.id, existing.id));
        }

        user = {
          ...existing,
          name,
          avatar: avatar || existing.avatar,
        };
      } else {
        const id = uuid();
        const avatar = decoded.picture || generateAvatar(decoded.name || "User");
        const newUser = {
          id,
          firebase_uid: decoded.uid,
          email: decoded.email,
          name: decoded.name || "User",
          avatar,
          upi_id: null,
          is_profile_complete: false,
          created_at: now,
          updated_at: now,
        };

        await db.insert(users).values(newUser);
        user = newUser;
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          firebase_uid: user.firebase_uid,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          upi_id: user.upi_id,
          is_profile_complete: user.is_profile_complete,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/me",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json({
      success: true,
      data: req.user,
    });
  }
);

router.patch(
  "/me",
  requireAuth,
  validate(updateProfileSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { upi_id } = req.body;

      if (!validateUpiId(upi_id)) {
        throw new AppError(400, "INVALID_UPI_ID", "Please enter a valid UPI ID (e.g., name@provider).");
      }

      const now = new Date().toISOString();

      await db
        .update(users)
        .set({
          upi_id,
          is_profile_complete: true,
          updated_at: now,
        })
        .where(eq(users.id, req.user!.id));

      const [updated] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
