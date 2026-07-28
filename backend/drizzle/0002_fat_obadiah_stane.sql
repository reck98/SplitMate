ALTER TABLE `expenses` ADD `split_type` text DEFAULT 'equal' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_expense_participants_user_id` ON `expense_participants` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_groups_owner_id` ON `groups` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_groups_invite_code` ON `groups` (`invite_code`);