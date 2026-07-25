import { db } from "../db/index.js";
import { expenses, expenseParticipants, settlements, users, groupMembers } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { BalanceInfo, SimplifiedDebt } from "../types/index.js";
import { getDetailedDebts } from "./settlement.js";

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

  const { balances, simplified_debts } = getDetailedDebts(
    members,
    groupExpenses,
    allParticipants,
    groupSettlements
  );

  return { balances, simplified_debts };
}


