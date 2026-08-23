"use client";
import Link from "next/link";
import { useState } from "react";
type Row = Record<string, string | number | boolean | null | undefined>;
const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
function save(name: string, type: string, body: BlobPart) { const url = URL.createObjectURL(new Blob([body], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
async function rows(): Promise<Row[]> {
  const [a, f] = await Promise.all([fetch("/api/accounts"), fetch("/api/personal-finance")]);
  if (!a.ok || !f.ok) throw new Error("Veriler hazırlanamadı.");
  const accounts = await a.json() as { accounts?: Row[] }; const finance = await f.json() as Record<string, Row[]>;
  return [
    ...(accounts.accounts ?? []).map((r) => ({ modul: "Alacaklar", ...r })),
    ...(finance.expenses ?? []).map((r) => ({ modul: "Giderler", ...r })),
    ...(finance.bills ?? []).map((r) => ({ modul: "Faturalar", ...r })),
    ...(finance.subscriptions ?? []).map((r) => ({ modul: "Abonelikler", ...r })),
    ...(finance.reminders ?? []).map((r) => ({ modul: "Hatırlatmalar", ...r })),
    ...(finance.cards ?? []).map((r) => ({ modul: "Kredi kartları", ...r })),
    ...(finance.loans ?? []).map((r) => ({ modul: "Krediler", ...r })),
  ] as Row[];
}
export default function ExportPage() {
  const [busy, setBusy] = useState(""); const [message, setMessage] = useState("");
  async function run(format: "csv" | "xls" | "pdf") {
    setBusy(format); setMessage("");
    try {
      const data = await rows(); if (!data.length) { setMessage("Dışa aktarılabilecek bir kayıt bulunamadı."); return; }
      const keys = Array.from(new Set(data.flatMap((r) => Object.keys(r))));
      const table = `<table><thead><tr>${keys.map((k) => `<th>${k}</th>`).join("")}</tr></thead><tbody>${data.map((r) => `<tr>${keys.map((k) => `<td>${String(r[k] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      if (format === "csv") save("pratikall-verilerim.csv", "text/csv;charset=utf-8", `\ufeff${[keys.map(csvCell).join(","), ...data.map((r) => keys.map((k) => csvCell(r[k])).join(","))].join("\n")}`);
      if (format === "xls") save("pratikall-verilerim.xls", "application/vnd.ms-excel;charset=utf-8", `\ufeff${table}`);
      if (format === "pdf") { const popup = window.open("", "_blank", "noopener,noreferrer"); if (!popup) throw new Error("Yazdırma penceresi açılamadı."); popup.document.write(`<title>PratikAll Veri Özeti</title><style>body{font-family:Arial;padding:24px;color:#14213d}table{border-collapse:collapse;width:100%;font-size:10px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#eef4ff}h1{color:#0752bb}</style><h1>PratikAll Veri Özeti</h1>${table}`); popup.document.close(); popup.focus(); popup.print(); }
      setMessage("Verileriniz hazırlandı.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "İşlem tamamlanamadı."); } finally { setBusy(""); }
  }
  return <main className="account-page"><section className="account-card export-card"><p className="eyebrow">VERİLERİMİ DIŞA AKTAR</p><h1>Verileriniz, sizin kontrolünüzde</h1><p className="account-lead">PratikAll içindeki desteklenen kayıtlarınızı dilediğiniz formatta indirebilirsiniz.</p><div className="export-options"><button onClick={() => run("xls")} disabled={Boolean(busy)}><strong>Excel</strong><span>Düzenlenebilir çalışma tablosu</span></button><button onClick={() => run("csv")} disabled={Boolean(busy)}><strong>CSV</strong><span>Taşınabilir veri dosyası</span></button><button onClick={() => run("pdf")} disabled={Boolean(busy)}><strong>PDF</strong><span>Yazdırılabilir finans özeti</span></button></div>{message && <p className="account-note" role="status">{message}</p>}<Link className="quiet-account-link" href="/account">Güvenlik ve Verilerim&apos;e dön</Link></section></main>;
}
