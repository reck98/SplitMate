import { describe, it, expect } from "vitest";

interface DebtItem {
  id: string;
  expenseId: string;
  expenseTitle: string;
  debtorId: string;
  payerId: string;
  debtorName: string;
  payerName: string;
  amount: number;
  createdAt: string;
}

export function groupDebtsByCounterparty(
  debts: DebtItem[],
  currentUserId: string,
) {
  const userDebts = debts.filter(
    (d) => d.debtorId === currentUserId || d.payerId === currentUserId,
  );

  const groupMap = new Map<
    string,
    {
      counterpartyId: string;
      counterpartyName: string;
      items: DebtItem[];
      totalOwedByUser: number;
      totalOwedToUser: number;
      netAmount: number;
    }
  >();

  for (const d of userDebts) {
    const isDebtor = d.debtorId === currentUserId;
    const counterpartyId = isDebtor ? d.payerId : d.debtorId;
    const counterpartyName = isDebtor ? d.payerName : d.debtorName;

    if (!groupMap.has(counterpartyId)) {
      groupMap.set(counterpartyId, {
        counterpartyId,
        counterpartyName,
        items: [],
        totalOwedByUser: 0,
        totalOwedToUser: 0,
        netAmount: 0,
      });
    }

    const group = groupMap.get(counterpartyId)!;
    group.items.push(d);

    if (isDebtor) {
      group.totalOwedByUser =
        Math.round((group.totalOwedByUser + d.amount) * 100) / 100;
    } else {
      group.totalOwedToUser =
        Math.round((group.totalOwedToUser + d.amount) * 100) / 100;
    }
    group.netAmount =
      Math.round((group.totalOwedByUser - group.totalOwedToUser) * 100) / 100;
  }

  return Array.from(groupMap.values());
}

describe("Counterparty Debt Grouping Unit Tests", () => {
  it("groups multiple expenses under the same counterparty preserving line items", () => {
    const debts: DebtItem[] = [
      {
        id: "d1",
        expenseId: "e1",
        expenseTitle: "Tea RD",
        debtorId: "user1",
        payerId: "akash",
        debtorName: "User 1",
        payerName: "Akash Singh",
        amount: 10,
        createdAt: "2026-07-29T10:00:00Z",
      },
      {
        id: "d2",
        expenseId: "e2",
        expenseTitle: "Lunch",
        debtorId: "user1",
        payerId: "akash",
        debtorName: "User 1",
        payerName: "Akash Singh",
        amount: 40,
        createdAt: "2026-07-29T11:00:00Z",
      },
      {
        id: "d3",
        expenseId: "e3",
        expenseTitle: "Snacks",
        debtorId: "user1",
        payerId: "akash",
        debtorName: "User 1",
        payerName: "Akash Singh",
        amount: 20,
        createdAt: "2026-07-29T12:00:00Z",
      },
    ];

    const groups = groupDebtsByCounterparty(debts, "user1");

    expect(groups).toHaveLength(1);
    expect(groups[0].counterpartyName).toBe("Akash Singh");
    expect(groups[0].items).toHaveLength(3);
    expect(groups[0].totalOwedByUser).toBe(70);
    expect(groups[0].netAmount).toBe(70);
    expect(groups[0].items.map((i) => i.expenseTitle)).toEqual([
      "Tea RD",
      "Lunch",
      "Snacks",
    ]);
  });

  it("separates debts for multiple counterparties cleanly", () => {
    const debts: DebtItem[] = [
      {
        id: "d1",
        expenseId: "e1",
        expenseTitle: "Tea",
        debtorId: "user1",
        payerId: "akash",
        debtorName: "User 1",
        payerName: "Akash Singh",
        amount: 10,
        createdAt: "2026-07-29T10:00:00Z",
      },
      {
        id: "d2",
        expenseId: "e2",
        expenseTitle: "Coffee",
        debtorId: "user1",
        payerId: "aanid",
        debtorName: "User 1",
        payerName: "Aanid A Daz",
        amount: 15,
        createdAt: "2026-07-29T11:00:00Z",
      },
      {
        id: "d3",
        expenseId: "e3",
        expenseTitle: "Cab",
        debtorId: "user1",
        payerId: "aanid",
        debtorName: "User 1",
        payerName: "Aanid A Daz",
        amount: 25,
        createdAt: "2026-07-29T12:00:00Z",
      },
    ];

    const groups = groupDebtsByCounterparty(debts, "user1");

    expect(groups).toHaveLength(2);
    const akashGroup = groups.find((g) => g.counterpartyId === "akash");
    const aanidGroup = groups.find((g) => g.counterpartyId === "aanid");

    expect(akashGroup?.totalOwedByUser).toBe(10);
    expect(aanidGroup?.totalOwedByUser).toBe(40);
    expect(aanidGroup?.items).toHaveLength(2);
  });
});
