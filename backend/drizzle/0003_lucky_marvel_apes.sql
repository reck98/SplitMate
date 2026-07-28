CREATE TABLE `expense_settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`group_id` text NOT NULL,
	`payer_id` text NOT NULL,
	`debtor_id` text NOT NULL,
	`amount` real NOT NULL,
	`settled_amount` real DEFAULT 0 NOT NULL,
	`is_settled` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`debtor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `settlements` ADD `expense_id` text REFERENCES expenses(id);--> statement-breakpoint
CREATE INDEX `idx_expense_settlements_group_id` ON `expense_settlements` (`group_id`);--> statement-breakpoint
CREATE INDEX `idx_expense_settlements_expense_id` ON `expense_settlements` (`expense_id`);--> statement-breakpoint
CREATE INDEX `idx_expense_settlements_payer_id` ON `expense_settlements` (`payer_id`);--> statement-breakpoint
CREATE INDEX `idx_expense_settlements_debtor_id` ON `expense_settlements` (`debtor_id`);--> statement-breakpoint
CREATE INDEX `idx_settlements_expense_id` ON `settlements` (`expense_id`);