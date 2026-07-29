import { describe, it, expect } from "vitest";
import { calculateEqualShares } from "../utils/split.js";
import { getDetailedDebts } from "../services/settlement.js";

describe("Integration Workflow & Scenario Verification Tests", () => {
  const members = [
    { user_id: "reck98", name: "reck98" },
    { user_id: "akash", name: "Akash Singh" },
    { user_id: "aanid", name: "Aanid A Daz" },
  ];

  it("Scenario 1: ₹20 equal split produces exactly ₹10 each and Akash owes reck98 ₹10 (NOT ₹9.50)", () => {
    const expense = {
      id: "exp_20",
      description: "Dinner",
      amount: 20,
      paid_by: "reck98",
      created_at: new Date().toISOString(),
    };

    const shares = calculateEqualShares(20, ["reck98", "akash"]);
    expect(shares).toEqual([
      { user_id: "reck98", share_amount: 10 },
      { user_id: "akash", share_amount: 10 },
    ]);

    const participants = shares.map((s) => ({
      expense_id: "exp_20",
      user_id: s.user_id,
      share_amount: s.share_amount,
    }));

    const { detailed_debts, balances } = getDetailedDebts(
      members,
      [expense],
      participants,
      [],
    );

    expect(detailed_debts).toHaveLength(1);
    const debt = detailed_debts[0];
    expect(debt.debtor_id).toBe("akash");
    expect(debt.payer_id).toBe("reck98");
    expect(debt.amount).toBe(10);

    const akashBalance = balances.find((b) => b.user_id === "akash");
    expect(akashBalance?.owed).toBe(10);
    expect(akashBalance?.net_balance).toBe(-10);

    const reckBalance = balances.find((b) => b.user_id === "reck98");
    expect(reckBalance?.lent).toBe(10);
    expect(reckBalance?.net_balance).toBe(10);
  });

  it("Scenario 2: Custom Split behavior remains intact and verified", () => {
    const expense = {
      id: "exp_custom",
      description: "Party",
      amount: 150,
      paid_by: "reck98",
      created_at: new Date().toISOString(),
    };

    const participants = [
      { expense_id: "exp_custom", user_id: "reck98", share_amount: 50 },
      { expense_id: "exp_custom", user_id: "akash", share_amount: 100 },
    ];

    const { detailed_debts } = getDetailedDebts(
      members,
      [expense],
      participants,
      [],
    );

    expect(detailed_debts).toHaveLength(1);
    expect(detailed_debts[0].amount).toBe(100);
    expect(detailed_debts[0].debtor_id).toBe("akash");
  });

  it("Scenario 3: Settlement application updates active debts correctly", () => {
    const expense = {
      id: "exp_20",
      description: "Dinner",
      amount: 20,
      paid_by: "reck98",
      created_at: "2026-07-29T10:00:00Z",
    };

    const shares = calculateEqualShares(20, ["reck98", "akash"]);
    const participants = shares.map((s) => ({
      expense_id: "exp_20",
      user_id: s.user_id,
      share_amount: s.share_amount,
    }));

    const settlements = [
      {
        id: "s1",
        group_id: "g1",
        payer_id: "akash",
        receiver_id: "reck98",
        amount: 10,
        expense_id: "exp_20",
        created_at: "2026-07-29T11:00:00Z",
      },
    ];

    const { detailed_debts, balances } = getDetailedDebts(
      members,
      [expense],
      participants,
      settlements,
    );

    expect(detailed_debts).toHaveLength(0); // All settled up!

    const akashBalance = balances.find((b) => b.user_id === "akash");
    expect(akashBalance?.net_balance).toBe(0);
  });

  it("Scenario 4: Expense edit recalculates balances cleanly", () => {
    // Initial: ₹20 equal split
    let expense = {
      id: "exp_1",
      description: "Lunch",
      amount: 20,
      paid_by: "reck98",
      created_at: "2026-07-29T10:00:00Z",
    };

    let shares = calculateEqualShares(20, ["reck98", "akash"]);
    let participants = shares.map((s) => ({
      expense_id: "exp_1",
      user_id: s.user_id,
      share_amount: s.share_amount,
    }));

    let result = getDetailedDebts(members, [expense], participants, []);
    expect(result.detailed_debts[0].amount).toBe(10);

    // Edit: Amount changed to ₹50
    expense = {
      id: "exp_1",
      description: "Lunch Special",
      amount: 50,
      paid_by: "reck98",
      created_at: "2026-07-29T10:00:00Z",
    };

    shares = calculateEqualShares(50, ["reck98", "akash"]);
    participants = shares.map((s) => ({
      expense_id: "exp_1",
      user_id: s.user_id,
      share_amount: s.share_amount,
    }));

    result = getDetailedDebts(members, [expense], participants, []);
    expect(result.detailed_debts[0].amount).toBe(25);
  });

  it("Scenario 5: Expense deletion clears obligations", () => {
    const expenses: any[] = [];
    const participants: any[] = [];

    const result = getDetailedDebts(members, expenses, participants, []);
    expect(result.detailed_debts).toHaveLength(0);
    expect(result.balances.every((b) => b.net_balance === 0)).toBe(true);
  });
});
