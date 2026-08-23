import {
  sendCustomerNotification,
  type NotificationChannel,
} from "@/app/lib/notifications";
import { getCurrentUserIdentity } from "@/app/user-identity";
import { ensureNotificationResultColumns, ensureUserPreferencesTable, getD1 } from "@/db";
import { prepareOwnedData } from "@/app/lib/data-ownership";

const ALLOWED_EVENTS = new Set([
  "account_summary",
  "payment_reminder",
  "payment_received",
]);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as Record<string, unknown>;
    const eventType = cleanText(payload.eventType, 40);
    const message = cleanText(payload.message, 700);
    const requestedChannels = Array.isArray(payload.channels)
      ? payload.channels.filter(
          (channel): channel is NotificationChannel =>
            channel === "sms" || channel === "email"
        )
      : [];
    const channels = [...new Set(requestedChannels)];

    if (!ALLOWED_EVENTS.has(eventType)) {
      return Response.json({ error: "Bildirim türü geçersiz." }, { status: 400 });
    }
    if (channels.length === 0) {
      return Response.json(
        { error: "En az bir gönderim kanalı seçin." },
        { status: 400 }
      );
    }
    if (!message) {
      return Response.json({ error: "Bildirim mesajı boş olamaz." }, { status: 400 });
    }

    const db = getD1();
    const identity = await getCurrentUserIdentity();
    await prepareOwnedData(identity.key);
    await ensureUserPreferencesTable();
    await ensureNotificationResultColumns();
    const account = await db
      .prepare(
        `SELECT
          a.customer_name AS customerName,
          a.phone,
          a.email,
          a.original_amount - COALESCE(SUM(p.amount), 0) AS remainingAmount,
          a.due_date AS dueDate
        FROM accounts a
        LEFT JOIN payments p ON p.account_id = a.id AND p.owner_key = a.owner_key
        WHERE a.id = ? AND a.owner_key = ?
        GROUP BY a.id`
      )
      .bind(id, identity.key)
      .first<{
        customerName: string;
        phone: string;
        email: string;
        remainingAmount: number;
        dueDate: string;
      }>();

    if (!account) {
      return Response.json({ error: "Açık hesap kaydı bulunamadı." }, { status: 404 });
    }

    const preference = await db
      .prepare(
        `SELECT
          app_name AS appName,
          company_name AS companyName,
          logo_key AS logoKey,
          use_default_logo AS useDefaultLogo,
          email_sender_name AS emailSenderName,
          email_reply_to AS emailReplyTo,
          email_signature AS emailSignature
        FROM user_preferences
        WHERE user_key = ?`
      )
      .bind(identity.key)
      .first<{
        appName: string;
        companyName: string;
        logoKey: string;
        useDefaultLogo: number;
        emailSenderName: string;
        emailReplyTo: string;
        emailSignature: string;
      }>();

    const phone = cleanText(payload.phone, 30) || account.phone;
    const email = (cleanText(payload.email, 160) || account.email).toLowerCase();

    if (channels.includes("sms") && !isValidPhone(phone)) {
      return Response.json(
        { error: "SMS için geçerli bir telefon numarası girin." },
        { status: 400 }
      );
    }
    if (channels.includes("email") && !isValidEmail(email)) {
      return Response.json(
        { error: "E-posta için geçerli bir adres girin." },
        { status: 400 }
      );
    }

    const eventLabels: Record<string, string> = {
      account_summary: "Hesap Özeti",
      payment_reminder: "Ödeme Hatırlatması",
      payment_received: "Tahsilat Bilgisi",
    };
    const brandName = preference?.companyName || preference?.appName || "PratikAll";
    const subject = `${brandName} - ${eventLabels[eventType]}`;
    const logoPath = preference?.logoKey
      ? `/api/brand-assets/${encodeURIComponent(preference.logoKey)}`
      : preference?.useDefaultLogo
        ? "/pratikall-logo.png"
        : "";
    const notificationId = crypto.randomUUID();
    const results = await sendCustomerNotification({
      notificationId,
      accountId: id,
      customerName: account.customerName,
      eventType,
      channels,
      phone,
      email,
      subject,
      message,
      balance: account.remainingAmount,
      dueDate: account.dueDate,
      brandName,
      emailSenderName: preference?.emailSenderName || brandName,
      emailReplyTo: preference?.emailReplyTo || "",
      emailSignature: preference?.emailSignature || `${brandName} ekibi`,
      logoUrl: logoPath ? new URL(logoPath, request.url).toString() : "",
    });

    const submittedCount = results.filter((result) => result.status === "submitted").length;
    const deliveryStatus =
      submittedCount === results.length
        ? "submitted"
        : submittedCount === 0
          ? "failed"
          : "partial";
    const failedMessages = results
      .filter((result) => result.status === "failed" && result.error)
      .map((result) => `${result.channel === "sms" ? "SMS" : "E-posta"}: ${result.error}`);
    const summary =
      deliveryStatus === "submitted"
        ? channels.length === 2
          ? "SMS ve e-posta gönderildi."
          : `${channels[0] === "sms" ? "SMS" : "E-posta"} gönderildi.`
        : deliveryStatus === "partial"
          ? "Kanallardan biri gönderildi, diğeri gönderilemedi."
          : "Bildirim gönderilemedi.";

    await db.batch([
      db
        .prepare(
          `UPDATE accounts
           SET phone = ?, email = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND owner_key = ?`
        )
        .bind(phone, email, id, identity.key),
      db
        .prepare(
          `INSERT INTO account_notifications (
            id, owner_key, account_id, event_type, channels, recipient_phone,
            recipient_email, message, delivery_mode, status,
            provider_result, error_message
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          notificationId,
          identity.key,
          id,
          eventType,
          channels.join(","),
          phone,
          email,
          message,
          "provider",
          deliveryStatus,
          JSON.stringify(results),
          failedMessages.join(" | ")
        ),
    ]);

    return Response.json(
      {
        ok: deliveryStatus === "submitted",
        deliveryMode: "provider",
        deliveryStatus,
        summary,
        message,
        results,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bildirim gönderilemedi.";
    return Response.json({ error: message }, { status: 500 });
  }
}
