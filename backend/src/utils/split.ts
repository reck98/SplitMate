import { AppError } from "../middleware/error.js";

/**
 * Calculates equal split shares using integer paise arithmetic and remainder distribution.
 * 
 * Rounding Policy:
 * 1. Total expense amount is converted to integer paise (`Math.round(amount * 100)`).
 * 2. `baseSharePaise = Math.floor(totalPaise / N)`
 * 3. `remainderPaise = totalPaise % N`
 * 4. The first `remainderPaise` participants receive `baseSharePaise + 1` paise.
 * 5. Remaining participants receive `baseSharePaise` paise.
 * 6. The sum of all participant shares ALWAYS equals the total amount.
 */
export function calculateEqualShares(
  amount: number,
  participantIds: string[],
): Array<{ user_id: string; share_amount: number }> {
  const uniqueParticipants = Array.from(
    new Set(participantIds.filter((id) => typeof id === "string" && id.trim().length > 0)),
  );

  if (uniqueParticipants.length === 0) {
    throw new AppError(
      400,
      "INVALID_PARTICIPANTS",
      "At least one participant is required.",
    );
  }

  const totalPaise = Math.round(amount * 100);
  const count = uniqueParticipants.length;
  const baseSharePaise = Math.floor(totalPaise / count);
  const remainderPaise = totalPaise % count;

  return uniqueParticipants.map((userId, index) => {
    const sharePaise = baseSharePaise + (index < remainderPaise ? 1 : 0);
    return {
      user_id: userId,
      share_amount: Math.round(sharePaise) / 100,
    };
  });
}
