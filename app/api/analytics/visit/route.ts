import { ensureAnalyticsTables, getD1 } from "@/db";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { visitorHash?: unknown };
    const visitorHash = typeof payload.visitorHash === "string" ? payload.visitorHash : "";
    if (!/^[a-f0-9]{64}$/.test(visitorHash)) {
      return Response.json({ error: "Geçersiz ziyaret verisi." }, { status: 400 });
    }

    await ensureAnalyticsTables();
    const db = getD1();
    const date = new Date().toISOString().slice(0, 10);
    await db.prepare(
      `INSERT INTO analytics_daily (date, page_views, unique_visitors)
       VALUES (?, 0, 0) ON CONFLICT(date) DO NOTHING`
    ).bind(date).run();
    const unique = await db.prepare(
      `INSERT INTO analytics_unique_visitors (date, visitor_hash)
       VALUES (?, ?) ON CONFLICT(date, visitor_hash) DO NOTHING`
    ).bind(date, visitorHash).run();
    await db.prepare(
      `UPDATE analytics_daily SET page_views = page_views + 1,
       unique_visitors = unique_visitors + ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?`
    ).bind(Number(unique.meta.changes ?? 0) > 0 ? 1 : 0, date).run();

    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Ziyaret kaydedilemedi." }, { status: 500 });
  }
}
