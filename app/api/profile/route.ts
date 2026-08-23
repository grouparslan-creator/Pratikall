import { getCurrentUserIdentity } from "@/app/user-identity";
import { ensureProfileModuleVersionColumn, ensureUserPreferencesTable, getD1 } from "@/db";

const THEMES = new Set(["red", "blue", "green", "purple", "graphite"]);
const MODULES = new Set([
  "overview", "accounts", "cards", "loans", "expenses", "bills",
  "subscriptions", "assistant", "calendar", "reports",
]);
const PERSONAL_MODULES = ["expenses", "bills", "subscriptions", "assistant"];

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type PreferenceRow = {
  ownerName: string;
  appName: string;
  companyName: string;
  theme: string;
  enabledModules: string;
  defaultReminderDays: number;
  logoKey: string;
  useDefaultLogo: number;
  emailSenderName: string;
  emailReplyTo: string;
  emailSignature: string;
  moduleVersion: number;
  setupCompleted: number;
};

function present(row: PreferenceRow) {
  return {
    ownerName: row.ownerName,
    appName: row.appName,
    companyName: row.companyName,
    theme: row.theme,
    enabledModules: row.enabledModules
      .split(",")
      .filter((module: string) => MODULES.has(module)),
    defaultReminderDays: row.defaultReminderDays,
    logoUrl: row.logoKey ? `/api/brand-assets/${encodeURIComponent(row.logoKey)}` : "",
    useDefaultLogo: Boolean(row.useDefaultLogo),
    emailSenderName: row.emailSenderName,
    emailReplyTo: row.emailReplyTo,
    emailSignature: row.emailSignature,
    setupCompleted: Boolean(row.setupCompleted),
  };
}

