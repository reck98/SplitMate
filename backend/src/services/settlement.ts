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

  // Helper for safe timestamp comparison
  const parseTime = (dateStr: any): number => {
    if (!dateStr) return 0;
    const t = new Date(dateStr).getTime();
    return isNaN(t) ? 0 : t;
  };

  // Sort expenses ascending to apply settlements chronologically
  const sortedExpenses = [...groupExpenses].sort(
    (a, b) => parseTime(a?.created_at) - parseTime(b?.created_at)
  );

  // Build raw detailed debts per expense
  const rawDebts: DetailedDebt[] = [];
  for (const exp of sortedExpenses) {
    if (!exp) continue;
    const payerId = exp.paid_by;
    const payerName = memberMap.get(payerId) || "Unknown";
    const expParticipants = allParticipants.filter(
      (p) => p && p.expense_id === exp.id
    );

    for (const p of expParticipants) {
      if (p && p.user_id !== payerId && p.share_amount > 0.01) {
        const debtorName = memberMap.get(p.user_id) || "Unknown";
        rawDebts.push({
          id: `${exp.id}_${p.user_id}`,
          expense_id: exp.id,
          description: exp.description || "",
          from: { user_id: p.user_id, name: debtorName },
          to: { user_id: payerId, name: payerName },
          amount: Math.round(p.share_amount * 100) / 100,
          original_amount: Math.round(p.share_amount * 100) / 100,
          created_at: exp.created_at || new Date().toISOString(),
        });
      }
    }
  }

  // Sort settlements ascending to apply chronologically
  const sortedSettlements = [...groupSettlements].sort(
    (a, b) => parseTime(a?.created_at) - parseTime(b?.created_at)
  );

  for (const s of sortedSettlements) {
    if (!s || !s.amount) continue;
    let remaining = s.amount;
    for (const debt of rawDebts) {
      if (
        debt &&
        debt.from &&
        debt.to &&
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
    .filter((d) => d && d.amount > 0.01)
    .sort((a, b) => parseTime(b?.created_at) - parseTime(a?.created_at));

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
  if (!balances || balances.length === 0) return [];

  const creditors = balances
    .filter((b) => b && b.net_balance > 0.009)
    .sort((a, b) => b.net_balance - a.net_balance)
    .map((b) => ({
      user_id: b.user_id,
      name: b.name,
      net_balance: Math.round(b.net_balance * 100) / 100,
    }));

  const debtors = balances
    .filter((b) => b && b.net_balance < -0.009)
    .sort((a, b) => a.net_balance - b.net_balance)
    .map((b) => ({
      user_id: b.user_id,
      name: b.name,
      net_balance: Math.round(Math.abs(b.net_balance) * 100) / 100,
    }));

  const debts: SimplifiedDebt[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    if (!creditor || creditor.net_balance <= 0.009) {
      i++;
      continue;
    }
    if (!debtor || debtor.net_balance <= 0.009) {
      j++;
      continue;
    }

    const amount = Math.min(creditor.net_balance, debtor.net_balance);
    const roundedAmount = Math.round(amount * 100) / 100;

    if (roundedAmount >= 0.01) {
      debts.push({
        from: {
          user_id: debtor.user_id,
          name: debtor.name || "Unknown",
        },
        to: {
          user_id: creditor.user_id,
          name: creditor.name || "Unknown",
        },
        amount: roundedAmount,
      });
    }

    creditor.net_balance = Math.round((creditor.net_balance - amount) * 100) / 100;
    debtor.net_balance = Math.round((debtor.net_balance - amount) * 100) / 100;

    if (creditor.net_balance <= 0.009) i++;
    if (debtor.net_balance <= 0.009) j++;
  }

  return debts;
}
