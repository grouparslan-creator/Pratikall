import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const analyticsDaily = sqliteTable("analytics_daily", {
  date: text("date").primaryKey(),
  pageViews: integer("page_views").notNull().default(0),
  uniqueVisitors: integer("unique_visitors").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const analyticsUniqueVisitors = sqliteTable(
  "analytics_unique_visitors",
  {
    date: text("date").notNull(),
    visitorHash: text("visitor_hash").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("analytics_unique_date_hash_unique").on(table.date, table.visitorHash),
    index("analytics_unique_date_idx").on(table.date),
    index("analytics_unique_hash_idx").on(table.visitorHash),
  ]
);

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  ownerKey: text("owner_key").notNull().default("site-owner"),
  company: text("company").notNull().default(""),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  originalAmount: integer("original_amount").notNull(),
  plannedPaymentMethod: text("planned_payment_method").notNull(),
  dueDate: text("due_date").notNull(),
  note: text("note").notNull().default(""),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  ownerKey: text("owner_key").notNull().default("site-owner"),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  paidAt: text("paid_at").notNull(),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const accountNotifications = sqliteTable("account_notifications", {
  id: text("id").primaryKey(),
  ownerKey: text("owner_key").notNull().default("site-owner"),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  channels: text("channels").notNull(),
  recipientPhone: text("recipient_phone").notNull().default(""),
  recipientEmail: text("recipient_email").notNull().default(""),
  message: text("message").notNull(),
  deliveryMode: text("delivery_mode").notNull().default("device"),
  status: text("status").notNull().default("prepared"),
  providerResult: text("provider_result").notNull().default(""),
  errorMessage: text("error_message").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userPreferences = sqliteTable("user_preferences", {
  userKey: text("user_key").primaryKey(),
  ownerName: text("owner_name").notNull(),
  appName: text("app_name").notNull(),
  companyName: text("company_name").notNull().default(""),
  theme: text("theme").notNull().default("red"),
  enabledModules: text("enabled_modules")
    .notNull()
    .default("overview,accounts,cards,loans,calendar,reports"),
  defaultReminderDays: integer("default_reminder_days").notNull().default(3),
  logoKey: text("logo_key").notNull().default(""),
  useDefaultLogo: integer("use_default_logo", { mode: "boolean" })
    .notNull()
    .default(true),
  emailSenderName: text("email_sender_name").notNull().default(""),
  emailReplyTo: text("email_reply_to").notNull().default(""),
  emailSignature: text("email_signature").notNull().default(""),
  moduleVersion: integer("module_version").notNull().default(2),
  setupCompleted: integer("setup_completed", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const creditCards = sqliteTable("credit_cards", {
  id: text("id").primaryKey(),
  ownerKey: text("owner_key").notNull().default("site-owner"),
  bank: text("bank").notNull(),
  cardName: text("card_name").notNull(),
  lastFour: text("last_four").notNull().default(""),
  cardLimit: integer("card_limit").notNull().default(0),
  currentDebt: integer("current_debt").notNull(),
  minimumPayment: integer("minimum_payment").notNull().default(0),
  statementDate: text("statement_date").notNull(),
  dueDate: text("due_date").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const loans = sqliteTable("loans", {
  id: text("id").primaryKey(),
  ownerKey: text("owner_key").notNull().default("site-owner"),
  bank: text("bank").notNull(),
  loanName: text("loan_name").notNull(),
  originalAmount: integer("original_amount").notNull(),
  remainingDebt: integer("remaining_debt").notNull(),
  installmentAmount: integer("installment_amount").notNull(),
  totalInstallments: integer("total_installments").notNull(),
  remainingInstallments: integer("remaining_installments").notNull(),
  nextPaymentDate: text("next_payment_date").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const financePayments = sqliteTable("finance_payments", {
  id: text("id").primaryKey(),
  ownerKey: text("owner_key").notNull().default("site-owner"),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  amount: integer("amount").notNull(),
  paidAt: text("paid_at").notNull(),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const personalExpenses = sqliteTable("personal_expenses", {
  id: text("id").primaryKey(),
  userKey: text("user_key").notNull(),
  title: text("title").notNull(),
  merchant: text("merchant").notNull().default(""),
  category: text("category").notNull().default("Diğer"),
  scope: text("scope").notNull().default("personal"),
  amount: integer("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  creditCardId: text("credit_card_id").notNull().default(""),
  installmentCount: integer("installment_count").notNull().default(1),
  spentAt: text("spent_at").notNull(),
  sourceType: text("source_type").notNull().default("manual"),
  sourceId: text("source_id").notNull().default(""),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const personalBills = sqliteTable("personal_bills", {
  id: text("id").primaryKey(),
  userKey: text("user_key").notNull(),
  name: text("name").notNull(),
  provider: text("provider").notNull().default(""),
  accountNumber: text("account_number").notNull().default(""),
  category: text("category").notNull().default("Diğer"),
  amount: integer("amount").notNull(),
  dueDate: text("due_date").notNull(),
  recurrence: text("recurrence").notNull().default("monthly"),
  autoPay: integer("auto_pay", { mode: "boolean" }).notNull().default(false),
  creditCardId: text("credit_card_id").notNull().default(""),
  reminderDays: integer("reminder_days").notNull().default(3),
  status: text("status").notNull().default("open"),
  lastPaidAt: text("last_paid_at").notNull().default(""),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const personalSubscriptions = sqliteTable("personal_subscriptions", {
  id: text("id").primaryKey(),
  userKey: text("user_key").notNull(),
  serviceName: text("service_name").notNull(),
  category: text("category").notNull().default("Dijital"),
  amount: integer("amount").notNull(),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  nextPaymentDate: text("next_payment_date").notNull(),
  creditCardId: text("credit_card_id").notNull().default(""),
  autoRenew: integer("auto_renew", { mode: "boolean" }).notNull().default(true),
  reminderDays: integer("reminder_days").notNull().default(3),
  status: text("status").notNull().default("active"),
  trialEndDate: text("trial_end_date").notNull().default(""),
  manageUrl: text("manage_url").notNull().default(""),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const personalReminders = sqliteTable("personal_reminders", {
  id: text("id").primaryKey(),
  userKey: text("user_key").notNull(),
  title: text("title").notNull(),
  note: text("note").notNull().default(""),
  dueAt: text("due_at").notNull().default(""),
  priority: text("priority").notNull().default("normal"),
  relatedType: text("related_type").notNull().default(""),
  relatedId: text("related_id").notNull().default(""),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  calendarAdded: integer("calendar_added", { mode: "boolean" }).notNull().default(false),
  emailEnabled: integer("email_enabled", { mode: "boolean" }).notNull().default(false),
  emailLeadMinutes: integer("email_lead_minutes").notNull().default(1440),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const personalBudgets = sqliteTable("personal_budgets", {
  id: text("id").primaryKey(),
  userKey: text("user_key").notNull(),
  month: text("month").notNull(),
  amount: integer("amount").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const supportReports = sqliteTable(
  "support_reports",
  {
    id: text("id").primaryKey(),
    userKey: text("user_key").notNull(),
    reportType: text("report_type").notNull(),
    subject: text("subject").notNull(),
    details: text("details").notNull().default(""),
    page: text("page").notNull().default(""),
    technicalMessage: text("technical_message").notNull().default(""),
    isAutomatic: integer("is_automatic", { mode: "boolean" }).notNull().default(false),
    centralStatus: text("central_status").notNull().default("pending"),
    emailStatus: text("email_status").notNull().default("pending"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("support_reports_user_date_idx").on(table.userKey, table.createdAt),
    index("support_reports_status_idx").on(table.centralStatus, table.emailStatus),
  ]
);

export const memberships = sqliteTable(
  "memberships",
  {
    userKey: text("user_key").primaryKey(),
    role: text("role").notNull().default("personal"),
    plan: text("plan").notNull().default("trial"),
    status: text("status").notNull().default("trialing"),
    trialStartedAt: text("trial_started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    trialEndsAt: text("trial_ends_at").notNull(),
    emailReminders: integer("email_reminders", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("memberships_status_idx").on(table.status, table.trialEndsAt)]
);

export const reminderEmailDeliveries = sqliteTable(
  "reminder_email_deliveries",
  {
    id: text("id").primaryKey(),
    reminderId: text("reminder_id").notNull().unique(),
    userKey: text("user_key").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    subject: text("subject").notNull(),
    status: text("status").notNull().default("pending"),
    provider: text("provider").notNull().default(""),
    providerId: text("provider_id").notNull().default(""),
    errorMessage: text("error_message").notNull().default(""),
    attemptedAt: text("attempted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("reminder_email_delivery_status_idx").on(table.status, table.attemptedAt)]
);
