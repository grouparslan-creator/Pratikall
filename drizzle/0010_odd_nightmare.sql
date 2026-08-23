ALTER TABLE `account_notifications` ADD `owner_key` text DEFAULT 'site-owner' NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `owner_key` text DEFAULT 'site-owner' NOT NULL;--> statement-breakpoint
ALTER TABLE `credit_cards` ADD `owner_key` text DEFAULT 'site-owner' NOT NULL;--> statement-breakpoint
ALTER TABLE `finance_payments` ADD `owner_key` text DEFAULT 'site-owner' NOT NULL;--> statement-breakpoint
ALTER TABLE `loans` ADD `owner_key` text DEFAULT 'site-owner' NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `owner_key` text DEFAULT 'site-owner' NOT NULL;