import { describe, it, expect } from "vitest";
import { getGroupData } from "../services/group.js";
import { getDetailedDebts } from "../services/settlement.js";

describe("Multi-Payer & Contributor Strike-Through Detection Tests", () => {
  const members = [
    { user_id: "reck98", name: "reck98" },
    { user_id: "dev_proj", name: "Development Projects" },
    { user_id: "mocnygaz", name: "Mocnygaz" },
  ];

  it("detects single primary payer as paid and debtors as unpaid when no settlements exist", () => {
    const expenses = [
      {
        id: "exp_120",
        description: "Team Outing",
        amount: 120,
        paid_by: "reck98",
        created_at: "2026-07-29T10:00:00Z",
      },
    ];

    const participants = [
      { expense_id: "exp_120", user_id: "reck98", share_amount: 40 },
      { expense_id: "exp_120", user_id: "dev_proj", share_amount: 40 },
      { expense_id: "exp_120", user_id: "mocnygaz", share_amount: 40 },
    ];

    const { rawDebts } = getDetailedDebts(members, expenses, participants, []);

    // Compute contributor status as done in group.ts
    const exp = expenses[0];
    const expParticipants = participants.filter((p) => p.expense_id === exp.id);
    const paidUserIds: string[] = [exp.paid_by];

    const enriched = expParticipants.map((p) => {
      const isPrimaryPayer = p.user_id === exp.paid_by;
      let isPaid = isPrimaryPayer;
      if (!isPrimaryPayer) {
        const debt = rawDebts.find(
          (d) => d.expense_id === exp.id && d.debtor_id === p.user_id,
        );
        const remainingDebt = debt ? debt.amount : 0;
        isPaid = remainingDebt <= 0.01;
      }
      if (isPaid) paidUserIds.push(p.user_id);
      return { ...p, is_paid: isPaid };
    });

    const contributors = Array.from(new Set(paidUserIds));

    expect(contributors).toEqual(["reck98"]);
    expect(enriched.find((p) => p.user_id === "reck98")?.is_paid).toBe(true);
    expect(enriched.find((p) => p.user_id === "dev_proj")?.is_paid).toBe(false);
    expect(enriched.find((p) => p.user_id === "mocnygaz")?.is_paid).toBe(false);
  });

  it("marks both primary payer and settled debtor as paid contributors when a participant settles", () => {
    const expenses = [
      {
        id: "exp_120",
        description: "Team Outing",
        amount: 120,
        paid_by: "reck98",
        created_at: "2026-07-29T10:00:00Z",
      },
    ];

    const participants = [
      { expense_id: "exp_120", user_id: "reck98", share_amount: 40 },
      { expense_id: "exp_120", user_id: "dev_proj", share_amount: 40 },
      { expense_id: "exp_120", user_id: "mocnygaz", share_amount: 40 },
    ];

    // Development Projects settles ₹40 for exp_120
    const settlements = [
      {
        id: "s1",
        group_id: "g1",
        payer_id: "dev_proj",
        receiver_id: "reck98",
        amount: 40,
        expense_id: "exp_120",
        created_at: "2026-07-29T11:00:00Z",
      },
    ];

    const { rawDebts } = getDetailedDebts(
      members,
      expenses,
      participants,
      settlements,
    );

    const exp = expenses[0];
    const expParticipants = participants.filter((p) => p.expense_id === exp.id);
    const paidUserIds: string[] = [exp.paid_by];

    const enriched = expParticipants.map((p) => {
      const isPrimaryPayer = p.user_id === exp.paid_by;
      let isPaid = isPrimaryPayer;
      if (!isPrimaryPayer) {
        const debt = rawDebts.find(
          (d) => d.expense_id === exp.id && d.debtor_id === p.user_id,
        );
        const remainingDebt = debt ? debt.amount : 0;
        isPaid = remainingDebt <= 0.01;
      }
      if (isPaid) paidUserIds.push(p.user_id);
      return { ...p, is_paid: isPaid };
    });

    const contributors = Array.from(new Set(paidUserIds));

    // Both reck98 and Development Projects must be listed as paid contributors!
    expect(contributors).toEqual(["reck98", "dev_proj"]);
    expect(enriched.find((p) => p.user_id === "reck98")?.is_paid).toBe(true);
    expect(enriched.find((p) => p.user_id === "dev_proj")?.is_paid).toBe(true);
    expect(enriched.find((p) => p.user_id === "mocnygaz")?.is_paid).toBe(false);
  });

  it("marks all participants as paid contributors when everyone settles", () => {
    const expenses = [
      {
        id: "exp_120",
        description: "Team Outing",
        amount: 120,
        paid_by: "reck98",
        created_at: "2026-07-29T10:00:00Z",
      },
    ];

    const participants = [
      { expense_id: "exp_120", user_id: "reck98", share_amount: 40 },
      { expense_id: "exp_120", user_id: "dev_proj", share_amount: 40 },
      { expense_id: "exp_120", user_id: "mocnygaz", share_amount: 40 },
    ];

    // Both dev_proj and mocnygaz settle
    const settlements = [
      {
        id: "s1",
        group_id: "g1",
        payer_id: "dev_proj",
        receiver_id: "reck98",
        amount: 40,
        expense_id: "exp_120",
        created_at: "2026-07-29T11:00:00Z",
      },
      {
        id: "s2",
        group_id: "g1",
        payer_id: "mocnygaz",
        receiver_id: "reck98",
        amount: 40,
        expense_id: "exp_120",
        created_at: "2026-07-29T12:00:00Z",
      },
    ];

    const { rawDebts } = getDetailedDebts(
      members,
      expenses,
      participants,
      settlements,
    );

    const exp = expenses[0];
    const expParticipants = participants.filter((p) => p.expense_id === exp.id);
    const paidUserIds: string[] = [exp.paid_by];

    const enriched = expParticipants.map((p) => {
      const isPrimaryPayer = p.user_id === exp.paid_by;
      let isPaid = isPrimaryPayer;
      if (!isPrimaryPayer) {
        const debt = rawDebts.find(
          (d) => d.expense_id === exp.id && d.debtor_id === p.user_id,
        );
        const remainingDebt = debt ? debt.amount : 0;
        isPaid = remainingDebt <= 0.01;
      }
      if (isPaid) paidUserIds.push(p.user_id);
      return { ...p, is_paid: isPaid };
    });

    const contributors = Array.from(new Set(paidUserIds));

    // All three participants must be marked as paid contributors!
    expect(contributors).toEqual(["reck98", "dev_proj", "mocnygaz"]);
    expect(enriched.every((p) => p.is_paid)).toBe(true);
  });
});
