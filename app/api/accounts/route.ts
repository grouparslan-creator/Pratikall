import { getD1 } from "@/db";
import { getCurrentUserIdentity } from "@/app/user-identity";
import { prepareOwnedData } from "@/app/lib/data-ownership";

const ALLOWED_METHODS = new Set([
  "Nakit",
  "Havale / EFT",
  "Kredi Kartı",
  "Diğer",
]);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET() {
  try {
    const identity = await getCurrentUserIdentity();
    await prepareOwnedData(identity.key);
    const db = getD1();
    const result = await db
      .prepare(
        `SELECT
          a.id,
          a.company,
          a.customer_name AS customerName,
          a.phone,
          a.email,
          a.original_amount AS originalAmount,
          COALESCE(SUM(p.amount), 0) AS paidAmount,
          a.original_amount - COALESCE(SUM(p.amount), 0) AS remainingAmount,
          a.planned_payment_method AS plannedPaymentMethod,
          a.due_date AS dueDate,
          a.note,
          a.status,
          a.created_at AS createdAt,
          MAX(p.paid_at) AS lastPaymentDate
        FROM accounts a
        LEFT JOIN payments p ON p.account_id = a.id AND p.owner_key = a.owner_key
        WHERE a.owner_key = ?
        GROUP BY a.id
        ORDER BY
          CASE WHEN a.original_amount - COALESCE(SUM(p.amount), 0) <= 0 THEN 1 ELSE 0 END,
          a.due_date ASC,
          a.created_at DESC`
      )
      .bind(identity.key)
      .all();

    return Response.json({ accounts: result.results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kayıtlar alınamadı.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const identity = await getCurrentUserIdentity();
    await prepareOwnedData(identity.key);
    const payload = (await request.json()) as Record<string, unknown>;
    const customerName = cleanText(payload.customerName, 120);
    const company = cleanText(payload.company, 120);
    const phone = cleanText(payload.phone, 30);
    const email = cleanText(payload.email, 160).toLocaleLowerCase("tr-TR");
    const note = cleanText(payload.note, 500);
    const plannedPaymentMethod = cleanText(payload.plannedPaymentMethod, 40);
    const dueDate = cleanText(payload.dueDate, 10);
    const originalAmount = Number(payload.originalAmount);

    if (!customerName) {
      return Response.json({ error: "Müşteri adı zorunludur." }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "E-posta adresi geçersiz." }, { status: 400 });
    }
    if (!Number.isInteger(originalAmount) || originalAmount <= 0) {
      return Response.json({ error: "Borç tutarı geçersiz." }, { status: 400 });
    }
    if (!ALLOWED_METHODS.has(plannedPaymentMethod)) {
      return Response.json({ error: "Ödeme şekli geçersiz." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return Response.json({ error: "Ödeme tarihi geçersiz." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const db = getD1();
    await db
      .prepare(
        `INSERT INTO accounts (
          id, owner_key, company, customer_name, phone, email, original_amount,
          planned_payment_method, due_date, note, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`
      )
      .bind(
        id,
        identity.key,
        company,
        customerName,
        phone,
        email,
        originalAmount,
        plannedPaymentMethod,
        dueDate,
        note
      )
      .run();

    return Response.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kayıt eklenemedi.";
    return Response.json({ error: message }, { status: 500 });
  }
}
