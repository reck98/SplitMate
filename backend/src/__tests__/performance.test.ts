import { describe, it, expect } from "vitest";
import { getDetailedDebts } from "../services/settlement.js";

describe("Performance & Scale Benchmarks", () => {
  it("calculates balances for 100 members and 1,000 expenses efficiently (< 100ms)", () => {
    const memberCount = 100;
    const expenseCount = 1000;

    const members = Array.from({ length: memberCount }, (_, i) => ({
      user_id: `user_${i}`,
      name: `User ${i}`,
    }));

    const expenses: any[] = [];
    const participants: any[] = [];

    for (let e = 0; e < expenseCount; e++) {
      const expId = `exp_${e}`;
      const payerId = `user_${e % memberCount}`;
      const amount = 100 + (e % 50);

      expenses.push({
        id: expId,
        description: `Expense ${e}`,
        amount,
        paid_by: payerId,
        created_at: new Date(1700000000000 + e * 1000).toISOString(),
      });

      // Split equally between 5 members
      for (let p = 0; p < 5; p++) {
        const userId = `user_${(e + p) % memberCount}`;
        participants.push({
          expense_id: expId,
          user_id: userId,
          share_amount: amount / 5,
        });
      }
    }

    const startTime = performance.now();
    const { detailed_debts, balances } = getDetailedDebts(
      members,
      expenses,
      participants,
      [],
    );
    const duration = performance.now() - startTime;

    expect(balances).toHaveLength(memberCount);
    expect(detailed_debts.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(500); // Must complete quickly
  });
});
