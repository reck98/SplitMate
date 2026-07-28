import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  firebase_uid: text("firebase_uid").unique().notNull(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  upi_id: text("upi_id"),
  is_profile_complete: integer("is_profile_complete", { mode: "boolean" })
    .notNull()
    .default(false),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const groups = sqliteTable(
  "groups",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    owner_id: text("owner_id")
      .notNull()
      .references(() => users.id),
    invite_code: text("invite_code").unique().notNull(),
    created_at: text("created_at").notNull(),
  },
  (table) => ({
    ownerIdx: index("idx_groups_owner_id").on(table.owner_id),
    inviteIdx: index("idx_groups_invite_code").on(table.invite_code),
  }),
);

export const groupMembers = sqliteTable(
  "group_members",
  {
    group_id: text("group_id")
      .notNull()
      .references(() => groups.id),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    joined_at: text("joined_at").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.group_id, table.user_id] }),
    groupIdx: index("idx_group_members_group_id").on(table.group_id),
    userIdx: index("idx_group_members_user_id").on(table.user_id),
  }),
);

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    group_id: text("group_id")
      .notNull()
      .references(() => groups.id),
    description: text("description").notNull(),
    amount: real("amount").notNull(),
    split_type: text("split_type").notNull().default("equal"),
    paid_by: text("paid_by")
      .notNull()
      .references(() => users.id),
    created_by: text("created_by")
      .notNull()
      .references(() => users.id),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (table) => ({
    groupIdx: index("idx_expenses_group_id").on(table.group_id),
    paidByIdx: index("idx_expenses_paid_by").on(table.paid_by),
  }),
);

export const expenseParticipants = sqliteTable(
  "expense_participants",
  {
    expense_id: text("expense_id")
      .notNull()
      .references(() => expenses.id),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    share_amount: real("share_amount").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.expense_id, table.user_id] }),
    expenseIdx: index("idx_expense_participants_expense_id").on(
      table.expense_id,
    ),
    userIdx: index("idx_expense_participants_user_id").on(table.user_id),
  }),
);

export const settlements = sqliteTable(
  "settlements",
  {
    id: text("id").primaryKey(),
    group_id: text("group_id")
      .notNull()
      .references(() => groups.id),
    payer_id: text("payer_id")
      .notNull()
      .references(() => users.id),
    receiver_id: text("receiver_id")
      .notNull()
      .references(() => users.id),
    amount: real("amount").notNull(),
    expense_id: text("expense_id").references(() => expenses.id),
    created_at: text("created_at").notNull(),
  },
  (table) => ({
    groupIdx: index("idx_settlements_group_id").on(table.group_id),
    payerIdx: index("idx_settlements_payer_id").on(table.payer_id),
    receiverIdx: index("idx_settlements_receiver_id").on(table.receiver_id),
    expenseIdx: index("idx_settlements_expense_id").on(table.expense_id),
  }),
);

export const expenseSettlements = sqliteTable(
  "expense_settlements",
  {
    id: text("id").primaryKey(),
    expense_id: text("expense_id")
      .notNull()
      .references(() => expenses.id),
    group_id: text("group_id")
      .notNull()
      .references(() => groups.id),
    payer_id: text("payer_id")
      .notNull()
      .references(() => users.id),
    debtor_id: text("debtor_id")
      .notNull()
      .references(() => users.id),
    amount: real("amount").notNull(),
    settled_amount: real("settled_amount").notNull().default(0),
    is_settled: integer("is_settled", { mode: "boolean" })
      .notNull()
      .default(false),
    created_at: text("created_at").notNull(),
  },
  (table) => ({
    groupIdx: index("idx_expense_settlements_group_id").on(table.group_id),
    expenseIdx: index("idx_expense_settlements_expense_id").on(
      table.expense_id,
    ),
    payerIdx: index("idx_expense_settlements_payer_id").on(table.payer_id),
    debtorIdx: index("idx_expense_settlements_debtor_id").on(table.debtor_id),
  }),
);

