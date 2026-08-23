CREATE TABLE `personal_bills` (
	`id` text PRIMARY KEY NOT NULL,
	`user_key` text NOT NULL,
	`name` text NOT NULL,
	`provider` text DEFAULT '' NOT NULL,
	`account_number` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'Diğer' NOT NULL,
	`amount` integer NOT NULL,
	`due_date` text NOT NULL,
	`recurrence` text DEFAULT 'monthly' NOT NULL,
	`auto_pay` integer DEFAULT false NOT NULL,
	`credit_card_id` text DEFAULT '' NOT NULL,
	`reminder_days` integer DEFAULT 3 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`last_paid_at` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `personal_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_key` text NOT NULL,
	`month` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `personal_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_key` text NOT NULL,
	`title` text NOT NULL,
	`merchant` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'Diğer' NOT NULL,
	`scope` text DEFAULT 'personal' NOT NULL,
	`amount` integer NOT NULL,
	`payment_method` text NOT NULL,
	`credit_card_id` text DEFAULT '' NOT NULL,
	`installment_count` integer DEFAULT 1 NOT NULL,
	`spent_at` text NOT NULL,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`source_id` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `personal_reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_key` text NOT NULL,
	`title` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`due_at` text DEFAULT '' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`related_type` text DEFAULT '' NOT NULL,
	`related_id` text DEFAULT '' NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`calendar_added` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `personal_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_key` text NOT NULL,
	`service_name` text NOT NULL,
	`category` text DEFAULT 'Dijital' NOT NULL,
	`amount` integer NOT NULL,
	`billing_cycle` text DEFAULT 'monthly' NOT NULL,
	`next_payment_date` text NOT NULL,
	`credit_card_id` text DEFAULT '' NOT NULL,
	`auto_renew` integer DEFAULT true NOT NULL,
	`reminder_days` integer DEFAULT 3 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`trial_end_date` text DEFAULT '' NOT NULL,
	`manage_url` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `module_version` integer DEFAULT 2 NOT NULL;