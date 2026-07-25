import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  firebase_uid: text("firebase_uid").unique().notNull(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  upi_id: text("upi_id"),
  is_profile_complete: integer("is_profile_complete", { mode: "boolean" }).notNull().default(false),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  owner_id: text("owner_id").notNull().references(() => users.id),
  invite_code: text("invite_code").unique().notNull(),
  created_at: text("created_at").notNull(),
});

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
  })
);

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  group_id: text("group_id")
    .notNull()
    .references(() => groups.id),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  paid_by: text("paid_by")
    .notNull()
    .references(() => users.id),
  created_by: text("created_by")
    .notNull()
    .references(() => users.id),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

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
  })
);

export const settlements = sqliteTable("settlements", {
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
  created_at: text("created_at").notNull(),
});
