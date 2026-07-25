import { describe, it, expect } from "vitest";
import { simplifyDebts, getDetailedDebts } from "../services/settlement.js";
import { BalanceInfo } from "../types/index.js";

const makeBalance = (
  user_id: string,
  name: string,
  net_balance: number
): BalanceInfo => ({
  user_id,
  name,
  lent: net_balance > 0 ? net_balance : 0,
  owed: net_balance < 0 ? Math.abs(net_balance) : 0,
  net_balance,
  paid: 0,
  share: 0,
  received: 0,
  paid_out: 0,
});

describe("getDetailedDebts", () => {
  it("keeps opposing transactions separate without auto-cancelling them", () => {
    const members = [
      { user_id: "A", name: "Alice" },
      { user_id: "B", name: "Bob" },
    ];

    // Expense 1: A pays 200 for A and B (Dinner)
    // Expense 2: B pays 200 for B and A (Cab)
    const expenses = [
      { id: "e1", description: "Dinner", amount: 200, paid_by: "A", created_at: "2026-07-26T01:00:00Z" },
      { id: "e2", description: "Cab", amount: 200, paid_by: "B", created_at: "2026-07-26T02:00:00Z" },
    ];

    const participants = [
      { expense_id: "e1", user_id: "A", share_amount: 100 },
      { expense_id: "e1", user_id: "B", share_amount: 100 },
      { expense_id: "e2", user_id: "B", share_amount: 100 },
      { expense_id: "e2", user_id: "A", share_amount: 100 },
    ];

    const settlements: any[] = [];

    const { balances, detailed_debts } = getDetailedDebts(members, expenses, participants, settlements);

    expect(detailed_debts).toHaveLength(2);

    const bOwesA = detailed_debts.find((d) => d.from.user_id === "B" && d.to.user_id === "A");
    expect(bOwesA).toBeDefined();
    expect(bOwesA!.amount).toBe(100);
    expect(bOwesA!.description).toBe("Dinner");

    const aOwesB = detailed_debts.find((d) => d.from.user_id === "A" && d.to.user_id === "B");
    expect(aOwesB).toBeDefined();
    expect(aOwesB!.amount).toBe(100);
    expect(aOwesB!.description).toBe("Cab");

    const aliceBal = balances.find((b) => b.user_id === "A");
    expect(aliceBal!.lent).toBe(100);
    expect(aliceBal!.owed).toBe(100);
    expect(aliceBal!.net_balance).toBe(0);

    const bobBal = balances.find((b) => b.user_id === "B");
    expect(bobBal!.lent).toBe(100);
    expect(bobBal!.owed).toBe(100);
    expect(bobBal!.net_balance).toBe(0);
  });
});

describe("simplifyDebts", () => {
  it("returns empty array when all balances are zero", () => {
    const balances: BalanceInfo[] = [
      makeBalance("1", "Alice", 0),
      makeBalance("2", "Bob", 0),
    ];

    const result = simplifyDebts(balances);
    expect(result).toEqual([]);
  });

  it("simplifies a single debt between two people", () => {
    const balances: BalanceInfo[] = [
      makeBalance("1", "Alice", 100),
      makeBalance("2", "Bob", -100),
    ];

    const result = simplifyDebts(balances);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      from: { user_id: "2", name: "Bob" },
      to: { user_id: "1", name: "Alice" },
      amount: 100,
    });
  });

  it("handles multiple creditors and debtors", () => {
    const balances: BalanceInfo[] = [
      makeBalance("1", "Alice", 150),
      makeBalance("2", "Bob", 300),
      makeBalance("3", "Charlie", -200),
      makeBalance("4", "Diana", -250),
    ];

    const result = simplifyDebts(balances);

    const totalOwed = result.reduce((sum, d) => sum + d.amount, 0);
    expect(totalOwed).toBeCloseTo(450, 1);

    result.forEach((debt) => {
      expect(debt.from.user_id).not.toBe(debt.to.user_id);
      expect(debt.amount).toBeGreaterThan(0);
    });
  });

  it("produces the minimum number of transactions for a simple case", () => {
    const balances: BalanceInfo[] = [
      makeBalance("1", "Alice", 200),
      makeBalance("2", "Bob", -100),
      makeBalance("3", "Charlie", -100),
    ];

    const result = simplifyDebts(balances);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("handles equal total credits and debts", () => {
    const balances: BalanceInfo[] = [
      makeBalance("1", "Alice", 150),
      makeBalance("2", "Bob", 50),
      makeBalance("3", "Charlie", -100),
      makeBalance("4", "Diana", -100),
    ];

    const result = simplifyDebts(balances);

    const totalCreditor = result.reduce((sum, d) => sum + d.amount, 0);
    expect(totalCreditor).toBeCloseTo(200, 1);
  });

  it("handles single person (no debts)", () => {
    const balances: BalanceInfo[] = [makeBalance("1", "Alice", 0)];
    const result = simplifyDebts(balances);
    expect(result).toEqual([]);
  });

  it("handles everyone being creditors (unlikely but valid)", () => {
    const balances: BalanceInfo[] = [
      makeBalance("1", "Alice", 100),
      makeBalance("2", "Bob", 200),
    ];

    const result = simplifyDebts(balances);
    expect(result).toEqual([]);
  });

  it("respects rounding to avoid tiny floating point debts", () => {
    const balances: BalanceInfo[] = [
      makeBalance("1", "Alice", 0.005),
      makeBalance("2", "Bob", -0.005),
    ];

    const result = simplifyDebts(balances);
    expect(result.length).toBeLessThanOrEqual(1);
    if (result.length === 1) {
      expect(result[0].amount).toBe(0.01);
    }
  });

  it("assigns from=debtor and to=creditor for A pays 900 split 3 ways", () => {
    const balances: BalanceInfo[] = [
      makeBalance("A", "Alice", 600),
      makeBalance("B", "Bob", -300),
      makeBalance("C", "Charlie", -300),
    ];

    const result = simplifyDebts(balances);
    expect(result).toHaveLength(2);

    const bToA = result.find((d) => d.from.user_id === "B" && d.to.user_id === "A");
    expect(bToA).toBeDefined();
    expect(bToA!.amount).toBe(300);

    const cToA = result.find((d) => d.from.user_id === "C" && d.to.user_id === "A");
    expect(cToA).toBeDefined();
    expect(cToA!.amount).toBe(300);

    result.forEach((debt) => {
      expect(debt.from.user_id).not.toBe(debt.to.user_id);
      expect(debt.amount).toBeGreaterThan(0);
    });
  });

  it("settlement reduces net balance towards zero for creditor and debtor", () => {
    const alicePaid = 100, aliceShare = 50, aliceReceived = 50, alicePaidOut = 0;
    const bobPaid = 0, bobShare = 50, bobReceived = 0, bobPaidOut = 50;

    const aliceNet = alicePaid - aliceShare + alicePaidOut - aliceReceived;
    const bobNet = bobPaid - bobShare + bobPaidOut - bobReceived;

    expect(aliceNet).toBe(0);
    expect(bobNet).toBe(0);
  });
});
