import { getCurrentUserIdentity } from "@/app/user-identity";
import { prepareOwnedData } from "@/app/lib/data-ownership";
import { ensurePersonalFinanceTables, getD1 } from "@/db";

const EXPENSE_CATEGORIES = new Set([
  "Market", "Yeme İçme", "Ulaşım", "Ev", "Fatura", "Sağlık", "Eğitim",
  "Giyim", "Teknoloji", "Eğlence", "Seyahat", "Dijital", "Diğer",
]);
const BILL_CATEGORIES = new Set(["Elektrik", "Su", "Doğalgaz", "İnternet", "Telefon", "Kira", "Aidat", "Sigorta", "Vergi", "Diğer"]);
const PAYMENT_METHODS = new Set(["Nakit", "Banka Kartı", "Kredi Kartı", "Havale / EFT", "Otomatik Ödeme", "Diğer"]);
const RECURRENCES = new Set(["once", "weekly", "monthly", "quarterly", "yearly"]);
const BILLING_CYCLES = new Set(["weekly", "monthly", "quarterly", "yearly"]);
const PRIORITIES = new Set(["low", "normal", "high"]);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

function validDateTime(value: string) {
  return !value || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
}

function amount(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function integer(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function boolean(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function todayInIstanbul() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function advanceDate(value: string, recurrence: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (recurrence === "weekly") {
    const date = new Date(Date.UTC(year, month - 1, day + 7));
    return date.toISOString().slice(0, 10);
  }
  const months = recurrence === "quarterly" ? 3 : recurrence === "yearly" ? 12 : 1;
  const absoluteMonth = month - 1 + months;
  const nextYear = year + Math.floor(absoluteMonth / 12);
  const nextMonth = ((absoluteMonth % 12) + 12) % 12;
  const finalDay = Math.min(day, new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate());
  return new Date(Date.UTC(nextYear, nextMonth, finalDay)).toISOString().slice(0, 10);
}

function normalizeUrl(value: unknown) {
  const raw = cleanText(value, 500);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

async function cardExists(cardId: string, ownerKey: string) {
  if (!cardId) return false;
  return Boolean(await getD1().prepare("SELECT id FROM credit_cards WHERE id = ? AND owner_key = ?").bind(cardId, ownerKey).first());
}

export async function GET() {
  try {
    const identity = await getCurrentUserIdentity();
    await prepareOwnedData(identity.key);
    await ensurePersonalFinanceTables();
    const db = getD1();
    const [expenses, bills, subscriptions, reminders, budgets, cards, loans] = await Promise.all([
      db.prepare(
        `SELECT e.id, e.title, e.merchant, e.category, e.scope, e.amount,
          e.payment_method AS paymentMethod, e.credit_card_id AS creditCardId,
          e.installment_count AS installmentCount, e.spent_at AS spentAt,
          e.source_type AS sourceType, e.source_id AS sourceId, e.note,
          COALESCE(c.bank || ' · ' || c.card_name || CASE WHEN c.last_four <> '' THEN ' •••• ' || c.last_four ELSE '' END, '') AS creditCardLabel
        FROM personal_expenses e
        LEFT JOIN credit_cards c ON c.id = e.credit_card_id AND c.owner_key = e.user_key
        WHERE e.user_key = ?
        ORDER BY e.spent_at DESC, e.created_at DESC
        LIMIT 600`
      ).bind(identity.key).all(),
      db.prepare(
        `SELECT b.id, b.name, b.provider, b.account_number AS accountNumber,
          b.category, b.amount, b.due_date AS dueDate, b.recurrence,
          b.auto_pay AS autoPay, b.credit_card_id AS creditCardId,
          b.reminder_days AS reminderDays, b.status, b.last_paid_at AS lastPaidAt,
          b.note, COALESCE(c.bank || ' · ' || c.card_name || CASE WHEN c.last_four <> '' THEN ' •••• ' || c.last_four ELSE '' END, '') AS creditCardLabel
        FROM personal_bills b
        LEFT JOIN credit_cards c ON c.id = b.credit_card_id AND c.owner_key = b.user_key
        WHERE b.user_key = ?
        ORDER BY CASE WHEN b.status = 'paid' THEN 1 ELSE 0 END, b.due_date ASC`
      ).bind(identity.key).all(),
      db.prepare(
        `SELECT s.id, s.service_name AS serviceName, s.category, s.amount,
          s.billing_cycle AS billingCycle, s.next_payment_date AS nextPaymentDate,
          s.credit_card_id AS creditCardId, s.auto_renew AS autoRenew,
          s.reminder_days AS reminderDays, s.status, s.trial_end_date AS trialEndDate,
          s.manage_url AS manageUrl, s.note,
          COALESCE(c.bank || ' · ' || c.card_name || CASE WHEN c.last_four <> '' THEN ' •••• ' || c.last_four ELSE '' END, '') AS creditCardLabel
        FROM personal_subscriptions s
        LEFT JOIN credit_cards c ON c.id = s.credit_card_id AND c.owner_key = s.user_key
        WHERE s.user_key = ?
        ORDER BY CASE WHEN s.status = 'active' THEN 0 WHEN s.status = 'paused' THEN 1 ELSE 2 END, s.next_payment_date ASC`
      ).bind(identity.key).all(),
      db.prepare(
        `SELECT id, title, note, due_at AS dueAt, priority,
          related_type AS relatedType, related_id AS relatedId,
          completed, calendar_added AS calendarAdded, email_enabled AS emailEnabled,
          email_lead_minutes AS emailLeadMinutes, created_at AS createdAt
        FROM personal_reminders
        WHERE user_key = ?
        ORDER BY completed ASC, CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
          CASE WHEN due_at = '' THEN '9999-12-31T23:59' ELSE due_at END ASC, created_at DESC`
      ).bind(identity.key).all(),
      db.prepare(
        `SELECT id, month, amount FROM personal_budgets
        WHERE user_key = ? ORDER BY month DESC LIMIT 24`
      ).bind(identity.key).all(),
      db.prepare(
        `SELECT id, bank, card_name AS cardName, last_four AS lastFour,
          card_limit AS cardLimit, current_debt AS currentDebt,
          statement_date AS statementDate, due_date AS dueDate, status
        FROM credit_cards WHERE owner_key = ? ORDER BY card_name ASC`
      ).bind(identity.key).all(),
      db.prepare(
        `SELECT id, bank, loan_name AS loanName, remaining_debt AS remainingDebt,
          installment_amount AS installmentAmount, next_payment_date AS nextPaymentDate, status
        FROM loans WHERE owner_key = ? ORDER BY next_payment_date ASC`
      ).bind(identity.key).all(),
    ]);

    return Response.json({
      expenses: expenses.results,
      bills: bills.results.map((item: Record<string, unknown> & { autoPay?: unknown }) => ({ ...item, autoPay: Boolean(item.autoPay) })),
      subscriptions: subscriptions.results.map((item: Record<string, unknown> & { autoRenew?: unknown }) => ({ ...item, autoRenew: Boolean(item.autoRenew) })),
      reminders: reminders.results.map((item: Record<string, unknown> & { completed?: unknown; calendarAdded?: unknown; emailEnabled?: unknown }) => ({ ...item, completed: Boolean(item.completed), calendarAdded: Boolean(item.calendarAdded), emailEnabled: Boolean(item.emailEnabled) })),
      budgets: budgets.results,
      cards: cards.results,
      loans: loans.results,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Kişisel finans kayıtları alınamadı." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const identity = await getCurrentUserIdentity();
    await prepareOwnedData(identity.key);
    await ensurePersonalFinanceTables();
    const db = getD1();
    const payload = (await request.json()) as Record<string, unknown>;
    const entity = cleanText(payload.entity, 30);
    const id = crypto.randomUUID();

    if (entity === "expense") {
      const title = cleanText(payload.title, 120);
      const merchant = cleanText(payload.merchant, 120);
      const requestedCategory = cleanText(payload.category, 40);
      const category = EXPENSE_CATEGORIES.has(requestedCategory) ? requestedCategory : "Diğer";
      const scope = payload.scope === "business" ? "business" : "personal";
      const value = amount(payload.amount);
      const requestedMethod = cleanText(payload.paymentMethod, 40);
      const paymentMethod = PAYMENT_METHODS.has(requestedMethod) ? requestedMethod : "Diğer";
      const creditCardId = cleanText(payload.creditCardId, 80);
      const installmentCount = integer(payload.installmentCount, 1, 1, 60);
      const spentAt = cleanText(payload.spentAt, 10);
      const note = cleanText(payload.note, 600);
      if (!title || !value || !validDate(spentAt)) return Response.json({ error: "Harcama adı, tutarı ve tarihi zorunludur." }, { status: 400 });
      if (paymentMethod === "Kredi Kartı" && (!creditCardId || !(await cardExists(creditCardId, identity.key)))) {
        return Response.json({ error: "Kredi kartıyla yapılan harcamada kullanılacak kartı seçin." }, { status: 400 });
      }
      const statements = [
        db.prepare(
          `INSERT INTO personal_expenses (
            id, user_key, title, merchant, category, scope, amount, payment_method,
            credit_card_id, installment_count, spent_at, note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, identity.key, title, merchant, category, scope, value, paymentMethod, creditCardId, installmentCount, spentAt, note),
      ];
      if (paymentMethod === "Kredi Kartı" && creditCardId) {
        statements.push(db.prepare("UPDATE credit_cards SET current_debt = current_debt + ?, status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_key = ?").bind(value, creditCardId, identity.key));
      }
      await db.batch(statements);
      return Response.json({ ok: true, id }, { status: 201 });
    }

    if (entity === "bill") {
      const name = cleanText(payload.name, 120);
      const provider = cleanText(payload.provider, 120);
      const accountNumber = cleanText(payload.accountNumber, 80);
      const requestedCategory = cleanText(payload.category, 40);
      const category = BILL_CATEGORIES.has(requestedCategory) ? requestedCategory : "Diğer";
      const value = amount(payload.amount);
      const dueDate = cleanText(payload.dueDate, 10);
      const requestedRecurrence = cleanText(payload.recurrence, 20);
      const recurrence = RECURRENCES.has(requestedRecurrence) ? requestedRecurrence : "monthly";
      const autoPay = boolean(payload.autoPay);
      const creditCardId = cleanText(payload.creditCardId, 80);
      const reminderDays = integer(payload.reminderDays, 3, 0, 30);
      const note = cleanText(payload.note, 600);
      if (!name || !value || !validDate(dueDate)) return Response.json({ error: "Fatura adı, tutarı ve son ödeme tarihi zorunludur." }, { status: 400 });
      if (creditCardId && !(await cardExists(creditCardId, identity.key))) return Response.json({ error: "Seçilen kredi kartı bulunamadı." }, { status: 400 });
      await db.prepare(
        `INSERT INTO personal_bills (
          id, user_key, name, provider, account_number, category, amount, due_date,
          recurrence, auto_pay, credit_card_id, reminder_days, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, identity.key, name, provider, accountNumber, category, value, dueDate, recurrence, autoPay ? 1 : 0, creditCardId, reminderDays, note).run();
      return Response.json({ ok: true, id }, { status: 201 });
    }

    if (entity === "subscription") {
      const serviceName = cleanText(payload.serviceName, 120);
      const category = cleanText(payload.category, 50) || "Dijital";
      const value = amount(payload.amount);
      const requestedCycle = cleanText(payload.billingCycle, 20);
      const billingCycle = BILLING_CYCLES.has(requestedCycle) ? requestedCycle : "monthly";
      const nextPaymentDate = cleanText(payload.nextPaymentDate, 10);
      const creditCardId = cleanText(payload.creditCardId, 80);
      const autoRenew = payload.autoRenew !== false;
      const reminderDays = integer(payload.reminderDays, 3, 0, 30);
      const trialEndDate = cleanText(payload.trialEndDate, 10);
      const manageUrl = normalizeUrl(payload.manageUrl);
      const note = cleanText(payload.note, 600);
      if (!serviceName || !value || !validDate(nextPaymentDate)) return Response.json({ error: "Abonelik adı, tutarı ve sonraki ödeme tarihi zorunludur." }, { status: 400 });
      if (trialEndDate && !validDate(trialEndDate)) return Response.json({ error: "Deneme bitiş tarihi geçersiz." }, { status: 400 });
      if (creditCardId && !(await cardExists(creditCardId, identity.key))) return Response.json({ error: "Seçilen kredi kartı bulunamadı." }, { status: 400 });
      await db.prepare(
        `INSERT INTO personal_subscriptions (
          id, user_key, service_name, category, amount, billing_cycle,
          next_payment_date, credit_card_id, auto_renew, reminder_days,
          trial_end_date, manage_url, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, identity.key, serviceName, category, value, billingCycle, nextPaymentDate, creditCardId, autoRenew ? 1 : 0, reminderDays, trialEndDate, manageUrl, note).run();
      return Response.json({ ok: true, id }, { status: 201 });
    }

    if (entity === "reminder") {
      const title = cleanText(payload.title, 160);
      const note = cleanText(payload.note, 1200);
      const dueAt = cleanText(payload.dueAt, 16);
      const requestedPriority = cleanText(payload.priority, 20);
      const priority = PRIORITIES.has(requestedPriority) ? requestedPriority : "normal";
      const emailEnabled = boolean(payload.emailEnabled);
      const emailLeadMinutes = integer(payload.emailLeadMinutes, 1440, 0, 10080);
      if (!title || !validDateTime(dueAt)) return Response.json({ error: "Not başlığı zorunludur; tarih bilgisi geçersiz." }, { status: 400 });
      await db.prepare(
        `INSERT INTO personal_reminders (id, user_key, title, note, due_at, priority, email_enabled, email_lead_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, identity.key, title, note, dueAt, priority, emailEnabled ? 1 : 0, emailLeadMinutes).run();
      return Response.json({ ok: true, id }, { status: 201 });
    }

    if (entity === "budget") {
      const month = cleanText(payload.month, 7);
      const value = amount(payload.amount);
      if (!/^\d{4}-\d{2}$/.test(month) || !value) return Response.json({ error: "Ay ve bütçe tutarı geçersiz." }, { status: 400 });
      const budgetId = `${identity.key}:${month}`;
      await db.prepare(
        `INSERT INTO personal_budgets (id, user_key, month, amount)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET amount = excluded.amount, updated_at = CURRENT_TIMESTAMP`
      ).bind(budgetId, identity.key, month, value).run();
      return Response.json({ ok: true, id: budgetId }, { status: 201 });
    }

    return Response.json({ error: "Desteklenmeyen kayıt türü." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Kayıt oluşturulamadı." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const identity = await getCurrentUserIdentity();
    await prepareOwnedData(identity.key);
    await ensurePersonalFinanceTables();
    const db = getD1();
    const payload = (await request.json()) as Record<string, unknown>;
    const entity = cleanText(payload.entity, 30);
    const id = cleanText(payload.id, 80);
    const action = cleanText(payload.action, 30);
    const paidAt = validDate(cleanText(payload.paidAt, 10)) ? cleanText(payload.paidAt, 10) : todayInIstanbul();
    if (!id) return Response.json({ error: "Kayıt bulunamadı." }, { status: 400 });

    if (entity === "bill" && action === "pay") {
      const bill = await db.prepare(
        `SELECT id, name, provider, category, amount, due_date AS dueDate,
          recurrence, credit_card_id AS creditCardId, status
        FROM personal_bills WHERE id = ? AND user_key = ?`
      ).bind(id, identity.key).first<Record<string, string | number>>();
      if (!bill) return Response.json({ error: "Fatura bulunamadı." }, { status: 404 });
      if (bill.status === "paid") return Response.json({ error: "Bu fatura zaten ödenmiş." }, { status: 409 });
      const expenseId = crypto.randomUUID();
      const cardId = String(bill.creditCardId || "");
      const value = Number(bill.amount);
      const recurrence = String(bill.recurrence);
      const recurring = recurrence !== "once";
      const nextDate = recurring ? advanceDate(String(bill.dueDate), recurrence) : String(bill.dueDate);
      const statements = [
        db.prepare(
          `INSERT INTO personal_expenses (
            id, user_key, title, merchant, category, scope, amount, payment_method,
            credit_card_id, installment_count, spent_at, source_type, source_id, note
          ) VALUES (?, ?, ?, ?, 'Fatura', 'personal', ?, ?, ?, 1, ?, 'bill', ?, ?)`
        ).bind(expenseId, identity.key, `${String(bill.name)} faturası`, String(bill.provider || ""), value, cardId ? "Kredi Kartı" : "Otomatik Ödeme", cardId, paidAt, id, String(bill.category || "")),
        db.prepare(
          `UPDATE personal_bills SET status = ?, due_date = ?, last_paid_at = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_key = ?`
        ).bind(recurring ? "open" : "paid", nextDate, paidAt, id, identity.key),
      ];
      if (cardId) statements.push(db.prepare("UPDATE credit_cards SET current_debt = current_debt + ?, status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_key = ?").bind(value, cardId, identity.key));
      await db.batch(statements);
      return Response.json({ ok: true, nextDate: recurring ? nextDate : null });
    }

    if (entity === "subscription" && action === "pay") {
      const subscription = await db.prepare(
        `SELECT id, service_name AS serviceName, category, amount,
          billing_cycle AS billingCycle, next_payment_date AS nextPaymentDate,
          credit_card_id AS creditCardId, status
        FROM personal_subscriptions WHERE id = ? AND user_key = ?`
      ).bind(id, identity.key).first<Record<string, string | number>>();
      if (!subscription) return Response.json({ error: "Abonelik bulunamadı." }, { status: 404 });
      if (subscription.status !== "active") return Response.json({ error: "Yalnızca aktif abonelik tahsil edilebilir." }, { status: 409 });
      const expenseId = crypto.randomUUID();
      const cardId = String(subscription.creditCardId || "");
      const value = Number(subscription.amount);
      const nextDate = advanceDate(String(subscription.nextPaymentDate), String(subscription.billingCycle));
      const statements = [
        db.prepare(
          `INSERT INTO personal_expenses (
            id, user_key, title, merchant, category, scope, amount, payment_method,
            credit_card_id, installment_count, spent_at, source_type, source_id, note
          ) VALUES (?, ?, ?, ?, ?, 'personal', ?, ?, ?, 1, ?, 'subscription', ?, 'Abonelik ödemesi')`
        ).bind(expenseId, identity.key, `${String(subscription.serviceName)} aboneliği`, String(subscription.serviceName), String(subscription.category), value, cardId ? "Kredi Kartı" : "Otomatik Ödeme", cardId, paidAt, id),
        db.prepare(
          `UPDATE personal_subscriptions SET next_payment_date = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_key = ?`
        ).bind(nextDate, id, identity.key),
      ];
      if (cardId) statements.push(db.prepare("UPDATE credit_cards SET current_debt = current_debt + ?, status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_key = ?").bind(value, cardId, identity.key));
      await db.batch(statements);
      return Response.json({ ok: true, nextDate });
    }

    if (entity === "reminder" && action === "complete") {
      await db.prepare(
        `UPDATE personal_reminders SET completed = CASE completed WHEN 1 THEN 0 ELSE 1 END,
          updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_key = ?`
      ).bind(id, identity.key).run();
      return Response.json({ ok: true });
    }

    if (entity === "reminder" && action === "calendar-added") {
      await db.prepare(
        `UPDATE personal_reminders SET calendar_added = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_key = ?`
      ).bind(id, identity.key).run();
      return Response.json({ ok: true });
    }

    if (entity === "subscription" && action === "status") {
      const status = cleanText(payload.status, 20);
      if (!["active", "paused", "cancelled"].includes(status)) return Response.json({ error: "Abonelik durumu geçersiz." }, { status: 400 });
      await db.prepare(
        `UPDATE personal_subscriptions SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_key = ?`
      ).bind(status, id, identity.key).run();
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Desteklenmeyen işlem." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "İşlem tamamlanamadı." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const identity = await getCurrentUserIdentity();
    await prepareOwnedData(identity.key);
    await ensurePersonalFinanceTables();
    const url = new URL(request.url);
    const entity = cleanText(url.searchParams.get("entity"), 30);
    const id = cleanText(url.searchParams.get("id"), 80);
    if (!id) return Response.json({ error: "Kayıt bulunamadı." }, { status: 400 });
    const db = getD1();

    if (entity === "expense") {
      const expense = await db.prepare(
        `SELECT amount, payment_method AS paymentMethod, credit_card_id AS creditCardId
        FROM personal_expenses WHERE id = ? AND user_key = ?`
      ).bind(id, identity.key).first<{ amount: number; paymentMethod: string; creditCardId: string }>();
      if (!expense) return Response.json({ error: "Harcama bulunamadı." }, { status: 404 });
      const statements = [db.prepare("DELETE FROM personal_expenses WHERE id = ? AND user_key = ?").bind(id, identity.key)];
      if (expense.paymentMethod === "Kredi Kartı" && expense.creditCardId) {
        statements.push(db.prepare("UPDATE credit_cards SET current_debt = MAX(0, current_debt - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_key = ?").bind(expense.amount, expense.creditCardId, identity.key));
      }
      await db.batch(statements);
      return Response.json({ ok: true });
    }

    const table = entity === "bill" ? "personal_bills" : entity === "subscription" ? "personal_subscriptions" : entity === "reminder" ? "personal_reminders" : "";
    if (!table) return Response.json({ error: "Desteklenmeyen kayıt türü." }, { status: 400 });
    await db.prepare(`DELETE FROM ${table} WHERE id = ? AND user_key = ?`).bind(id, identity.key).run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Kayıt silinemedi." }, { status: 500 });
  }
}
