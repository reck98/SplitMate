import { db } from "../db/index.js";
import { expenses, expenseParticipants, settlements, users, groupMembers } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { BalanceInfo, SimplifiedDebt } from "../types/index.js";
import { simplifyDebts } from "./settlement.js";

export async function getBalances(
  groupId: string
): Promise<{ balances: BalanceInfo[]; simplified_debts: SimplifiedDebt[] }>;
export async function getBalances(
  groupId: string,
  preFetched: {
    groupExpenses: any[];
    allParticipants: any[];
    groupSettlements: any[];
  }
): Promise<{ balances: BalanceInfo[]; simplified_debts: SimplifiedDebt[] }>;
export async function getBalances(
  groupId: string,
  preFetched?: {
    groupExpenses: any[];
    allParticipants: any[];
    groupSettlements: any[];
  }
): Promise<{ balances: BalanceInfo[]; simplified_debts: SimplifiedDebt[] }> {
  const members = await db
    .select({
      user_id: groupMembers.user_id,
      name: users.name,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.user_id, users.id))
    .where(eq(groupMembers.group_id, groupId));

  const groupExpenses = preFetched?.groupExpenses ?? await db
    .select()
    .from(expenses)
    .where(eq(expenses.group_id, groupId));

  const expenseIds = groupExpenses.map((e: any) => e.id);

  let allParticipants: Array<{ expense_id: string; user_id: string; share_amount: number }> =
    preFetched?.allParticipants ?? [];

  if (!preFetched && expenseIds.length > 0) {
    allParticipants = await db
      .select()
      .from(expenseParticipants)
      .where(inArray(expenseParticipants.expense_id, expenseIds));
  }

  const groupSettlements = preFetched?.groupSettlements ?? await db
    .select()
    .from(settlements)
    .where(eq(settlements.group_id, groupId));

  const balances: BalanceInfo[] = members.map((member) => {
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

    const netBalance = paid - share + paidOut - received;

    return {
      user_id: member.user_id,
      name: member.name,
      net_balance: Math.round(netBalance * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      share: Math.round(share * 100) / 100,
      received: Math.round(received * 100) / 100,
      paid_out: Math.round(paidOut * 100) / 100,
    };
  });

  const simplified_debts = simplifyDebts(balances);

  return { balances, simplified_debts };
}


