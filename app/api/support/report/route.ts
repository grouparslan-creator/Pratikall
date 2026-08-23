import { ensureSupportReportsTable, getD1 } from "@/db";
import { dispatchSupportReport } from "@/app/lib/support-reports";
import { getCurrentUserIdentity } from "@/app/user-identity";

const REPORT_TYPES = new Set(["error", "help", "request"]);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const requestedType = cleanText(payload.reportType, 20);
    const reportType = REPORT_TYPES.has(requestedType) ? requestedType : "help";
    const subject = cleanText(payload.subject, 140);
    const details = cleanText(payload.details, 4000);
    const page = cleanText(payload.page, 300);
    const technicalMessage = cleanText(payload.technicalMessage, 1500);
    const isAutomatic = payload.isAutomatic === true;

    if (subject.length < 3) {
      return Response.json({ error: "Rapor başlığı en az 3 karakter olmalıdır." }, { status: 400 });
    }
    if (!isAutomatic && details.length < 5) {
      return Response.json({ error: "Lütfen yaşadığınız durumu kısaca açıklayın." }, { status: 400 });
    }

    const identity = await getCurrentUserIdentity();
    await ensureSupportReportsTable();
    const db = getD1();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await db.prepare(
      `INSERT INTO support_reports (
        id, user_key, report_type, subject, details, page,
        technical_message, is_automatic, central_status, email_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`
    ).bind(
      id,
      identity.key,
      reportType,
      subject,
      details,
      page,
      technicalMessage,
      isAutomatic ? 1 : 0
    ).run();

    const delivery = await dispatchSupportReport({
      id,
      reportType: reportType as "error" | "help" | "request",
      subject,
      details,
      page,
      technicalMessage,
      isAutomatic,
      userKey: identity.key,
      userName: identity.displayName,
      createdAt,
    });

    await db.prepare(
      `UPDATE support_reports
       SET central_status = ?, email_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_key = ?`
    ).bind(delivery.central, delivery.email, id, identity.key).run();

    return Response.json({
      id,
      saved: true,
      centralStatus: delivery.central,
      emailStatus: delivery.email,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rapor kaydedilemedi.";
    return Response.json({ error: message }, { status: 500 });
  }
}
