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
  rawDebts: DetailedDebt[];
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
    (a, b) => parseTime(a?.created_at) - parseTime(b?.created_at),
  );

  // Build raw detailed debts per expense
  const rawDebts: DetailedDebt[] = [];
  for (const exp of sortedExpenses) {
    if (!exp) continue;
    const payerId = exp.paid_by;
    const payerName = memberMap.get(payerId) || "Unknown";
    const expParticipants = allParticipants.filter(
      (p) => p && p.expense_id === exp.id,
    );

    for (const p of expParticipants) {
      if (p && p.user_id !== payerId && p.share_amount > 0.01) {
        const debtorName = memberMap.get(p.user_id) || "Unknown";
        const amt = Math.round(p.share_amount * 100) / 100;
        const timeStr = exp.created_at || new Date().toISOString();
        rawDebts.push({
          id: `${exp.id}_${p.user_id}`,
          expenseId: exp.id,
          expense_id: exp.id,
          expenseTitle: exp.description || "",
          description: exp.description || "",
          payerId,
          payer_id: payerId,
          payerName,
          payer_name: payerName,
          debtorId: p.user_id,
          debtor_id: p.user_id,
          debtorName,
          debtor_name: debtorName,
          from: { user_id: p.user_id, name: debtorName },
          to: { user_id: payerId, name: payerName },
          amount: amt,
          originalAmount: amt,
          original_amount: amt,
          createdAt: timeStr,
          created_at: timeStr,
        });
      }
    }
  }

  // Sort settlements ascending to apply chronologically
  const sortedSettlements = [...groupSettlements].sort(
    (a, b) => parseTime(a?.created_at) - parseTime(b?.created_at),
  );

  for (const s of sortedSettlements) {
    if (!s || !s.amount) continue;
    let remaining = s.amount;

    // First try targeted settlement by expense_id if provided
    if (s.expense_id) {
      const targetDebt = rawDebts.find(
        (debt) =>
          debt.expense_id === s.expense_id &&
          debt.debtor_id === s.payer_id &&
          debt.payer_id === s.receiver_id &&
          debt.amount > 0.01,
      );
      if (targetDebt) {
        const applied = Math.min(remaining, targetDebt.amount);
        targetDebt.amount = Math.round((targetDebt.amount - applied) * 100) / 100;
        remaining = Math.round((remaining - applied) * 100) / 100;
      }
    }

    // Apply any remaining settlement amount to un-settled debts between debtor and creditor
    if (remaining > 0.01) {
      for (const debt of rawDebts) {
        if (
          debt &&
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
  }

  // Active un-settled debts (descending by created_at so newest expenses show first)
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

  // Debt simplification is disabled: return raw obligations directly
  const simplified_debts = detailed_debts;

  return {
    balances,
    detailed_debts,
    simplified_debts,
    rawDebts,
  };
}

// Deprecated: simplification disabled. Returns empty or unchanged.
export function simplifyDebts(balances: BalanceInfo[]): SimplifiedDebt[] {
  return [];
}

