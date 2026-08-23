import { ensureReminderEmailDeliveriesTable, ensureUserPreferencesTable, getD1 } from "@/db";
import { sendCustomerNotification } from "@/app/lib/notifications";

type DueReminder = { id: string; userKey: string; title: string; note: string; dueAt: string };

export async function processDueReminderEmails(now = new Date()) {
  await ensureReminderEmailDeliveriesTable();
  await ensureUserPreferencesTable();
  const db = getD1();
  const rows = await db.prepare(
    `SELECT r.id, r.user_key AS userKey, r.title, r.note, r.due_at AS dueAt
     FROM personal_reminders r
     LEFT JOIN reminder_email_deliveries d ON d.reminder_id = r.id
     WHERE r.completed = 0 AND r.email_enabled = 1 AND r.due_at <> ''
       AND datetime(r.due_at, '-' || r.email_lead_minutes || ' minutes') <= datetime(?)
       AND datetime(r.due_at) >= datetime(?, '-7 days')
       AND d.reminder_id IS NULL
     ORDER BY datetime(r.due_at) ASC LIMIT 50`
  ).bind(now.toISOString(), now.toISOString()).all<DueReminder>();

  const results: Array<{ reminderId: string; status: string; provider: string }> = [];
  for (const reminder of rows.results) {
    const profile = await db.prepare(
      `SELECT app_name AS appName, email_sender_name AS senderName,
              email_reply_to AS replyTo, email_signature AS signature
       FROM user_preferences WHERE user_key = ?`
    ).bind(reminder.userKey).first<{ appName: string; senderName: string; replyTo: string; signature: string }>();
    const brand = profile?.appName || "PratikAll";
    const deliveryId = crypto.randomUUID();
    const message = `${reminder.title}\n\n${reminder.note || "Yaklaşan hatırlatmanız var."}\n\nTarih: ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(reminder.dueAt))}`;
    const delivered = await sendCustomerNotification({
      notificationId: deliveryId, accountId: reminder.id, customerName: reminder.userKey,
      eventType: "personal_reminder", channels: ["email"], phone: "", email: reminder.userKey,
      subject: `${brand} - ${reminder.title}`, message, balance: 0, dueDate: reminder.dueAt,
      brandName: brand, emailSenderName: profile?.senderName || brand,
      emailReplyTo: profile?.replyTo || "", emailSignature: profile?.signature || `${brand} ekibi`, logoUrl: "",
    });
    const email = delivered[0];
    await db.prepare(
      `INSERT INTO reminder_email_deliveries
       (id, reminder_id, user_key, recipient_email, subject, status, provider, provider_id, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(deliveryId, reminder.id, reminder.userKey, reminder.userKey, `${brand} - ${reminder.title}`, email.status, email.provider, ("providerId" in email ? email.providerId : "") || "", email.error || "").run();
    results.push({ reminderId: reminder.id, status: email.status, provider: email.provider });
  }
  return { processed: results.length, results };
}