export async function GET() {
  try {
    const identity = await getCurrentUserIdentity();
    await ensureUserPreferencesTable();
    await ensureProfileModuleVersionColumn();
    const db = getD1();
    let row = await db
      .prepare(
        `SELECT
          owner_name AS ownerName,
          app_name AS appName,
          company_name AS companyName,
          theme,
          enabled_modules AS enabledModules,
          default_reminder_days AS defaultReminderDays,
          logo_key AS logoKey,
          use_default_logo AS useDefaultLogo,
          email_sender_name AS emailSenderName,
          email_reply_to AS emailReplyTo,
          email_signature AS emailSignature,
          module_version AS moduleVersion,
          setup_completed AS setupCompleted
        FROM user_preferences
        WHERE user_key = ?`
      )
      .bind(identity.key)
      .first<PreferenceRow>();

    if (row && row.moduleVersion < 4) {
      const upgraded = [...new Set([
        ...row.enabledModules.split(",").filter((module: string) => MODULES.has(module)),
        ...PERSONAL_MODULES,
      ])];
      const migrateLegacyBrand = row.appName.trim() === "Kırmızı Takip";
      const upgradedAppName = migrateLegacyBrand ? "PratikAll" : row.appName;
      const upgradedSenderName = row.emailSenderName.trim() === "Kırmızı Takip"
        ? "PratikAll"
        : row.emailSenderName;
      const upgradedSignature = row.emailSignature.trim() === "Kırmızı Takip ekibi"
        ? "PratikAll ekibi"
        : row.emailSignature;
      const upgradedDefaultLogo = migrateLegacyBrand ? 1 : row.useDefaultLogo;
      await db.prepare(
        `UPDATE user_preferences
         SET enabled_modules = ?, app_name = ?, email_sender_name = ?,
             email_signature = ?, use_default_logo = ?, module_version = 4,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_key = ?`
      ).bind(
        upgraded.join(","),
        upgradedAppName,
        upgradedSenderName,
        upgradedSignature,
        upgradedDefaultLogo,
        identity.key
      ).run();
      row = {
        ...row,
        enabledModules: upgraded.join(","),
        appName: upgradedAppName,
        emailSenderName: upgradedSenderName,
        emailSignature: upgradedSignature,
        useDefaultLogo: upgradedDefaultLogo,
        moduleVersion: 4,
      };
    }

    return Response.json({
      profile: row ? present(row) : null,
      suggestedOwnerName: identity.displayName.split(/\s+/)[0] || "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ayarlar alınamadı.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const identity = await getCurrentUserIdentity();
    await ensureUserPreferencesTable();
    await ensureProfileModuleVersionColumn();
    const payload = (await request.json()) as Record<string, unknown>;
    const ownerName = cleanText(payload.ownerName, 50);
    const appName = cleanText(payload.appName, 80) || (ownerName ? `${ownerName} Takip` : "");
    const companyName = cleanText(payload.companyName, 100);
    const requestedTheme = cleanText(payload.theme, 20);
    const theme = THEMES.has(requestedTheme) ? requestedTheme : "red";
    const requestedModules = Array.isArray(payload.enabledModules)
      ? payload.enabledModules.filter(
          (module): module is string => typeof module === "string" && MODULES.has(module)
        )
      : [];
    const enabledModules = [...new Set(requestedModules)];
    if (!enabledModules.includes("overview")) enabledModules.unshift("overview");
    if (!enabledModules.includes("accounts")) enabledModules.push("accounts");
    const rawReminderDays = Number(payload.defaultReminderDays);
    const defaultReminderDays = Number.isInteger(rawReminderDays)
      ? Math.min(30, Math.max(0, rawReminderDays))
      : 3;
    const useDefaultLogo = payload.useDefaultLogo === true;
    const emailSenderName = cleanText(payload.emailSenderName, 80) || appName;
    const emailReplyTo = cleanText(payload.emailReplyTo, 160).toLowerCase();
    const emailSignature = cleanText(payload.emailSignature, 500) || `${appName} ekibi`;

    if (ownerName.length < 2) {
      return Response.json(
        { error: "Görünen isim en az 2 karakter olmalıdır." },
        { status: 400 }
      );
    }
    if (appName.length < 3) {
      return Response.json(
        { error: "Program adı en az 3 karakter olmalıdır." },
        { status: 400 }
      );
    }
    if (!isValidEmail(emailReplyTo)) {
      return Response.json(
        { error: "Geçerli bir yanıt e-posta adresi girin." },
        { status: 400 }
      );
    }

    const db = getD1();
    await db
      .prepare(
        `INSERT INTO user_preferences (
          user_key, owner_name, app_name, company_name, theme,
          enabled_modules, default_reminder_days,
          use_default_logo, email_sender_name, email_reply_to,
          email_signature, setup_completed
          , module_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 4)
        ON CONFLICT(user_key) DO UPDATE SET
          owner_name = excluded.owner_name,
          app_name = excluded.app_name,
          company_name = excluded.company_name,
          theme = excluded.theme,
          enabled_modules = excluded.enabled_modules,
          default_reminder_days = excluded.default_reminder_days,
          use_default_logo = excluded.use_default_logo,
          email_sender_name = excluded.email_sender_name,
          email_reply_to = excluded.email_reply_to,
          email_signature = excluded.email_signature,
          module_version = 4,
          setup_completed = 1,
          updated_at = CURRENT_TIMESTAMP`
      )
      .bind(
        identity.key,
        ownerName,
        appName,
        companyName,
        theme,
        enabledModules.join(","),
        defaultReminderDays,
        useDefaultLogo ? 1 : 0,
        emailSenderName,
        emailReplyTo,
        emailSignature
      )
      .run();

    const row = await db
      .prepare(
        `SELECT
          owner_name AS ownerName,
          app_name AS appName,
          company_name AS companyName,
          theme,
          enabled_modules AS enabledModules,
          default_reminder_days AS defaultReminderDays,
          logo_key AS logoKey,
          use_default_logo AS useDefaultLogo,
          email_sender_name AS emailSenderName,
          email_reply_to AS emailReplyTo,
          email_signature AS emailSignature,
          module_version AS moduleVersion,
          setup_completed AS setupCompleted
        FROM user_preferences
        WHERE user_key = ?`
      )
      .bind(identity.key)
      .first<PreferenceRow>();

    return Response.json({ profile: row ? present(row) : null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ayarlar kaydedilemedi.";
    return Response.json({ error: message }, { status: 500 });
  }
}
