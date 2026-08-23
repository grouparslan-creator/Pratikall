type RuntimeEnvironment = { OPENAI_API_KEY?: string; OPENAI_MODEL?: string };

function runtimeEnv() {
  return (globalThis as typeof globalThis & { __SITE_ENV__?: RuntimeEnvironment }).__SITE_ENV__ ?? {};
}

function fallbackPlan(text: string, today: string) {
  const lower = text.toLocaleLowerCase("tr-TR");
  const target = new Date(`${today}T12:00:00Z`);
  const weekdays = ["pazar", "pazartesi", "salı", "çarşamba", "perşembe", "cuma", "cumartesi"];
  if (lower.includes("yarın")) target.setUTCDate(target.getUTCDate() + 1);
  else {
    const weekday = weekdays.findIndex((name) => lower.includes(name));
    if (weekday >= 0) {
      let delta = (weekday - target.getUTCDay() + 7) % 7;
      if (!delta) delta = 7;
      target.setUTCDate(target.getUTCDate() + delta);
    }
  }
  const time = lower.match(/(?:saat\s*)?(\d{1,2})[:.](\d{2})/);
  const hour = Math.min(23, Number(time?.[1] ?? 9));
  const minute = Math.min(59, Number(time?.[2] ?? 0));
  const lead = lower.match(/(\d+)\s*gün\s*önce/);
  return {
    title: text.replace(/\b(hatırlat|hatirlat|mail gönder|e-posta gönder)\b/gi, "").trim().slice(0, 160) || "Yeni hatırlatma",
    note: "PratikAll asistanıyla oluşturuldu.",
    dueAt: `${target.toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    priority: /önemli|acil/.test(lower) ? "high" : "normal",
    emailEnabled: /mail|e-posta|eposta/.test(lower),
    emailLeadMinutes: lead ? Math.min(7, Number(lead[1])) * 1440 : 1440,
    source: "local",
  };
}

export async function POST(request: Request) {
  const body = await request.json() as { text?: unknown; today?: unknown };
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 600) : "";
  const today = typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);
  if (!text) return Response.json({ error: "Asistana ne yapması gerektiğini yazın." }, { status: 400 });
  const env = runtimeEnv();
  if (!env.OPENAI_API_KEY) return Response.json(fallbackPlan(text, today));
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: env.OPENAI_MODEL || "gpt-5-mini", input: `Bugün ${today}, saat dilimi Europe/Istanbul. Bu Türkçe isteği bir hatırlatma taslağına çevir ve yalnızca JSON döndür: ${text}` }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return Response.json(fallbackPlan(text, today));
    const data = await response.json() as { output_text?: string };
    const parsed = JSON.parse((data.output_text || "").replace(/^```json|```$/g, "").trim()) as Record<string, unknown>;
    return Response.json({ ...fallbackPlan(text, today), ...parsed, source: "openai" });
  } catch {
    return Response.json(fallbackPlan(text, today));
  }
}
