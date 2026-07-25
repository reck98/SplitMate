import { Response, NextFunction } from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { AppError } from "./error.js";
import { AuthenticatedRequest } from "../types/index.js";
import { getAuth } from "../utils/firebase.js";

export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const start = performance.now();
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
    }

    const token = authHeader.slice(7);

    const verifyStart = performance.now();
    const decoded = await getAuth().verifyIdToken(token);
    const verifyTime = performance.now() - verifyStart;

    const dbStart = performance.now();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.firebase_uid, decoded.uid))
      .limit(1);
    const dbTime = performance.now() - dbStart;

    console.log(`[PERF] requireAuth: verifyIdToken=${verifyTime.toFixed(1)}ms db=${dbTime.toFixed(1)}ms total=${(performance.now() - start).toFixed(1)}ms`);

    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "User not found.");
    }

    req.user = {
      id: user.id,
      firebase_uid: user.firebase_uid,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      upi_id: user.upi_id,
      is_profile_complete: user.is_profile_complete,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(401, "UNAUTHORIZED", "Invalid or expired token."));
    }
  }
}
