import { getD1 } from "@/db";
import { getCurrentUserIdentity } from "@/app/user-identity";
import { prepareOwnedData } from "@/app/lib/data-ownership";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const identity = await getCurrentUserIdentity();
    await prepareOwnedData(identity.key);
    const { id } = await context.params;
    const body = (await request.json()) as { paidAt?: string };
    const paidAt = typeof body.paidAt === "string" ? body.paidAt : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) return Response.json({ error: "Tarih geçersiz." }, { status: 400 });
    const db = getD1();
    const card = await db.prepare("SELECT current_debt AS currentDebt FROM credit_cards WHERE id = ? AND owner_key = ?").bind(id, identity.key).first<{ currentDebt: number }>();
    if (!card) return Response.json({ error: "Kart kaydı bulunamadı." }, { status: 404 });
    if (card.currentDebt <= 0) return Response.json({ ok: true });
    await db.batch([
      db.prepare("INSERT INTO finance_payments (id, owner_key, source_type, source_id, amount, paid_at, note) VALUES (?, ?, 'card', ?, ?, ?, 'Kart ekstresi ödendi')").bind(crypto.randomUUID(), identity.key, id, card.currentDebt, paidAt),
      db.prepare("UPDATE credit_cards SET current_debt = 0, status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_key = ?").bind(id, identity.key),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Ödeme işlenemedi." }, { status: 500 });
  }
}
