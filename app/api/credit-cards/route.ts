import { getD1 } from "@/db";
import { getCurrentUserIdentity } from "@/app/user-identity";
import { prepareOwnedData } from "@/app/lib/data-ownership";

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET() {
  try {
    const identity = await getCurrentUserIdentity();
    await prepareOwnedData(identity.key);
    const result = await getD1().prepare(
      `SELECT id, bank, card_name AS cardName, last_four AS lastFour,
        card_limit AS cardLimit, current_debt AS currentDebt,
        minimum_payment AS minimumPayment, statement_date AS statementDate,
        due_date AS dueDate, status, created_at AS createdAt
       FROM credit_cards WHERE owner_key = ?
       ORDER BY CASE WHEN status = 'paid' THEN 1 ELSE 0 END, due_date ASC, created_at DESC`
    ).bind(identity.key).all();
    return Response.json({ cards: result.results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Kartlar alınamadı." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const identity = await getCurrentUserIdentity();
    await prepareOwnedData(identity.key);
    const body = (await request.json()) as Record<string, unknown>;
    const bank = text(body.bank, 80);
    const cardName = text(body.cardName, 80);
    const lastFour = text(body.lastFour, 4).replace(/\D/g, "");
    const cardLimit = Number(body.cardLimit);
    const currentDebt = Number(body.currentDebt);
    const minimumPayment = Number(body.minimumPayment);
    const statementDate = text(body.statementDate, 10);
    const dueDate = text(body.dueDate, 10);
    if (!bank || !cardName) return Response.json({ error: "Banka ve kart adı zorunludur." }, { status: 400 });
    if (!Number.isInteger(currentDebt) || currentDebt < 0 || !Number.isInteger(cardLimit) || cardLimit < 0 || !Number.isInteger(minimumPayment) || minimumPayment < 0) {
      return Response.json({ error: "Tutar bilgileri geçersiz." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(statementDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return Response.json({ error: "Tarih bilgileri geçersiz." }, { status: 400 });
    }
    await getD1().prepare(
      `INSERT INTO credit_cards (id, owner_key, bank, card_name, last_four, card_limit, current_debt, minimum_payment, statement_date, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), identity.key, bank, cardName, lastFour, cardLimit, currentDebt, minimumPayment, statementDate, dueDate, currentDebt === 0 ? "paid" : "open").run();
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Kart eklenemedi." }, { status: 500 });
  }
}
