import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { groups, groupMembers, users, expenses, expenseParticipants, settlements } from "../db/schema.js";
import { getBalances } from "./balance.js";
import { AppError } from "../middleware/error.js";

export interface GroupData {
  group: typeof groups.$inferSelect;
  members: Array<{
    user_id: string;
    name: string;
    email: string;
    avatar: string | null;
    upi_id: string | null;
    joined_at: string;
  }>;
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
    paid_by: string;
    paid_by_name: string;
    created_by: string;
    participants: Array<{
      user_id: string;
      share_amount: number;
    }>;
    created_at: string;
    updated_at: string;
  }>;
  balances: Array<{
    user_id: string;
    name: string;
    net_balance: number;
    paid: number;
    share: number;
    received: number;
    paid_out: number;
  }>;
  settlements: Array<{
    id: string;
    payer_id: string;
    payer_name: string;
    receiver_id: string;
    receiver_name: string;
    amount: number;
    created_at: string;
  }>;
  simplified_debts: Array<{
    from: { user_id: string; name: string };
    to: { user_id: string; name: string };
    amount: number;
  }>;
}

export async function getGroupData(groupId: string, currentUserId: string): Promise<GroupData> {
  const [groupResult, isMemberResult] = await Promise.all([
    db.select().from(groups).where(eq(groups.id, groupId)).limit(1),
    db.select().from(groupMembers).where(and(eq(groupMembers.group_id, groupId), eq(groupMembers.user_id, currentUserId))).limit(1),
  ]);

  const group = groupResult[0];
  if (!group) {
    throw new AppError(404, "GROUP_NOT_FOUND", "The requested group does not exist.");
  }

  if (isMemberResult.length === 0) {
    throw new AppError(403, "NOT_MEMBER", "You are not a member of this group.");
  }

  const [members, groupExpenses, groupSettlements] = await Promise.all([
    db
      .select({
        user_id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        upi_id: users.upi_id,
        joined_at: groupMembers.joined_at,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.user_id, users.id))
      .where(eq(groupMembers.group_id, groupId)),
    db
      .select()
      .from(expenses)
      .where(eq(expenses.group_id, groupId))
      .orderBy(expenses.created_at),
    db
      .select()
      .from(settlements)
      .where(eq(settlements.group_id, groupId))
      .orderBy(settlements.created_at),
  ]);

  const expenseIds = groupExpenses.map((e) => e.id);

  let allParticipants: Array<{
    expense_id: string;
    user_id: string;
    share_amount: number;
  }> = [];

  if (expenseIds.length > 0) {
    allParticipants = await db
      .select()
      .from(expenseParticipants)
      .where(inArray(expenseParticipants.expense_id, expenseIds));
  }

  const expenseData = groupExpenses.map((e) => ({
    id: e.id,
    description: e.description,
    amount: e.amount,
    paid_by: e.paid_by,
    paid_by_name: members.find((m) => m.user_id === e.paid_by)?.name || "Unknown",
    created_by: e.created_by,
    participants: allParticipants
      .filter((p) => p.expense_id === e.id)
      .map((p) => ({
        user_id: p.user_id,
        share_amount: p.share_amount,
      })),
    created_at: e.created_at,
    updated_at: e.updated_at,
  }));

  const settlementData = groupSettlements.map((s) => ({
    id: s.id,
    payer_id: s.payer_id,
    payer_name: members.find((m) => m.user_id === s.payer_id)?.name || "Unknown",
    receiver_id: s.receiver_id,
    receiver_name: members.find((m) => m.user_id === s.receiver_id)?.name || "Unknown",
    amount: s.amount,
    created_at: s.created_at,
  }));

  const { balances, simplified_debts } = await getBalances(groupId, {
    groupExpenses,
    allParticipants,
    groupSettlements,
  });

  const visibleExpenseData = expenseData.filter(
    (e) =>
      e.paid_by === currentUserId ||
      e.created_by === currentUserId ||
      e.participants.some((p) => p.user_id === currentUserId)
  );

  return {
    group,
    members,
    expenses: visibleExpenseData,
    balances,
    settlements: settlementData,
    simplified_debts,
  };
}
