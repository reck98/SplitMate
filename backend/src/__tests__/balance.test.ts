import { describe, it, expect } from "vitest";
import { getDetailedDebts } from "../services/settlement.js";

describe("getDetailedDebts without Debt Simplification", () => {
  const members = [
    { user_id: "A", name: "Alice" },
    { user_id: "B", name: "Bob" },
    { user_id: "C", name: "Charlie" },
  ];

  it("preserves individual obligations for multiple expenses with the same payer without merging", () => {
    const expenses = [
      {
        id: "e1",
        description: "Dinner",
        amount: 300,
        paid_by: "A",
        created_at: "2026-07-26T01:00:00Z",
      },
      {
        id: "e2",
        description: "Snacks",
        amount: 120,
        paid_by: "A",
        created_at: "2026-07-26T02:00:00Z",
      },
    ];

    const participants = [
      { expense_id: "e1", user_id: "A", share_amount: 100 },
      { expense_id: "e1", user_id: "B", share_amount: 100 },
      { expense_id: "e1", user_id: "C", share_amount: 100 },
      { expense_id: "e2", user_id: "A", share_amount: 60 },
      { expense_id: "e2", user_id: "B", share_amount: 60 },
    ];

    const { detailed_debts } = getDetailedDebts(
      members,
      expenses,
      participants,
      [],
    );

    expect(detailed_debts).toHaveLength(3);

    // Verify metadata fields on each record
    detailed_debts.forEach((debt) => {
      expect(debt).toHaveProperty("expenseId");
      expect(debt).toHaveProperty("expenseTitle");
      expect(debt).toHaveProperty("payerId");
      expect(debt).toHaveProperty("payerName");
      expect(debt).toHaveProperty("debtorId");
      expect(debt).toHaveProperty("debtorName");
      expect(debt).toHaveProperty("amount");
      expect(debt).toHaveProperty("createdAt");
    });

    const bDinner = detailed_debts.find(
      (d) => d.expense_id === "e1" && d.debtor_id === "B" && d.payer_id === "A",
    );
    expect(bDinner).toBeDefined();
    expect(bDinner!.amount).toBe(100);
    expect(bDinner!.expenseTitle).toBe("Dinner");

    const cDinner = detailed_debts.find(
      (d) => d.expense_id === "e1" && d.debtor_id === "C" && d.payer_id === "A",
    );
    expect(cDinner).toBeDefined();
    expect(cDinner!.amount).toBe(100);

    const bSnacks = detailed_debts.find(
      (d) => d.expense_id === "e2" && d.debtor_id === "B" && d.payer_id === "A",
    );
    expect(bSnacks).toBeDefined();
    expect(bSnacks!.amount).toBe(60);
    expect(bSnacks!.expenseTitle).toBe("Snacks");
  });

  it("preserves separate obligations for multiple expenses with different payers without graph rerouting", () => {
    const expenses = [
      {
        id: "e1",
        description: "Dinner",
        amount: 300,
        paid_by: "A",
        created_at: "2026-07-26T01:00:00Z",
      },
      {
        id: "e2",
        description: "Cab",
        amount: 200,
        paid_by: "B",
        created_at: "2026-07-26T02:00:00Z",
      },
    ];

    const participants = [
      { expense_id: "e1", user_id: "A", share_amount: 100 },
      { expense_id: "e1", user_id: "B", share_amount: 100 },
      { expense_id: "e1", user_id: "C", share_amount: 100 },
      { expense_id: "e2", user_id: "B", share_amount: 100 },
      { expense_id: "e2", user_id: "C", share_amount: 100 },
    ];

    const { detailed_debts, simplified_debts } = getDetailedDebts(
      members,
      expenses,
      participants,
      [],
    );

    // Should return exactly 3 independent debts: B->A ₹100, C->A ₹100, C->B ₹100
    expect(detailed_debts).toHaveLength(3);
    expect(simplified_debts).toHaveLength(3);

    const bOwesA = detailed_debts.find(
      (d) => d.debtor_id === "B" && d.payer_id === "A",
    );
    const cOwesA = detailed_debts.find(
      (d) => d.expense_id === "e1" && d.debtor_id === "C" && d.payer_id === "A",
    );
    const cOwesB = detailed_debts.find(
      (d) => d.expense_id === "e2" && d.debtor_id === "C" && d.payer_id === "B",
    );

    expect(bOwesA!.amount).toBe(100);
    expect(cOwesA!.amount).toBe(100);
    expect(cOwesB!.amount).toBe(100);
  });

  it("preserves circular debts without cancelling them out", () => {
    const expenses = [
      {
        id: "e1",
        description: "A for B",
        amount: 100,
        paid_by: "A",
        created_at: "2026-07-26T01:00:00Z",
      },
      {
        id: "e2",
        description: "B for C",
        amount: 100,
        paid_by: "B",
        created_at: "2026-07-26T02:00:00Z",
      },
      {
        id: "e3",
        description: "C for A",
        amount: 100,
        paid_by: "C",
        created_at: "2026-07-26T03:00:00Z",
      },
    ];

    const participants = [
      { expense_id: "e1", user_id: "B", share_amount: 100 },
      { expense_id: "e2", user_id: "C", share_amount: 100 },
      { expense_id: "e3", user_id: "A", share_amount: 100 },
    ];

    const { detailed_debts } = getDetailedDebts(
      members,
      expenses,
      participants,
      [],
    );

    // Circular debt (A->B 100, B->C 100, C->A 100) must remain as 3 separate obligations!
    expect(detailed_debts).toHaveLength(3);
    const bOwesA = detailed_debts.find(
      (d) => d.debtor_id === "B" && d.payer_id === "A",
    );
    const cOwesB = detailed_debts.find(
      (d) => d.debtor_id === "C" && d.payer_id === "B",
    );
    const aOwesC = detailed_debts.find(
      (d) => d.debtor_id === "A" && d.payer_id === "C",
    );

    expect(bOwesA!.amount).toBe(100);
    expect(cOwesB!.amount).toBe(100);
    expect(aOwesC!.amount).toBe(100);
  });

  it("handles custom split accurately", () => {
    const expenses = [
      {
        id: "e1",
        description: "Custom Feast",
        amount: 600,
        paid_by: "A",
        created_at: "2026-07-26T01:00:00Z",
      },
    ];

    const participants = [
      { expense_id: "e1", user_id: "A", share_amount: 100 },
      { expense_id: "e1", user_id: "B", share_amount: 200 },
      { expense_id: "e1", user_id: "C", share_amount: 300 },
    ];

    const { detailed_debts } = getDetailedDebts(
      members,
      expenses,
      participants,
      [],
    );

    expect(detailed_debts).toHaveLength(2);
    const bOwesA = detailed_debts.find(
      (d) => d.debtor_id === "B" && d.payer_id === "A",
    );
    const cOwesA = detailed_debts.find(
      (d) => d.debtor_id === "C" && d.payer_id === "A",
    );

    expect(bOwesA!.amount).toBe(200);
    expect(cOwesA!.amount).toBe(300);
  });

  it("only marks the target obligation as settled when debtor settles", () => {
    const expenses = [
      {
        id: "e1",
        description: "Dinner",
        amount: 200,
        paid_by: "A",
        created_at: "2026-07-26T01:00:00Z",
      },
      {
        id: "e2",
        description: "Cab",
        amount: 100,
        paid_by: "A",
        created_at: "2026-07-26T02:00:00Z",
      },
      {
        id: "e3",
        description: "Hotel",
        amount: 150,
        paid_by: "A",
        created_at: "2026-07-26T03:00:00Z",
      },
    ];

    const participants = [
      { expense_id: "e1", user_id: "B", share_amount: 200 },
      { expense_id: "e2", user_id: "B", share_amount: 100 },
      { expense_id: "e3", user_id: "C", share_amount: 150 },
    ];

    // B settles ₹100 specifically for Cab (e2)
    const settlements = [
      {
        id: "s1",
        payer_id: "B",
        receiver_id: "A",
        amount: 100,
        expense_id: "e2",
        created_at: "2026-07-26T04:00:00Z",
      },
    ];

    const { detailed_debts } = getDetailedDebts(
      members,
      expenses,
      participants,
      settlements,
    );

    // Cab (e2) is settled and excluded; Dinner (e1 ₹200) and Hotel (e3 ₹150) remain active
    expect(detailed_debts).toHaveLength(2);

    const bDinner = detailed_debts.find((d) => d.expense_id === "e1");
    expect(bDinner).toBeDefined();
    expect(bDinner!.amount).toBe(200);

    const cHotel = detailed_debts.find((d) => d.expense_id === "e3");
    expect(cHotel).toBeDefined();
    expect(cHotel!.amount).toBe(150);

    const bCab = detailed_debts.find((d) => d.expense_id === "e2");
    expect(bCab).toBeUndefined();
  });
});
