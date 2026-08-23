type SupportEnvironment = {
  SUPPORT_REPORT_WEBHOOK_URL?: string;
  SUPPORT_REPORT_WEBHOOK_TOKEN?: string;
  SUPPORT_REPORT_EMAIL_TO?: string;
  RESEND_API_KEY?: string;
  NOTIFICATION_EMAIL_FROM?: string;
};

export type SupportReportPayload = {
  id: string;
  reportType: "error" | "help" | "request";
  subject: string;
  details: string;
  page: string;
  technicalMessage: string;
  isAutomatic: boolean;
  userKey: string;
  userName: string;
  createdAt: string;
};

export type SupportDeliveryStatus = "sent" | "not_configured" | "failed";

function runtimeEnv() {
  const runtime = globalThis as typeof globalThis & {
    __SITE_ENV__?: SupportEnvironment;
  };
  return runtime.__SITE_ENV__ ?? {};
}

function configured(value: string | undefined) {
  return Boolean(value?.trim());
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendToCentralServer(
  env: SupportEnvironment,
  report: SupportReportPayload
): Promise<SupportDeliveryStatus> {
  if (!configured(env.SUPPORT_REPORT_WEBHOOK_URL)) return "not_configured";
  try {
    const response = await fetch(env.SUPPORT_REPORT_WEBHOOK_URL!.trim(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": report.id,
        ...(configured(env.SUPPORT_REPORT_WEBHOOK_TOKEN)
          ? { Authorization: `Bearer ${env.SUPPORT_REPORT_WEBHOOK_TOKEN!.trim()}` }
          : {}),
      },
      body: JSON.stringify({ source: "PratikAll", ...report }),
      signal: AbortSignal.timeout(15_000),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

async function sendSupportEmail(
  env: SupportEnvironment,
  report: SupportReportPayload
): Promise<SupportDeliveryStatus> {
  if (
    !configured(env.RESEND_API_KEY) ||
    !configured(env.NOTIFICATION_EMAIL_FROM) ||
    !configured(env.SUPPORT_REPORT_EMAIL_TO)
  ) {
    return "not_configured";
  }

  const labels = {
    error: "Hata bildirimi",
    help: "Yardım talebi",
    request: "Özellik isteği",
  } as const;
  const configuredFrom = env.NOTIFICATION_EMAIL_FROM!.trim();
  const addressMatch = configuredFrom.match(/<([^>]+)>/);
  const senderAddress = addressMatch?.[1] ?? configuredFrom;
  const safeDetails = escapeHtml(report.details || "Açıklama eklenmedi.").replaceAll("\n", "<br>");
  const safeTechnical = escapeHtml(report.technicalMessage || "Teknik ayrıntı yok.").replaceAll("\n", "<br>");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `${report.id}-support-email`,
      },
      body: JSON.stringify({
        from: `PratikAll Rapor <${senderAddress}>`,
        to: [env.SUPPORT_REPORT_EMAIL_TO!.trim()],
        subject: `[PratikAll] ${labels[report.reportType]}: ${report.subject}`,
        text: `${labels[report.reportType]}\n${report.subject}\n\n${report.details}\n\nSayfa: ${report.page}\nKullanıcı: ${report.userName || report.userKey}\nTeknik bilgi: ${report.technicalMessage || "Yok"}`,
        html: `<div style="max-width:680px;margin:0 auto;font-family:Arial,sans-serif;color:#20232a;line-height:1.6"><div style="display:inline-block;padding:6px 10px;border-radius:8px;background:#fff0f3;color:#d71635;font-size:12px;font-weight:700">${labels[report.reportType]}</div><h2 style="margin:14px 0 8px">${escapeHtml(report.subject)}</h2><p>${safeDetails}</p><hr style="border:0;border-top:1px solid #ececef;margin:24px 0"><table style="width:100%;font-size:12px;color:#666"><tr><td style="padding:4px 0"><b>Rapor No</b></td><td>${escapeHtml(report.id)}</td></tr><tr><td style="padding:4px 0"><b>Kullanıcı</b></td><td>${escapeHtml(report.userName || report.userKey)}</td></tr><tr><td style="padding:4px 0"><b>Sayfa</b></td><td>${escapeHtml(report.page || "Bilinmiyor")}</td></tr><tr><td style="padding:4px 0;vertical-align:top"><b>Teknik bilgi</b></td><td>${safeTechnical}</td></tr></table></div>`,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

export async function dispatchSupportReport(report: SupportReportPayload) {
  const env = runtimeEnv();
  const [central, email] = await Promise.all([
    sendToCentralServer(env, report),
    sendSupportEmail(env, report),
  ]);
  return { central, email };
}
