import { BalanceInfo, SimplifiedDebt } from "../types/index.js";

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
