CREATE INDEX `idx_group_members_user_id` ON `group_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_group_members_group_id` ON `group_members` (`group_id`);--> statement-breakpoint
CREATE INDEX `idx_expenses_group_id` ON `expenses` (`group_id`);--> statement-breakpoint
CREATE INDEX `idx_expenses_paid_by` ON `expenses` (`paid_by`);--> statement-breakpoint
CREATE INDEX `idx_expense_participants_expense_id` ON `expense_participants` (`expense_id`);--> statement-breakpoint
CREATE INDEX `idx_settlements_group_id` ON `settlements` (`group_id`);--> statement-breakpoint
CREATE INDEX `idx_settlements_payer_id` ON `settlements` (`payer_id`);--> statement-breakpoint
CREATE INDEX `idx_settlements_receiver_id` ON `settlements` (`receiver_id`);
