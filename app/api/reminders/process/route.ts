import { processDueReminderEmails } from "@/app/lib/reminder-emails";

type RuntimeEnvironment = { REMINDER_CRON_TOKEN?: string };
function runtimeEnv() { return (globalThis as typeof globalThis & { __SITE_ENV__?: RuntimeEnvironment }).__SITE_ENV__ ?? {}; }

export async function POST(request: Request) {
  const token = runtimeEnv().REMINDER_CRON_TOKEN?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token || !supplied || supplied !== token) return Response.json({ error: "Yetkisiz istek." }, { status: 401 });
  try { return Response.json(await processDueReminderEmails(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Hatırlatmalar işlenemedi." }, { status: 500 }); }
}
