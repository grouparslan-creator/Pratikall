export type NotificationChannel = "sms" | "email";

export type DeliveryResult = {
  channel: NotificationChannel;
  recipient: string;
  provider: string;
  status: "submitted" | "failed";
  providerId?: string;
  error?: string;
};

type NotificationEnvironment = {
  EMAIL_PROVIDER_WEBHOOK_URL?: string;
  EMAIL_PROVIDER_WEBHOOK_TOKEN?: string;
  CUSTOMER_NOTIFICATION_WEBHOOK_URL?: string;
  CUSTOMER_NOTIFICATION_WEBHOOK_TOKEN?: string;
  NETGSM_USERNAME?: string;
  NETGSM_PASSWORD?: string;
  NETGSM_MSGHEADER?: string;
  NETGSM_APPNAME?: string;
  RESEND_API_KEY?: string;
  NOTIFICATION_EMAIL_FROM?: string;
  NOTIFICATION_EMAIL_REPLY_TO?: string;
};

type SendNotificationInput = {
  notificationId: string;
  accountId: string;
  customerName: string;
  eventType: string;
  channels: NotificationChannel[];
  phone: string;
  email: string;
  subject: string;
  message: string;
  balance: number;
  dueDate: string;
  brandName: string;
  emailSenderName: string;
  emailReplyTo: string;
  emailSignature: string;
  logoUrl: string;
};

function runtimeEnv() {
  const runtime = globalThis as typeof globalThis & {
    __SITE_ENV__?: NotificationEnvironment;
  };
  return runtime.__SITE_ENV__ ?? {};
}

function configured(value: string | undefined) {
  return Boolean(value?.trim());
}

export function getNotificationIntegrationStatus() {
  const env = runtimeEnv();
  const webhookReady = configured(env.CUSTOMER_NOTIFICATION_WEBHOOK_URL);
  const serverEmailReady = configured(env.EMAIL_PROVIDER_WEBHOOK_URL) && configured(env.NOTIFICATION_EMAIL_FROM);
  const netgsmReady =
    configured(env.NETGSM_USERNAME) &&
    configured(env.NETGSM_PASSWORD) &&
    configured(env.NETGSM_MSGHEADER);
  const emailReady =
    configured(env.RESEND_API_KEY) && configured(env.NOTIFICATION_EMAIL_FROM);

  return {
    sms: {
      ready: webhookReady || netgsmReady,
      provider: webhookReady ? "PratikAll Sunucusu" : "NETGSM",
    },
    email: {
      ready: serverEmailReady || webhookReady || emailReady,
      provider: serverEmailReady ? "Sunucu E-posta Servisi" : webhookReady ? "PratikAll Sunucusu" : "E-posta Servisi",
    },
  };
}

function normalizeNetgsmNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("90")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function responsePayload(response: Response) {
  const text = await response.text();
  if (!text) return {} as Record<string, unknown>;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

function providerError(payload: Record<string, unknown>, fallback: string) {
  const candidate = payload.message ?? payload.error ?? payload.code;
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim().slice(0, 240)
    : fallback;
}

async function sendThroughWebhook(
  env: NotificationEnvironment,
  input: SendNotificationInput
): Promise<DeliveryResult[]> {
  const response = await fetch(env.CUSTOMER_NOTIFICATION_WEBHOOK_URL!.trim(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": input.notificationId,
      ...(configured(env.CUSTOMER_NOTIFICATION_WEBHOOK_TOKEN)
        ? { Authorization: `Bearer ${env.CUSTOMER_NOTIFICATION_WEBHOOK_TOKEN!.trim()}` }
        : {}),
    },
    body: JSON.stringify({
      source: input.brandName,
      notificationId: input.notificationId,
      accountId: input.accountId,
      customerName: input.customerName,
      eventType: input.eventType,
      channels: input.channels,
      recipients: { phone: input.phone, email: input.email },
      subject: input.subject,
      message: input.message,
      balance: input.balance,
      dueDate: input.dueDate,
      branding: {
        brandName: input.brandName,
        senderName: input.emailSenderName,
        replyTo: input.emailReplyTo,
        signature: input.emailSignature,
        logoUrl: input.logoUrl,
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await responsePayload(response);

  if (!response.ok) {
    const error = providerError(payload, "Bildirim sunucusu gönderimi kabul etmedi.");
    return input.channels.map((channel) => ({
      channel,
      recipient: channel === "sms" ? input.phone : input.email,
      provider: "PratikAll Sunucusu",
      status: "failed",
      error,
    }));
  }

  const providerId = String(payload.id ?? payload.jobid ?? input.notificationId);
  return input.channels.map((channel) => ({
    channel,
    recipient: channel === "sms" ? input.phone : input.email,
    provider: "PratikAll Sunucusu",
    status: "submitted",
    providerId,
  }));
}

async function sendSms(
  env: NotificationEnvironment,
  input: SendNotificationInput
): Promise<DeliveryResult> {
  const recipient = normalizeNetgsmNumber(input.phone);
  if (
    !configured(env.NETGSM_USERNAME) ||
    !configured(env.NETGSM_PASSWORD) ||
    !configured(env.NETGSM_MSGHEADER)
  ) {
    return {
      channel: "sms",
      recipient: input.phone,
      provider: "NETGSM",
      status: "failed",
      error: "NETGSM bağlantısı henüz etkinleştirilmedi.",
    };
  }

  try {
    const credentials = btoa(
      `${env.NETGSM_USERNAME!.trim()}:${env.NETGSM_PASSWORD!.trim()}`
    );
    const response = await fetch("https://api.netgsm.com.tr/sms/rest/v2/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `${input.notificationId}-sms`,
        ...(configured(env.NETGSM_APPNAME)
          ? { "X-App-Name": env.NETGSM_APPNAME!.trim() }
          : {}),
      },
      body: JSON.stringify({
        msgheader: env.NETGSM_MSGHEADER!.trim(),
        messages: [{ msg: input.message, no: recipient }],
        encoding: "TR",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await responsePayload(response);
    if (!response.ok) {
      return {
        channel: "sms",
        recipient: input.phone,
        provider: "NETGSM",
        status: "failed",
        error: providerError(payload, "NETGSM SMS gönderimini kabul etmedi."),
      };
    }

    const providerId = payload.jobid ?? payload.id ?? payload.code;
    return {
      channel: "sms",
      recipient: input.phone,
      provider: "NETGSM",
      status: "submitted",
      ...(providerId ? { providerId: String(providerId) } : {}),
    };
  } catch {
    return {
      channel: "sms",
      recipient: input.phone,
      provider: "NETGSM",
      status: "failed",
      error: "NETGSM servisine şu anda ulaşılamadı.",
    };
  }
}

async function sendEmail(
  env: NotificationEnvironment,
  input: SendNotificationInput
): Promise<DeliveryResult> {
  if (configured(env.EMAIL_PROVIDER_WEBHOOK_URL) && configured(env.NOTIFICATION_EMAIL_FROM)) {
    try {
      const response = await fetch(env.EMAIL_PROVIDER_WEBHOOK_URL!.trim(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `${input.notificationId}-email`,
          ...(configured(env.EMAIL_PROVIDER_WEBHOOK_TOKEN) ? { Authorization: `Bearer ${env.EMAIL_PROVIDER_WEBHOOK_TOKEN!.trim()}` } : {}),
        },
        body: JSON.stringify({
          from: env.NOTIFICATION_EMAIL_FROM!.trim(), to: input.email,
          replyTo: input.emailReplyTo || env.NOTIFICATION_EMAIL_REPLY_TO?.trim() || "",
          subject: input.subject, text: input.message,
          metadata: { notificationId: input.notificationId, accountId: input.accountId, eventType: input.eventType },
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const payload = await responsePayload(response);
      if (!response.ok) return { channel: "email", recipient: input.email, provider: "Sunucu E-posta Servisi", status: "failed", error: providerError(payload, "Sunucu e-posta geçidi gönderimi kabul etmedi.") };
      return { channel: "email", recipient: input.email, provider: "Sunucu E-posta Servisi", status: "submitted", providerId: String(payload.id ?? payload.messageId ?? input.notificationId) };
    } catch {
      return { channel: "email", recipient: input.email, provider: "Sunucu E-posta Servisi", status: "failed", error: "Sunucu e-posta geçidine şu anda ulaşılamadı." };
    }
  }

  if (!configured(env.RESEND_API_KEY) || !configured(env.NOTIFICATION_EMAIL_FROM)) {
    return {
      channel: "email",
      recipient: input.email,
      provider: "E-posta Servisi",
      status: "failed",
      error: "E-posta gönderim servisi henüz etkinleştirilmedi.",
    };
  }

  try {
    const configuredFrom = env.NOTIFICATION_EMAIL_FROM!.trim();
    const addressMatch = configuredFrom.match(/<([^>]+)>/);
    const senderAddress = addressMatch?.[1] ?? configuredFrom;
    const senderName = input.emailSenderName || input.brandName;
    const safeLogoUrl = /^https:\/\//i.test(input.logoUrl) ? input.logoUrl : "";
    const signature = input.emailSignature || `${input.brandName} ekibi`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `${input.notificationId}-email`,
      },
      body: JSON.stringify({
        from: `${senderName.replace(/[<>\r\n]/g, "")} <${senderAddress}>`,
        to: [input.email],
        subject: input.subject,
        text: input.message,
        html: `<div style="max-width:620px;margin:0 auto;font-family:Arial,sans-serif;line-height:1.6;color:#20232a">${safeLogoUrl ? `<img src="${escapeHtml(safeLogoUrl)}" alt="${escapeHtml(input.brandName)}" style="display:block;max-width:180px;max-height:80px;object-fit:contain;margin:0 0 24px">` : ""}<p>${escapeHtml(input.message).replaceAll("\n", "<br>")}</p><hr style="border:0;border-top:1px solid #ececef;margin:24px 0"><p style="font-size:12px;color:#777">${escapeHtml(signature).replaceAll("\n", "<br>")}</p></div>`,
        ...(input.emailReplyTo || configured(env.NOTIFICATION_EMAIL_REPLY_TO)
          ? {
              reply_to:
                input.emailReplyTo || env.NOTIFICATION_EMAIL_REPLY_TO!.trim(),
            }
          : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await responsePayload(response);
    if (!response.ok) {
      return {
        channel: "email",
        recipient: input.email,
        provider: "E-posta Servisi",
        status: "failed",
        error: providerError(payload, "E-posta servisi gönderimi kabul etmedi."),
      };
    }

    return {
      channel: "email",
      recipient: input.email,
      provider: "E-posta Servisi",
      status: "submitted",
      ...(payload.id ? { providerId: String(payload.id) } : {}),
    };
  } catch {
    return {
      channel: "email",
      recipient: input.email,
      provider: "E-posta Servisi",
      status: "failed",
      error: "E-posta servisine şu anda ulaşılamadı.",
    };
  }
}

export async function sendCustomerNotification(input: SendNotificationInput): Promise<DeliveryResult[]> {
  const env = runtimeEnv();
  if (configured(env.CUSTOMER_NOTIFICATION_WEBHOOK_URL)) {
    try {
      return await sendThroughWebhook(env, input);
    } catch {
      return input.channels.map((channel) => ({
        channel,
        recipient: channel === "sms" ? input.phone : input.email,
        provider: "PratikAll Sunucusu",
        status: "failed" as const,
        error: "Bildirim sunucusuna şu anda ulaşılamadı.",
      }));
    }
  }

  return Promise.all(
    input.channels.map((channel) =>
      channel === "sms" ? sendSms(env, input) : sendEmail(env, input)
    )
  );
}
