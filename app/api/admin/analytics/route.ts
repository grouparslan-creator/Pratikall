import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ensureAnalyticsTables, ensureMembershipsTable, getD1 } from "@/db";

function adminEmails() {
  return new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  if (!adminEmails().has(user.email.toLowerCase())) return Response.json({ error: "Yönetici yetkisi gerekli." }, { status: 403 });

  await ensureAnalyticsTables();
  await ensureMembershipsTable();
  const db = getD1();
  const [days, registrations] = await Promise.all([
    db.prepare(
      `SELECT date, page_views AS pageViews, unique_visitors AS uniqueVisitors
       FROM analytics_daily WHERE date >= date('now', '-29 days') ORDER BY date ASC`
    ).all<{ date: string; pageViews: number; uniqueVisitors: number }>(),
    db.prepare("SELECT COUNT(*) AS count FROM memberships").first<{ count: number }>(),
  ]);
  type AnalyticsDay = { date: string; pageViews: number; uniqueVisitors: number };
  const rows: AnalyticsDay[] = (days.results as AnalyticsDay[]).map((row: AnalyticsDay) => ({ ...row, pageViews: Number(row.pageViews), uniqueVisitors: Number(row.uniqueVisitors) }));
  const last = rows.at(-1);
  const sum = (count: number, key: "pageViews" | "uniqueVisitors") => rows.slice(-count).reduce((total, row) => total + row[key], 0);

  return Response.json({
    today: { pageViews: last?.date === new Date().toISOString().slice(0, 10) ? last.pageViews : 0, uniqueVisitors: last?.date === new Date().toISOString().slice(0, 10) ? last.uniqueVisitors : 0 },
    sevenDays: { pageViews: sum(7, "pageViews"), dailyUniqueVisitors: sum(7, "uniqueVisitors") },
    thirtyDays: { pageViews: sum(30, "pageViews"), dailyUniqueVisitors: sum(30, "uniqueVisitors") },
    registrations: Number(registrations?.count ?? 0),
    days: rows.slice(-7),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
