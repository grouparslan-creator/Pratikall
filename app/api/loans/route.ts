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
      `SELECT id, bank, loan_name AS loanName, original_amount AS originalAmount,
        remaining_debt AS remainingDebt, installment_amount AS installmentAmount,
        total_installments AS totalInstallments, remaining_installments AS remainingInstallments,
        next_payment_date AS nextPaymentDate, status, created_at AS createdAt
       FROM loans WHERE owner_key = ?
       ORDER BY CASE WHEN status = 'paid' THEN 1 ELSE 0 END, next_payment_date ASC, created_at DESC`
    ).bind(identity.key).all();
    return Response.json({ loans: result.results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Krediler alınamadı." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const identity = await getCurrentUserIdentity();
    await prepareOwnedData(identity.key);
    const body = (await request.json()) as Record<string, unknown>;
    const bank = text(body.bank, 80);
    const loanName = text(body.loanName, 100);
    const originalAmount = Number(body.originalAmount);
    const remainingDebt = Number(body.remainingDebt);
    const installmentAmount = Number(body.installmentAmount);
    const totalInstallments = Number(body.totalInstallments);
    const remainingInstallments = Number(body.remainingInstallments);
    const nextPaymentDate = text(body.nextPaymentDate, 10);
    if (!bank || !loanName) return Response.json({ error: "Banka ve kredi adı zorunludur." }, { status: 400 });
    if (![originalAmount, remainingDebt, installmentAmount, totalInstallments, remainingInstallments].every(Number.isInteger) || originalAmount <= 0 || remainingDebt < 0 || installmentAmount <= 0 || totalInstallments <= 0 || remainingInstallments < 0) {
      return Response.json({ error: "Kredi bilgileri geçersiz." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextPaymentDate)) return Response.json({ error: "Ödeme tarihi geçersiz." }, { status: 400 });
    await getD1().prepare(
      `INSERT INTO loans (id, owner_key, bank, loan_name, original_amount, remaining_debt, installment_amount, total_installments, remaining_installments, next_payment_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), identity.key, bank, loanName, originalAmount, remainingDebt, installmentAmount, totalInstallments, remainingInstallments, nextPaymentDate, remainingDebt === 0 ? "paid" : "open").run();
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Kredi eklenemedi." }, { status: 500 });
  }
}
