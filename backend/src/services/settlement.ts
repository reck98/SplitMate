import { BalanceInfo, DetailedDebt, SimplifiedDebt } from "../types/index.js";

export function getDetailedDebts(
  members: Array<{ user_id: string; name: string }>,
  groupExpenses: any[],
  allParticipants: any[],
  groupSettlements: any[],
): {
  balances: BalanceInfo[];
  detailed_debts: DetailedDebt[];
  simplified_debts: SimplifiedDebt[];
} {
  const memberMap = new Map(members.map((m) => [m.user_id, m.name]));

  // Sort expenses ascending to apply settlements chronologically
  const sortedExpenses = [...groupExpenses].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  // Build raw detailed debts per expense
  const rawDebts: DetailedDebt[] = [];
  for (const exp of sortedExpenses) {
    const payerId = exp.paid_by;
    const payerName = memberMap.get(payerId) || "Unknown";
    const expParticipants = allParticipants.filter(
      (p) => p.expense_id === exp.id,
    );

    for (const p of expParticipants) {
      if (p.user_id !== payerId && p.share_amount > 0.01) {
        const debtorName = memberMap.get(p.user_id) || "Unknown";
        rawDebts.push({
          id: `${exp.id}_${p.user_id}`,
          expense_id: exp.id,
          description: exp.description,
          from: { user_id: p.user_id, name: debtorName },
          to: { user_id: payerId, name: payerName },
          amount: Math.round(p.share_amount * 100) / 100,
          original_amount: Math.round(p.share_amount * 100) / 100,
          created_at: exp.created_at,
        });
      }
    }
  }

  // Sort settlements ascending to apply chronologically
  const sortedSettlements = [...groupSettlements].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  for (const s of sortedSettlements) {
    let remaining = s.amount;
    for (const debt of rawDebts) {
      if (
        debt.from.user_id === s.payer_id &&
        debt.to.user_id === s.receiver_id &&
        debt.amount > 0.01
      ) {
        const applied = Math.min(remaining, debt.amount);
        debt.amount = Math.round((debt.amount - applied) * 100) / 100;
        remaining = Math.round((remaining - applied) * 100) / 100;
        if (remaining < 0.01) break;
      }
    }
  }

  // Active un-settled debts (descending by created_at so newest expenses show first in suggestions)
  const detailed_debts = rawDebts
    .filter((d) => d.amount > 0.01)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  // Compute member balances
  const balances: BalanceInfo[] = members.map((member) => {
    const lent = detailed_debts
      .filter((d) => d.to.user_id === member.user_id)
      .reduce((sum, d) => sum + d.amount, 0);

    const owed = detailed_debts
      .filter((d) => d.from.user_id === member.user_id)
      .reduce((sum, d) => sum + d.amount, 0);

    const paid = groupExpenses
      .filter((e) => e.paid_by === member.user_id)
      .reduce((sum, e) => sum + e.amount, 0);

    const share = allParticipants
      .filter((p) => p.user_id === member.user_id)
      .reduce((sum, p) => sum + p.share_amount, 0);

    const received = groupSettlements
      .filter((s) => s.receiver_id === member.user_id)
      .reduce((sum, s) => sum + s.amount, 0);

    const paidOut = groupSettlements
      .filter((s) => s.payer_id === member.user_id)
      .reduce((sum, s) => sum + s.amount, 0);

    const netBalance = Math.round((lent - owed) * 100) / 100;

    return {
      user_id: member.user_id,
      name: member.name,
      lent: Math.round(lent * 100) / 100,
      owed: Math.round(owed * 100) / 100,
      net_balance: netBalance,
      paid: Math.round(paid * 100) / 100,
      share: Math.round(share * 100) / 100,
      received: Math.round(received * 100) / 100,
      paid_out: Math.round(paidOut * 100) / 100,
    };
  });

  const simplified_debts = simplifyDebts(balances);

  return {
    balances,
    detailed_debts,
    simplified_debts,
  };
}

export function simplifyDebts(balances: BalanceInfo[]): SimplifiedDebt[] {
  const creditors = balances
    .filter((b) => b.net_balance > 0.01)
    .sort((a, b) => b.net_balance - a.net_balance)
    .map((b) => ({ ...b, net_balance: b.net_balance }));

  const debtors = balances
    .filter((b) => b.net_balance < -0.01)
    .sort((a, b) => a.net_balance - b.net_balance)
    .map((b) => ({ ...b, net_balance: Math.abs(b.net_balance) }));

  const debts: SimplifiedDebt[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const amount = Math.min(creditors[i].net_balance, debtors[j].net_balance);

    if (amount > 0.01) {
      debts.push({
        from: {
          user_id: debtors[j].user_id,
          name: debtors[j].name,
        },
        to: {
          user_id: creditors[i].user_id,
          name: creditors[i].name,
        },
        amount: Math.round(amount * 100) / 100,
      });
    }

    creditors[i].net_balance -= amount;
    debtors[j].net_balance -= amount;

    if (creditors[i].net_balance < 0.01) i++;
    if (debtors[j].net_balance < 0.01) j++;
  }

  return debts;
}
