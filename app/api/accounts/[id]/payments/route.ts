import { getD1 } from "@/db";
import { getCurrentUserIdentity } from "@/app/user-identity";
import { prepareOwnedData } from "@/app/lib/data-ownership";

const ALLOWED_METHODS = new Set([
  "Nakit",
  "Havale / EFT",
  "Kredi Kartı",
  "Diğer",
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const identity = await getCurrentUserIdentity();
    await prepareOwnedData(identity.key);
    const { id } = await context.params;
    const payload = (await request.json()) as Record<string, unknown>;
    const amount = Number(payload.amount);
    const method = typeof payload.method === "string" ? payload.method.trim() : "";
    const paidAt = typeof payload.paidAt === "string" ? payload.paidAt.trim() : "";
    const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 500) : "";

    if (!Number.isInteger(amount) || amount <= 0) {
      return Response.json({ error: "Tahsilat tutarı geçersiz." }, { status: 400 });
    }
    if (!ALLOWED_METHODS.has(method)) {
      return Response.json({ error: "Ödeme şekli geçersiz." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) {
      return Response.json({ error: "Tahsilat tarihi geçersiz." }, { status: 400 });
    }

    const db = getD1();
    const account = await db
      .prepare(
        `SELECT
          a.original_amount - COALESCE(SUM(p.amount), 0) AS remainingAmount
        FROM accounts a
        LEFT JOIN payments p ON p.account_id = a.id AND p.owner_key = a.owner_key
        WHERE a.id = ? AND a.owner_key = ?
        GROUP BY a.id`
      )
      .bind(id, identity.key)
      .first<{ remainingAmount: number }>();

    if (!account) {
      return Response.json({ error: "Açık hesap kaydı bulunamadı." }, { status: 404 });
    }
    if (amount > account.remainingAmount) {
      return Response.json(
        { error: "Tahsilat kalan borçtan fazla olamaz." },
        { status: 400 }
      );
    }

    const nextStatus = amount === account.remainingAmount ? "paid" : "partial";
    await db.batch([
      db
        .prepare(
          `INSERT INTO payments (id, owner_key, account_id, amount, method, paid_at, note)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(crypto.randomUUID(), identity.key, id, amount, method, paidAt, note),
      db
        .prepare(
          `UPDATE accounts
           SET status = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND owner_key = ?`
        )
        .bind(nextStatus, id, identity.key),
    ]);

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tahsilat kaydedilemedi.";
    return Response.json({ error: message }, { status: 500 });
  }
}
