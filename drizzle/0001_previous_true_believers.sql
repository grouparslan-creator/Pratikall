CREATE TABLE `credit_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`bank` text NOT NULL,
	`card_name` text NOT NULL,
	`last_four` text DEFAULT '' NOT NULL,
	`card_limit` integer DEFAULT 0 NOT NULL,
	`current_debt` integer NOT NULL,
	`minimum_payment` integer DEFAULT 0 NOT NULL,
	`statement_date` text NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `finance_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`amount` integer NOT NULL,
	`paid_at` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `loans` (
	`id` text PRIMARY KEY NOT NULL,
	`bank` text NOT NULL,
	`loan_name` text NOT NULL,
	`original_amount` integer NOT NULL,
	`remaining_debt` integer NOT NULL,
	`installment_amount` integer NOT NULL,
	`total_installments` integer NOT NULL,
	`remaining_installments` integer NOT NULL,
	`next_payment_date` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
