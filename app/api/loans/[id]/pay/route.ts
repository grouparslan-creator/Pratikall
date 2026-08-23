import { getD1 } from "@/db";
import { getCurrentUserIdentity } from "@/app/user-identity";
import { prepareOwnedData } from "@/app/lib/data-ownership";

function addMonth(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const identity = await getCurrentUserIdentity();
    await prepareOwnedData(identity.key);
    const { id } = await context.params;
    const body = (await request.json()) as { paidAt?: string };
    const paidAt = typeof body.paidAt === "string" ? body.paidAt : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) return Response.json({ error: "Tarih geçersiz." }, { status: 400 });
    const db = getD1();
    const loan = await db.prepare(
      "SELECT remaining_debt AS remainingDebt, installment_amount AS installmentAmount, remaining_installments AS remainingInstallments, next_payment_date AS nextPaymentDate FROM loans WHERE id = ? AND owner_key = ?"
    ).bind(id, identity.key).first<{ remainingDebt: number; installmentAmount: number; remainingInstallments: number; nextPaymentDate: string }>();
    if (!loan) return Response.json({ error: "Kredi kaydı bulunamadı." }, { status: 404 });
    if (loan.remainingDebt <= 0) return Response.json({ ok: true });
    const amount = Math.min(loan.installmentAmount, loan.remainingDebt);
    const remainingDebt = Math.max(0, loan.remainingDebt - amount);
    const remainingInstallments = Math.max(0, loan.remainingInstallments - 1);
    const status = remainingDebt === 0 || remainingInstallments === 0 ? "paid" : "open";
    await db.batch([
      db.prepare("INSERT INTO finance_payments (id, owner_key, source_type, source_id, amount, paid_at, note) VALUES (?, ?, 'loan', ?, ?, ?, 'Kredi taksiti ödendi')").bind(crypto.randomUUID(), identity.key, id, amount, paidAt),
      db.prepare("UPDATE loans SET remaining_debt = ?, remaining_installments = ?, next_payment_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_key = ?").bind(remainingDebt, remainingInstallments, addMonth(loan.nextPaymentDate), status, id, identity.key),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Taksit işlenemedi." }, { status: 500 });
  }
}
