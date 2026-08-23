"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ModuleKey } from "./profile-types";

export type CalendarAccount = {
  id: string;
  customerName: string;
  company: string;
  remainingAmount: number;
  plannedPaymentMethod: string;
  dueDate: string;
};

type Expense = {
  id: string; title: string; merchant: string; category: string; scope: string;
  amount: number; paymentMethod: string; creditCardId: string; creditCardLabel: string;
  installmentCount: number; spentAt: string; sourceType: string; note: string;
};
type Bill = {
  id: string; name: string; provider: string; accountNumber: string; category: string;
  amount: number; dueDate: string; recurrence: string; autoPay: boolean; creditCardId: string;
  creditCardLabel: string; reminderDays: number; status: string; lastPaidAt: string; note: string;
};
type Subscription = {
  id: string; serviceName: string; category: string; amount: number; billingCycle: string;
  nextPaymentDate: string; creditCardId: string; creditCardLabel: string; autoRenew: boolean;
  reminderDays: number; status: string; trialEndDate: string; manageUrl: string; note: string;
};
type Reminder = {
  id: string; title: string; note: string; dueAt: string; priority: string;
  completed: boolean; calendarAdded: boolean; emailEnabled: boolean; emailLeadMinutes: number; createdAt: string;
};
type Budget = { id: string; month: string; amount: number };
type Card = {
  id: string; bank: string; cardName: string; lastFour: string; cardLimit: number;
  currentDebt: number; statementDate: string; dueDate: string; status: string;
};
type Loan = {
  id: string; bank: string; loanName: string; remainingDebt: number;
  installmentAmount: number; nextPaymentDate: string; status: string;
};
type PersonalData = {
  expenses: Expense[]; bills: Bill[]; subscriptions: Subscription[];
  reminders: Reminder[]; budgets: Budget[]; cards: Card[]; loans: Loan[];
};
type PersonalMode = "expenses" | "bills" | "subscriptions" | "assistant" | "calendar" | "reports";
type CalendarEvent = {
  id: string; type: string; title: string; detail: string; amount: number;
  date: string; status: "overdue" | "today" | "soon" | "planned"; sourceId?: string;
};

const emptyData: PersonalData = { expenses: [], bills: [], subscriptions: [], reminders: [], budgets: [], cards: [], loans: [] };
const expenseCategories = ["Market", "Yeme İçme", "Ulaşım", "Ev", "Fatura", "Sağlık", "Eğitim", "Giyim", "Teknoloji", "Eğlence", "Seyahat", "Dijital", "Diğer"];
const billCategories = ["Elektrik", "Su", "Doğalgaz", "İnternet", "Telefon", "Kira", "Aidat", "Sigorta", "Vergi", "Diğer"];
const paymentMethods = ["Nakit", "Banka Kartı", "Kredi Kartı", "Havale / EFT", "Otomatik Ödeme", "Diğer"];

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" });

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function currentMonth() { return today().slice(0, 7); }
function formatMoney(value: number) { return money.format(value / 100); }
function formatDate(value: string) {
  if (!value) return "Tarih yok";
  return dateFormat.format(new Date(`${value.slice(0, 10)}T12:00:00`));
}
function daysUntil(value: string) {
  return Math.round((Date.parse(`${value.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / 86_400_000);
}
function dueState(value: string) {
  const diff = daysUntil(value);
  if (diff < 0) return { key: "overdue" as const, label: `${Math.abs(diff)} gün gecikti` };
  if (diff === 0) return { key: "today" as const, label: "Bugün" };
  if (diff <= 7) return { key: "soon" as const, label: `${diff} gün kaldı` };
  return { key: "planned" as const, label: formatDate(value) };
}
function monthlyEquivalent(item: Subscription) {
  if (item.billingCycle === "weekly") return Math.round(item.amount * 52 / 12);
  if (item.billingCycle === "quarterly") return Math.round(item.amount / 3);
  if (item.billingCycle === "yearly") return Math.round(item.amount / 12);
  return item.amount;
}
function recurrenceLabel(value: string) {
  return ({ once: "Tek sefer", weekly: "Haftalık", monthly: "Aylık", quarterly: "3 aylık", yearly: "Yıllık" } as Record<string, string>)[value] || value;
}
function cardLabel(card: Card) {
  return `${card.bank} · ${card.cardName}${card.lastFour ? ` •••• ${card.lastFour}` : ""}`;
}
function csvCell(value: string | number) { return `"${String(value).replaceAll('"', '""')}"`; }

function usePersonalData() {
  const [data, setData] = useState<PersonalData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/personal-finance", { cache: "no-store" });
      const payload = (await response.json()) as PersonalData & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Kişisel finans kayıtları alınamadı.");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kişisel finans kayıtları alınamadı.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  return { data, loading, error, load };
}

function buildEvents(data: PersonalData, accounts: CalendarAccount[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const account of accounts.filter((item) => item.remainingAmount > 0)) {
    events.push({ id: `account-${account.id}`, type: "Tahsilat", title: account.customerName, detail: account.company || account.plannedPaymentMethod, amount: account.remainingAmount, date: account.dueDate, status: dueState(account.dueDate).key });
  }
  for (const bill of data.bills.filter((item) => item.status !== "paid")) {
    events.push({ id: `bill-${bill.id}`, sourceId: bill.id, type: "Fatura", title: bill.name, detail: bill.provider || bill.category, amount: bill.amount, date: bill.dueDate, status: dueState(bill.dueDate).key });
  }
  for (const subscription of data.subscriptions.filter((item) => item.status === "active")) {
    events.push({ id: `subscription-${subscription.id}`, sourceId: subscription.id, type: "Abonelik", title: subscription.serviceName, detail: subscription.creditCardLabel || recurrenceLabel(subscription.billingCycle), amount: subscription.amount, date: subscription.nextPaymentDate, status: dueState(subscription.nextPaymentDate).key });
  }
  for (const reminder of data.reminders.filter((item) => !item.completed && item.dueAt)) {
    events.push({ id: `reminder-${reminder.id}`, sourceId: reminder.id, type: "Hatırlatma", title: reminder.title, detail: reminder.note || "Kişisel not", amount: 0, date: reminder.dueAt.slice(0, 10), status: dueState(reminder.dueAt).key });
  }
  for (const card of data.cards.filter((item) => item.currentDebt > 0)) {
    events.push({ id: `card-${card.id}`, type: "Kart Ödemesi", title: card.cardName, detail: cardLabel(card), amount: card.currentDebt, date: card.dueDate, status: dueState(card.dueDate).key });
  }
  for (const loan of data.loans.filter((item) => item.remainingDebt > 0)) {
    events.push({ id: `loan-${loan.id}`, type: "Kredi Taksiti", title: loan.loanName, detail: loan.bank, amount: loan.installmentAmount, date: loan.nextPaymentDate, status: dueState(loan.nextPaymentDate).key });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

function safeIcs(value: string) { return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;"); }
function compactDate(value: string) { return value.replaceAll("-", ""); }
function nextDay(value: string) { const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10); }
function downloadCalendar(events: CalendarEvent[], filename: string) {
  const body = events.map((event) => [
    "BEGIN:VEVENT",
    `UID:${safeIcs(event.id)}@pratikall`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${compactDate(event.date)}`,
    `DTEND;VALUE=DATE:${compactDate(nextDay(event.date))}`,
    `SUMMARY:${safeIcs(`${event.type}: ${event.title}`)}`,
    `DESCRIPTION:${safeIcs(`${event.detail}${event.amount ? ` · ${formatMoney(event.amount)}` : ""}`)}`,
    "END:VEVENT",
  ].join("\r\n")).join("\r\n");
  const blob = new Blob([`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//PratikAll//TR\r\n${body}\r\nEND:VCALENDAR`], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}
function calendarUrl(event: CalendarEvent, provider: "google" | "outlook") {
  const title = `${event.type}: ${event.title}`;
  const detail = `${event.detail}${event.amount ? ` · ${formatMoney(event.amount)}` : ""}`;
  if (provider === "google") {
    const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${compactDate(event.date)}/${compactDate(nextDay(event.date))}`, details: detail });
    return `https://calendar.google.com/calendar/render?${params}`;
  }
  const params = new URLSearchParams({ path: "/calendar/action/compose", rru: "addevent", subject: title, startdt: `${event.date}T09:00:00`, enddt: `${event.date}T10:00:00`, body: detail });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}

export function PersonalFinanceSnapshot({ onNavigate }: { onNavigate: (module: ModuleKey) => void }) {
  const { data, loading } = usePersonalData();
  const month = currentMonth();
  const monthExpenses = data.expenses.filter((item) => item.spentAt.startsWith(month));
  const spent = monthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const budget = data.budgets.find((item) => item.month === month)?.amount || 0;
  const upcoming = [
    ...data.bills.filter((item) => item.status !== "paid" && daysUntil(item.dueDate) >= 0 && daysUntil(item.dueDate) <= 7).map((item) => item.amount),
    ...data.subscriptions.filter((item) => item.status === "active" && daysUntil(item.nextPaymentDate) >= 0 && daysUntil(item.nextPaymentDate) <= 7).map((item) => item.amount),
  ].reduce((sum, value) => sum + value, 0);
  const recurring = data.subscriptions.filter((item) => item.status === "active").reduce((sum, item) => sum + monthlyEquivalent(item), 0);
  const reminders = data.reminders.filter((item) => !item.completed).length;

  return <section className="personal-snapshot">
    <div className="personal-snapshot-head"><div><span>KİŞİSEL ASİSTAN</span><h2>Bu ayın kişisel finans görünümü</h2></div><button onClick={() => onNavigate("assistant")}>Asistanı aç →</button></div>
    {loading ? <div className="personal-loading">Kişisel özet hazırlanıyor…</div> : <>
      <div className="personal-kpi-grid">
        <button onClick={() => onNavigate("expenses")}><i>↘</i><span>Bu ay harcama</span><strong>{formatMoney(spent)}</strong><small>{monthExpenses.length} hareket</small></button>
        <button onClick={() => onNavigate("bills")}><i>◷</i><span>7 gün içinde</span><strong>{formatMoney(upcoming)}</strong><small>Fatura ve abonelik</small></button>
        <button onClick={() => onNavigate("subscriptions")}><i>↻</i><span>Aylık abonelik</span><strong>{formatMoney(recurring)}</strong><small>Normalize edilmiş toplam</small></button>
        <button onClick={() => onNavigate("assistant")}><i>✓</i><span>Bekleyen hatırlatma</span><strong>{reminders}</strong><small>Not ve yapılacak iş</small></button>
      </div>
      <div className="budget-ribbon"><div><span>Aylık bütçe</span><strong>{budget ? `${formatMoney(spent)} / ${formatMoney(budget)}` : "Henüz belirlenmedi"}</strong></div><div className="budget-track"><i style={{ width: `${budget ? Math.min(100, Math.round(spent / budget * 100)) : 0}%` }} /></div><button onClick={() => onNavigate("reports")}>{budget ? `%${Math.round(spent / budget * 100)} kullanıldı` : "Bütçe oluştur"}</button></div>
    </>}
  </section>;
}

export default function PersonalFinancePanel({ mode, accounts = [] }: { mode: PersonalMode; accounts?: CalendarAccount[] }) {
  const { data, loading, error, load } = usePersonalData();
  const [modalOpen, setModalOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Kredi Kartı");
  const [submitting, setSubmitting] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [toast, setToast] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const month = currentMonth();
  const events = useMemo(() => buildEvents(data, accounts), [accounts, data]);

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3600); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (mode !== "assistant" || !("Notification" in window) || Notification.permission !== "granted") return;
    const urgent = events.filter((event) => event.status === "today" || event.status === "overdue");
    const key = `finance-alert-${today()}`;
    if (urgent.length && !window.sessionStorage.getItem(key)) {
      new Notification("Finans asistanınız", { body: `${urgent.length} ödeme veya hatırlatma bugün ilginizi bekliyor.` });
      window.sessionStorage.setItem(key, "1");
    }
  }, [events, mode]);

  const monthExpenses = useMemo(() => data.expenses.filter((item) => item.spentAt.startsWith(month)), [data.expenses, month]);
  const monthSpent = monthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const currentBudget = data.budgets.find((item) => item.month === month)?.amount || 0;

  async function createRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tl = (name: string) => Math.round(Number(form.get(name)) * 100);
    let payload: Record<string, unknown>;
    if (mode === "expenses") payload = { entity: "expense", title: form.get("title"), merchant: form.get("merchant"), category: form.get("category"), scope: form.get("scope"), amount: tl("amount"), paymentMethod, creditCardId: paymentMethod === "Kredi Kartı" ? form.get("creditCardId") : "", installmentCount: form.get("installmentCount"), spentAt: form.get("spentAt"), note: form.get("note") };
    else if (mode === "bills") payload = { entity: "bill", name: form.get("name"), provider: form.get("provider"), accountNumber: form.get("accountNumber"), category: form.get("category"), amount: tl("amount"), dueDate: form.get("dueDate"), recurrence: form.get("recurrence"), autoPay: form.get("autoPay") === "on", creditCardId: form.get("creditCardId"), reminderDays: form.get("reminderDays"), note: form.get("note") };
    else if (mode === "subscriptions") payload = { entity: "subscription", serviceName: form.get("serviceName"), category: form.get("category"), amount: tl("amount"), billingCycle: form.get("billingCycle"), nextPaymentDate: form.get("nextPaymentDate"), creditCardId: form.get("creditCardId"), autoRenew: form.get("autoRenew") === "on", reminderDays: form.get("reminderDays"), trialEndDate: form.get("trialEndDate"), manageUrl: form.get("manageUrl"), note: form.get("note") };
    else payload = { entity: "reminder", title: form.get("title"), note: form.get("note"), dueAt: form.get("dueAt"), priority: form.get("priority"), emailEnabled: form.get("emailEnabled") === "on", emailLeadMinutes: form.get("emailLeadMinutes") };
    setSubmitting(true);
    try {
      const response = await fetch("/api/personal-finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Kayıt oluşturulamadı.");
      setModalOpen(false); setToast(mode === "expenses" ? "Harcama eklendi; kart borcu güncellendi." : mode === "bills" ? "Fatura takibe alındı." : mode === "subscriptions" ? "Abonelik takibe alındı." : "Not ve hatırlatma kaydedildi.");
      await load();
    } catch (err) { setToast(err instanceof Error ? err.message : "Kayıt oluşturulamadı."); }
    finally { setSubmitting(false); }
  }

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setSubmitting(true);
    try {
      const response = await fetch("/api/personal-finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "budget", month: form.get("month"), amount: Math.round(Number(form.get("amount")) * 100) }) });
      const result = (await response.json()) as { error?: string }; if (!response.ok) throw new Error(result.error || "Bütçe kaydedilemedi.");
      setBudgetOpen(false); setToast("Aylık bütçe kaydedildi."); await load();
    } catch (err) { setToast(err instanceof Error ? err.message : "Bütçe kaydedilemedi."); } finally { setSubmitting(false); }
  }

  async function runAction(entity: string, id: string, action: string, extra: Record<string, unknown> = {}) {
    setWorkingId(id);
    try {
      const response = await fetch("/api/personal-finance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, id, action, ...extra }) });
      const result = (await response.json()) as { error?: string; nextDate?: string | null };
      if (!response.ok) throw new Error(result.error || "İşlem tamamlanamadı.");
      setToast(action === "pay" ? result.nextDate ? `Ödeme harcamalara işlendi; sonraki tarih ${formatDate(result.nextDate)}.` : "Ödeme harcamalara işlendi." : "Kayıt güncellendi.");
      await load();
    } catch (err) { setToast(err instanceof Error ? err.message : "İşlem tamamlanamadı."); } finally { setWorkingId(""); }
  }

  async function remove(entity: string, id: string, label: string) {
    if (!window.confirm(`${label} silinsin mi?`)) return; setWorkingId(id);
    try {
      const response = await fetch(`/api/personal-finance?entity=${encodeURIComponent(entity)}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string }; if (!response.ok) throw new Error(result.error || "Kayıt silinemedi.");
      setToast(entity === "expense" ? "Harcama silindi; bağlı kart borcu geri güncellendi." : "Kayıt silindi."); await load();
    } catch (err) { setToast(err instanceof Error ? err.message : "Kayıt silinemedi."); } finally { setWorkingId(""); }
  }

  async function enableNotifications() {
    if (!("Notification" in window)) { setToast("Bu tarayıcı bildirimleri desteklemiyor."); return; }
    const permission = await Notification.requestPermission();
    setToast(permission === "granted" ? "Program açıkken yaklaşan işler için tarayıcı bildirimi verilecek." : "Bildirim izni verilmedi; hatırlatmalar uygulama ve takvimde görünmeye devam edecek.");
  }

  async function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assistantText.trim()) return;
    setAssistantBusy(true);
    try {
      const response = await fetch("/api/assistant/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: assistantText, today: today() }) });
      const result = await response.json() as { title?: string; note?: string; dueAt?: string; priority?: string; emailEnabled?: boolean; emailLeadMinutes?: number; error?: string };
      if (!response.ok) throw new Error(result.error || "Asistan isteği anlayamadı.");
      const when = result.dueAt ? `${formatDate(result.dueAt)} ${result.dueAt.slice(11)}` : "tarihsiz";
      const approved = window.confirm(`Hatırlatma oluşturulsun mu?\n\n${result.title || assistantText}\n${when}${result.emailEnabled ? "\nE-posta hatırlatması açık" : ""}`);
      if (!approved) return;
      const save = await fetch("/api/personal-finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "reminder", ...result }) });
      const saved = await save.json() as { error?: string };
      if (!save.ok) throw new Error(saved.error || "Hatırlatma kaydedilemedi.");
      setAssistantText("");
      setToast("Asistan hatırlatmayı hazırladı ve kaydetti.");
      await load();
    } catch (err) { setToast(err instanceof Error ? err.message : "Asistan isteği anlayamadı."); }
    finally { setAssistantBusy(false); }
  }

  function exportExpenses() {
    const header = ["Tarih", "Harcama", "İşyeri", "Kategori", "Tür", "Tutar", "Ödeme Yöntemi", "Kredi Kartı", "Taksit", "Not"];
    const rows = data.expenses.map((item) => [item.spentAt, item.title, item.merchant, item.category, item.scope === "business" ? "İş" : "Kişisel", (item.amount / 100).toFixed(2), item.paymentMethod, item.creditCardLabel, item.installmentCount, item.note]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `kisisel-harcamalar-${today()}.csv`; link.click(); URL.revokeObjectURL(url); setToast("Kişisel harcama raporu indirildi.");
  }

  const title = mode === "expenses" ? ["KİŞİSEL HARCAMALAR", "Paranızın nereye gittiğini görün.", "Nakit, banka kartı ve kredi kartı harcamalarını kategori bazında izleyin."] : mode === "bills" ? ["FATURALAR", "Son ödeme tarihlerini kaçırmayın.", "Tek seferlik veya düzenli faturaları, otomatik ödeme ve kullanılan kartla birlikte takip edin."] : mode === "subscriptions" ? ["DİJİTAL ABONELİKLER", "Tekrarlayan üyelikler kontrolünüzde.", "Yenileme tarihini, tutarı ve hangi kredi kartından çekildiğini tek yerde görün."] : mode === "assistant" ? ["KİŞİSEL ASİSTAN", "Aklınızdakileri programa bırakın.", "Notları, yapılacak işleri ve yaklaşan ödeme uyarılarını tek yerde yönetin."] : mode === "calendar" ? ["BİRLEŞİK TAKVİM", "Bütün finansal tarihleri bir araya getirin.", "Tahsilat, kart, kredi, fatura, abonelik ve hatırlatmaları aynı sırada görün."] : ["KİŞİSEL RAPORLAR", "Harcama alışkanlıklarınızı anlaşılır görün.", "Bütçe, kategori, ödeme yöntemi ve abonelik maliyetlerini karşılaştırın."];
  const addLabel = mode === "expenses" ? "Harcama Ekle" : mode === "bills" ? "Fatura Ekle" : mode === "subscriptions" ? "Abonelik Ekle" : "Not / Hatırlatma Ekle";

  return <div className="content-wrap personal-finance-wrap">
    <section className="welcome-row personal-welcome"><div><p className="eyebrow">{title[0]}</p><h1>{title[1]}</h1><p className="welcome-copy">{title[2]}</p></div><div className="personal-head-actions">{mode === "reports" && <button className="secondary-button" onClick={() => setBudgetOpen(true)}>◎ Bütçe Ayarla</button>}{mode === "calendar" && <button className="secondary-button" disabled={!events.length} onClick={() => downloadCalendar(events, `finans-takvimi-${today()}.ics`)}>↓ Tüm Takvimi İndir</button>}{mode === "expenses" && <button className="secondary-button" disabled={!data.expenses.length} onClick={exportExpenses}>↓ Rapor</button>}{["expenses", "bills", "subscriptions", "assistant"].includes(mode) && <button className="primary-button" onClick={() => { setPaymentMethod("Kredi Kartı"); setModalOpen(true); }}>＋ {addLabel}</button>}</div></section>
    {mode === "assistant" && <form className="ai-command-bar" onSubmit={askAssistant}><div><span>✦</span><input value={assistantText} onChange={(event) => setAssistantText(event.target.value)} placeholder="Cuma 10:00'da faturayı hatırlat, 1 gün önce mail gönder" aria-label="PratikAll asistana yaz" /></div><button disabled={assistantBusy}>{assistantBusy ? "Hazırlıyor…" : "Planla"}</button><small>Asistan bir taslak hazırlar; kaydetmeden önce siz onaylarsınız.</small></form>}
    {error ? <div className="state-box error-state"><strong>Kayıtlar yüklenemedi</strong><span>{error}</span><button onClick={() => void load()}>Tekrar dene</button></div> : loading ? <div className="state-box">Finans asistanınız hazırlanıyor…</div> : mode === "expenses" ? <ExpensesView data={data} monthExpenses={monthExpenses} monthSpent={monthSpent} budget={currentBudget} workingId={workingId} onDelete={remove} /> : mode === "bills" ? <BillsView data={data} workingId={workingId} onPay={(id) => void runAction("bill", id, "pay", { paidAt: today() })} onDelete={remove} /> : mode === "subscriptions" ? <SubscriptionsView data={data} workingId={workingId} onPay={(id) => void runAction("subscription", id, "pay", { paidAt: today() })} onStatus={(id, status) => void runAction("subscription", id, "status", { status })} onDelete={remove} /> : mode === "assistant" ? <AssistantView data={data} events={events} workingId={workingId} onComplete={(id) => void runAction("reminder", id, "complete")} onDelete={remove} onEnableNotifications={() => void enableNotifications()} /> : mode === "calendar" ? <CalendarView events={events} /> : <ReportsView data={data} monthExpenses={monthExpenses} monthSpent={monthSpent} budget={currentBudget} onBudget={() => setBudgetOpen(true)} />}
    {modalOpen && <EntryModal mode={mode} data={data} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} submitting={submitting} onClose={() => setModalOpen(false)} onSubmit={createRecord} />}
    {budgetOpen && <BudgetModal budget={currentBudget} submitting={submitting} onClose={() => setBudgetOpen(false)} onSubmit={saveBudget} />}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function ExpensesView({ data, monthExpenses, monthSpent, budget, workingId, onDelete }: { data: PersonalData; monthExpenses: Expense[]; monthSpent: number; budget: number; workingId: string; onDelete: (entity: string, id: string, label: string) => void }) {
  const cardSpend = monthExpenses.filter((item) => item.paymentMethod === "Kredi Kartı").reduce((sum, item) => sum + item.amount, 0);
  const daily = Math.round(monthSpent / Math.max(1, Number(today().slice(8, 10))));
  return <><section className="personal-summary-grid"><Kpi icon="↘" label="Bu Ay Harcama" value={formatMoney(monthSpent)} detail={`${monthExpenses.length} hareket`} main /><Kpi icon="▣" label="Kredi Kartıyla" value={formatMoney(cardSpend)} detail={`%${monthSpent ? Math.round(cardSpend / monthSpent * 100) : 0} pay`} /><Kpi icon="≈" label="Günlük Ortalama" value={formatMoney(daily)} detail="Ayın geçen günleri" /><Kpi icon="◎" label="Bütçede Kalan" value={budget ? formatMoney(Math.max(0, budget - monthSpent)) : "Belirlenmedi"} detail={budget ? `%${Math.round(monthSpent / budget * 100)} kullanıldı` : "Raporlardan belirleyin"} /></section><section className="accounts-panel personal-list-panel"><div className="panel-head"><div><h2>Harcama Geçmişi</h2><p>{data.expenses.length} kayıt</p></div></div>{data.expenses.length ? <div className="personal-list">{data.expenses.map((item) => <article className="personal-row" key={item.id}><div className="personal-identity"><span className="personal-type-icon">{categoryIcon(item.category)}</span><div><h3>{item.title}</h3><p>{item.merchant || item.category} · {item.scope === "business" ? "İş" : "Kişisel"}</p></div></div><div className="personal-value"><span>Tutar</span><strong>{formatMoney(item.amount)}</strong>{item.installmentCount > 1 && <small>{item.installmentCount} taksit · {formatMoney(Math.round(item.amount / item.installmentCount))}/ay</small>}</div><div className="personal-value"><span>Ödeme</span><strong>{item.paymentMethod}</strong><small>{item.creditCardLabel || item.category}</small></div><div className="personal-value"><span>Tarih</span><strong>{formatDate(item.spentAt)}</strong><small>{item.sourceType !== "manual" ? "Otomatik işlendi" : item.note || "Manuel kayıt"}</small></div><button className="row-delete" disabled={workingId === item.id} onClick={() => onDelete("expense", item.id, item.title)} aria-label={`${item.title} harcamasını sil`}>×</button></article>)}</div> : <Empty icon="↘" title="Henüz harcama yok" text="İlk kişisel harcamanızı ekleyin; raporlar otomatik oluşsun." />}</section></>;
}

function BillsView({ data, workingId, onPay, onDelete }: { data: PersonalData; workingId: string; onPay: (id: string) => void; onDelete: (entity: string, id: string, label: string) => void }) {
  const open = data.bills.filter((item) => item.status !== "paid"); const total = open.reduce((sum, item) => sum + item.amount, 0); const upcoming = open.filter((item) => daysUntil(item.dueDate) >= 0 && daysUntil(item.dueDate) <= 7).reduce((sum, item) => sum + item.amount, 0); const overdue = open.filter((item) => daysUntil(item.dueDate) < 0).length;
  return <><section className="personal-summary-grid"><Kpi icon="⌁" label="Bekleyen Fatura" value={formatMoney(total)} detail={`${open.length} açık kayıt`} main /><Kpi icon="◷" label="7 Gün İçinde" value={formatMoney(upcoming)} detail="Yaklaşan ödemeler" /><Kpi icon="↻" label="Otomatik Ödeme" value={String(open.filter((item) => item.autoPay).length)} detail="Tanımlı fatura" /><Kpi icon="!" label="Geciken" value={String(overdue)} detail="Kontrol bekliyor" danger /></section><section className="accounts-panel personal-list-panel"><div className="panel-head"><div><h2>Fatura Takibi</h2><p>Ödendi işaretlendiğinde harcamalara otomatik eklenir.</p></div></div>{data.bills.length ? <div className="personal-list">{data.bills.map((item) => { const closed = item.status === "paid"; const due = dueState(item.dueDate); return <article className={`personal-row status-${closed ? "paid" : due.key}`} key={item.id}><div className="personal-identity"><span className="personal-type-icon">⌁</span><div><h3>{item.name}</h3><p>{item.provider || item.category}{item.accountNumber ? ` · ${item.accountNumber}` : ""}</p></div></div><div className="personal-value"><span>Tutar</span><strong>{formatMoney(item.amount)}</strong><small>{recurrenceLabel(item.recurrence)}</small></div><div className="personal-value"><span>Ödeme Kaynağı</span><strong>{item.creditCardLabel || (item.autoPay ? "Otomatik ödeme" : "Tanımlanmadı")}</strong><small>{item.autoPay ? "Otomatik ödeme açık" : "Manuel ödeme"}</small></div><div className="personal-value"><span>Son Ödeme</span><strong>{formatDate(item.dueDate)}</strong><em className={`due-badge badge-${closed ? "paid" : due.key}`}>{closed ? "Ödendi" : due.label}</em></div><div className="personal-row-actions"><label className={`paid-toggle ${closed ? "is-paid" : ""}`}><input type="checkbox" checked={closed || workingId === item.id} disabled={closed || workingId === item.id} onChange={() => onPay(item.id)} /><span>✓</span><b>{workingId === item.id ? "İşleniyor" : "Ödendi"}</b></label><button className="row-delete" onClick={() => onDelete("bill", item.id, item.name)}>×</button></div></article>; })}</div> : <Empty icon="⌁" title="Henüz fatura yok" text="Elektrik, internet, kira ve diğer düzenli ödemeleri ekleyin." />}</section></>;
}

function SubscriptionsView({ data, workingId, onPay, onStatus, onDelete }: { data: PersonalData; workingId: string; onPay: (id: string) => void; onStatus: (id: string, status: string) => void; onDelete: (entity: string, id: string, label: string) => void }) {
  const active = data.subscriptions.filter((item) => item.status === "active"); const monthly = active.reduce((sum, item) => sum + monthlyEquivalent(item), 0); const yearly = monthly * 12; const upcoming = active.filter((item) => daysUntil(item.nextPaymentDate) >= 0 && daysUntil(item.nextPaymentDate) <= 7).reduce((sum, item) => sum + item.amount, 0);
  return <><section className="personal-summary-grid"><Kpi icon="↻" label="Aylık Abonelik" value={formatMoney(monthly)} detail="Aylık karşılık" main /><Kpi icon="∑" label="Yıllık Tahmin" value={formatMoney(yearly)} detail="Aktif üyelikler" /><Kpi icon="◷" label="7 Gün İçinde" value={formatMoney(upcoming)} detail="Yaklaşan çekimler" /><Kpi icon="✓" label="Aktif Abonelik" value={String(active.length)} detail={`${data.subscriptions.filter((item) => item.status !== "active").length} pasif`} /></section><section className="accounts-panel personal-list-panel"><div className="panel-head"><div><h2>Dijital Abonelikler</h2><p>Tahsil edildiğinde harcamalara ve kart borcuna otomatik işler.</p></div></div>{data.subscriptions.length ? <div className="personal-list">{data.subscriptions.map((item) => { const due = dueState(item.nextPaymentDate); const activeItem = item.status === "active"; return <article className={`personal-row status-${activeItem ? due.key : "paid"}`} key={item.id}><div className="personal-identity"><span className="personal-type-icon">↻</span><div><h3>{item.serviceName}</h3><p>{item.category} · {recurrenceLabel(item.billingCycle)}</p></div></div><div className="personal-value"><span>Tutar</span><strong>{formatMoney(item.amount)}</strong><small>Aylık karşılık {formatMoney(monthlyEquivalent(item))}</small></div><div className="personal-value"><span>Tanımlı Kart</span><strong>{item.creditCardLabel || "Kart tanımlanmadı"}</strong><small>{item.autoRenew ? "Otomatik yenilenir" : "Manuel yenileme"}</small></div><div className="personal-value"><span>Sonraki Çekim</span><strong>{formatDate(item.nextPaymentDate)}</strong><em className={`due-badge badge-${activeItem ? due.key : "paid"}`}>{activeItem ? due.label : item.status === "paused" ? "Duraklatıldı" : "İptal"}</em></div><div className="subscription-actions">{activeItem && <button className="mini-primary" disabled={workingId === item.id} onClick={() => onPay(item.id)}>✓ Tahsil edildi</button>}<button onClick={() => onStatus(item.id, activeItem ? "paused" : "active")}>{activeItem ? "Duraklat" : "Aktif et"}</button>{item.manageUrl && <a href={item.manageUrl} target="_blank" rel="noreferrer">Yönet</a>}<button className="row-delete" onClick={() => onDelete("subscription", item.id, item.serviceName)}>×</button></div></article>; })}</div> : <Empty icon="↻" title="Henüz abonelik yok" text="Dijital platform, yazılım ve üyelikleri kullandığınız kartla birlikte ekleyin." />}</section></>;
}

function AssistantView({ data, events, workingId, onComplete, onDelete, onEnableNotifications }: { data: PersonalData; events: CalendarEvent[]; workingId: string; onComplete: (id: string) => void; onDelete: (entity: string, id: string, label: string) => void; onEnableNotifications: () => void }) {
  const focus = events.filter((item) => daysUntil(item.date) <= 7).slice(0, 6); const openNotes = data.reminders.filter((item) => !item.completed); const activeSubs = data.subscriptions.filter((item) => item.status === "active"); const noCard = activeSubs.filter((item) => !item.creditCardId).length; const monthly = activeSubs.reduce((sum, item) => sum + monthlyEquivalent(item), 0);
  return <section className="assistant-grid"><article className="assistant-focus-card"><div className="assistant-section-head"><div><span>BUGÜNÜN ODAĞI</span><h2>Yaklaşan işler</h2></div><button onClick={onEnableNotifications}>◉ Bildirimleri Aç</button></div>{focus.length ? <div className="focus-list">{focus.map((item) => <div key={item.id} className={`focus-row focus-${item.status}`}><span>{item.type.slice(0, 1)}</span><div><strong>{item.title}</strong><small>{item.type} · {formatDate(item.date)}</small></div>{item.amount > 0 && <b>{formatMoney(item.amount)}</b>}<em>{dueState(item.date).label}</em></div>)}</div> : <div className="compact-empty"><b>✓</b><span>Önümüzdeki 7 gün için acil iş görünmüyor.</span></div>}</article><aside className="assistant-insights"><span>ASİSTAN ÖNERİLERİ</span><div><b>↻</b><p><strong>Abonelik görünümü</strong><small>Aktif üyeliklerin aylık karşılığı {formatMoney(monthly)}.</small></p></div>{noCard > 0 && <div><b>▣</b><p><strong>{noCard} abonelikte kart eksik</strong><small>Hangi karttan çekildiğini eklerseniz raporlar netleşir.</small></p></div>}<div><b>◷</b><p><strong>Takvim desteği</strong><small>Önemli kayıtları Google, Outlook veya Apple takviminize ekleyebilirsiniz.</small></p></div></aside><article className="accounts-panel assistant-notes"><div className="panel-head"><div><h2>Notlar ve Hatırlatmalar</h2><p>{openNotes.length} bekleyen kayıt</p></div></div>{data.reminders.length ? <div className="notes-list">{data.reminders.map((item) => <article className={`note-row priority-${item.priority} ${item.completed ? "completed" : ""}`} key={item.id}><label className="note-check"><input type="checkbox" checked={item.completed || workingId === item.id} disabled={workingId === item.id} onChange={() => onComplete(item.id)} /><span>✓</span></label><div><h3>{item.title}</h3>{item.note && <p>{item.note}</p>}<small>{item.dueAt ? formatDate(item.dueAt) + (item.dueAt.includes("T") ? ` · ${item.dueAt.slice(11)}` : "") : "Tarihsiz not"} · {item.priority === "high" ? "Yüksek öncelik" : item.priority === "low" ? "Düşük öncelik" : "Normal"}</small></div><button className="row-delete" onClick={() => onDelete("reminder", item.id, item.title)}>×</button></article>)}</div> : <Empty icon="✓" title="Henüz not yok" text="Unutmamanız gereken işleri ve tarihsiz notları buraya bırakın." />}</article></section>;
}

function CalendarView({ events }: { events: CalendarEvent[] }) {
  return <section className="accounts-panel unified-calendar"><div className="panel-head"><div><h2>Yaklaşan Tarihler</h2><p>{events.length} ödeme ve hatırlatma tek listede</p></div><div className="calendar-legend"><span>Google</span><span>Outlook</span><span>Apple / ICS</span></div></div>{events.length ? <div className="unified-calendar-list">{events.map((event) => <article className={`unified-event status-${event.status}`} key={event.id}><time dateTime={event.date}><strong>{new Date(`${event.date}T12:00:00`).getDate()}</strong><span>{new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(new Date(`${event.date}T12:00:00`))}</span></time><span className="event-type">{event.type}</span><div><h3>{event.title}</h3><p>{event.detail}</p></div>{event.amount > 0 && <strong className="event-amount">{formatMoney(event.amount)}</strong>}<em className={`due-badge badge-${event.status}`}>{dueState(event.date).label}</em><div className="calendar-sync-actions"><a href={calendarUrl(event, "google")} target="_blank" rel="noreferrer" aria-label="Google Takvim'e ekle">G</a><a href={calendarUrl(event, "outlook")} target="_blank" rel="noreferrer" aria-label="Outlook Takvim'e ekle">O</a><button onClick={() => downloadCalendar([event], `${event.title.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/g, "-") || "hatirlatma"}.ics`)} aria-label="Apple Takvim veya ICS dosyasına ekle">↓</button></div></article>)}</div> : <Empty icon="◷" title="Takvim boş" text="Fatura, abonelik veya hatırlatma eklediğinizde burada birleşecek." />}<div className="calendar-sync-note"><b>Takvim senkronizasyonu</b><p>Google ve Outlook düğmeleri olayı doğrudan takvime hazırlar. Apple Takvim için ICS dosyası indirilir. Kendi sunucunuza geçildiğinde sağlayıcı hesabı bağlanarak otomatik çift yönlü senkronizasyon etkinleştirilebilir.</p></div></section>;
}

function ReportsView({ data, monthExpenses, monthSpent, budget, onBudget }: { data: PersonalData; monthExpenses: Expense[]; monthSpent: number; budget: number; onBudget: () => void }) {
  const previousDate = new Date(`${currentMonth()}-01T12:00:00Z`); previousDate.setUTCMonth(previousDate.getUTCMonth() - 1); const previousMonth = previousDate.toISOString().slice(0, 7); const previousSpent = data.expenses.filter((item) => item.spentAt.startsWith(previousMonth)).reduce((sum, item) => sum + item.amount, 0); const recurring = data.subscriptions.filter((item) => item.status === "active").reduce((sum, item) => sum + monthlyEquivalent(item), 0); const categories = expenseCategories.map((category) => ({ category, amount: monthExpenses.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0) })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount); const methods = paymentMethods.map((method) => ({ method, amount: monthExpenses.filter((item) => item.paymentMethod === method).reduce((sum, item) => sum + item.amount, 0) })).filter((item) => item.amount > 0); const cardRows = data.cards.map((card) => ({ label: cardLabel(card), amount: monthExpenses.filter((item) => item.creditCardId === card.id).reduce((sum, item) => sum + item.amount, 0) })).filter((item) => item.amount > 0); const change = previousSpent ? Math.round((monthSpent - previousSpent) / previousSpent * 100) : 0;
  return <><section className="report-grid personal-report-cards"><article className="report-card"><span>BU AY HARCAMA</span><strong>{formatMoney(monthSpent)}</strong><p>{previousSpent ? `Geçen aya göre ${change > 0 ? "+" : ""}%${change}` : "Karşılaştırma için önceki ay verisi yok"}</p><div className="report-progress"><i style={{ width: `${budget ? Math.min(100, Math.round(monthSpent / budget * 100)) : 0}%` }} /></div></article><article className="report-card"><span>AYLIK BÜTÇE</span><strong>{budget ? formatMoney(budget) : "Belirlenmedi"}</strong><p>{budget ? `${formatMoney(Math.max(0, budget - monthSpent))} kullanılabilir` : "Hedef belirlemek için dokunun"}</p><button className="report-inline-button" onClick={onBudget}>{budget ? "Bütçeyi değiştir" : "Bütçe oluştur"}</button></article><article className="report-card"><span>SABİT ABONELİK</span><strong>{formatMoney(recurring)}</strong><p>Yıllık tahmin {formatMoney(recurring * 12)}</p></article></section><section className="analytics-grid"><Breakdown title="Kategori Dağılımı" subtitle="Bu ayki kişisel harcamalar" rows={categories.map((item) => ({ label: item.category, amount: item.amount }))} total={monthSpent} /><Breakdown title="Ödeme Yöntemi" subtitle="Nakit ve kart dağılımı" rows={methods.map((item) => ({ label: item.method, amount: item.amount }))} total={monthSpent} /><Breakdown title="Kredi Kartına Göre" subtitle="Bu ay karta yazılan harcamalar" rows={cardRows} total={monthSpent} /></section>{categories.length > 0 && <section className="report-insight"><span>ASİSTAN YORUMU</span><h2>Bu ay en yüksek harcama kategoriniz {categories[0].category}.</h2><p>{formatMoney(categories[0].amount)} ile toplam kişisel harcamanın %{monthSpent ? Math.round(categories[0].amount / monthSpent * 100) : 0} bölümünü oluşturuyor. Bu bilgi bir finansal tavsiye değil; harcamalarınızı daha kolay fark etmeniz için hazırlanmış bir özettir.</p></section>}</>;
}

function EntryModal({ mode, data, paymentMethod, setPaymentMethod, submitting, onClose, onSubmit }: { mode: PersonalMode; data: PersonalData; paymentMethod: string; setPaymentMethod: (value: string) => void; submitting: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const heading = mode === "expenses" ? "Yeni Harcama" : mode === "bills" ? "Yeni Fatura" : mode === "subscriptions" ? "Yeni Abonelik" : "Yeni Not / Hatırlatma";
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal-card personal-entry-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="modal-kicker">KİŞİSEL FİNANS</span><h2>{heading}</h2><p>Gerekli bilgileri şimdi ekleyin; daha sonra kolayca değiştirebilirsiniz.</p></div><button className="close-button" onClick={onClose} aria-label="Pencereyi kapat">×</button></div><form className="account-form" onSubmit={onSubmit}>{mode === "expenses" ? <><div className="field-grid"><label><span>Harcama Adı *</span><input name="title" required autoFocus placeholder="Market alışverişi" /></label><label><span>İşyeri / Satıcı</span><input name="merchant" placeholder="Mağaza veya hizmet adı" /></label><label><span>Kategori *</span><select name="category" defaultValue="Market">{expenseCategories.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Harcama Türü</span><select name="scope" defaultValue="personal"><option value="personal">Kişisel</option><option value="business">İş</option></select></label><MoneyInput name="amount" label="Tutar" required /><label><span>Harcama Tarihi *</span><input name="spentAt" type="date" required defaultValue={today()} max={today()} /></label><label><span>Ödeme Yöntemi *</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{paymentMethods.map((item) => <option key={item}>{item}</option>)}</select></label>{paymentMethod === "Kredi Kartı" && <label><span>Kullanılan Kredi Kartı *</span><select name="creditCardId" required defaultValue=""><option value="" disabled>Kart seçin</option>{data.cards.map((card) => <option value={card.id} key={card.id}>{cardLabel(card)}</option>)}</select></label>}<label><span>Taksit Sayısı</span><input name="installmentCount" type="number" min="1" max="60" defaultValue="1" /></label></div><label><span>Not</span><textarea name="note" rows={3} placeholder="İsteğe bağlı açıklama" /></label></> : mode === "bills" ? <><div className="field-grid"><label><span>Fatura Adı *</span><input name="name" required autoFocus placeholder="Ev interneti" /></label><label><span>Kurum / Sağlayıcı</span><input name="provider" placeholder="Sağlayıcı adı" /></label><label><span>Abone / Sözleşme No</span><input name="accountNumber" placeholder="İsteğe bağlı" /></label><label><span>Kategori</span><select name="category">{billCategories.map((item) => <option key={item}>{item}</option>)}</select></label><MoneyInput name="amount" label="Beklenen Tutar" required /><label><span>Son Ödeme Tarihi *</span><input name="dueDate" type="date" required defaultValue={today()} /></label><label><span>Tekrarlama</span><select name="recurrence" defaultValue="monthly"><option value="once">Tek sefer</option><option value="weekly">Haftalık</option><option value="monthly">Aylık</option><option value="quarterly">3 aylık</option><option value="yearly">Yıllık</option></select></label><label><span>Ödeme Yapılan Kart</span><select name="creditCardId" defaultValue=""><option value="">Kart tanımlama</option>{data.cards.map((card) => <option value={card.id} key={card.id}>{cardLabel(card)}</option>)}</select></label><label><span>Hatırlatma</span><select name="reminderDays" defaultValue="3"><option value="0">Vade günü</option><option value="1">1 gün önce</option><option value="3">3 gün önce</option><option value="7">7 gün önce</option><option value="14">14 gün önce</option></select></label><label className="inline-check"><input name="autoPay" type="checkbox" /><span>Otomatik ödeme talimatı var</span></label></div><label><span>Not</span><textarea name="note" rows={3} /></label></> : mode === "subscriptions" ? <><div className="field-grid"><label><span>Abonelik / Hizmet *</span><input name="serviceName" required autoFocus placeholder="Dijital platform" /></label><label><span>Kategori</span><input name="category" defaultValue="Dijital" placeholder="Yazılım, eğlence..." /></label><MoneyInput name="amount" label="Çekilecek Tutar" required /><label><span>Ödeme Sıklığı</span><select name="billingCycle" defaultValue="monthly"><option value="weekly">Haftalık</option><option value="monthly">Aylık</option><option value="quarterly">3 aylık</option><option value="yearly">Yıllık</option></select></label><label><span>Sonraki Ödeme *</span><input name="nextPaymentDate" type="date" required defaultValue={today()} /></label><label><span>Tanımlı Kredi Kartı</span><select name="creditCardId" defaultValue=""><option value="">Kart seçilmedi</option>{data.cards.map((card) => <option value={card.id} key={card.id}>{cardLabel(card)}</option>)}</select></label><label><span>Hatırlatma</span><select name="reminderDays" defaultValue="3"><option value="0">Ödeme günü</option><option value="1">1 gün önce</option><option value="3">3 gün önce</option><option value="7">7 gün önce</option><option value="14">14 gün önce</option></select></label><label><span>Deneme Bitiş Tarihi</span><input name="trialEndDate" type="date" /></label><label className="field-wide"><span>Abonelik Yönetim Linki</span><input name="manageUrl" type="url" placeholder="https://..." /></label><label className="inline-check"><input name="autoRenew" type="checkbox" defaultChecked /><span>Otomatik yenileniyor</span></label></div><label><span>Not</span><textarea name="note" rows={3} /></label></> : <><div className="field-grid"><label className="field-wide"><span>Başlık *</span><input name="title" required autoFocus placeholder="Unutmamam gereken..." /></label><label><span>Tarih ve Saat</span><input name="dueAt" type="datetime-local" /></label><label><span>Öncelik</span><select name="priority" defaultValue="normal"><option value="low">Düşük</option><option value="normal">Normal</option><option value="high">Yüksek</option></select></label></div><label><span>Not</span><textarea name="note" rows={5} placeholder="Detayları buraya yazın. Tarih girmezseniz normal not olarak saklanır." /></label></>}<div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Vazgeç</button><button className="primary-button" disabled={submitting}>{submitting ? "Kaydediliyor…" : "Kaydet"}</button></div></form></section></div>;
}

function BudgetModal({ budget, submitting, onClose, onSubmit }: { budget: number; submitting: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal-card payment-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="modal-kicker">AYLIK HEDEF</span><h2>Kişisel Bütçe Ayarla</h2><p>Harcama ilerlemesi bu hedefe göre hesaplanır.</p></div><button className="close-button" onClick={onClose}>×</button></div><form className="account-form" onSubmit={onSubmit}><label><span>Ay</span><input name="month" type="month" defaultValue={currentMonth()} required /></label><MoneyInput name="amount" label="Aylık Bütçe" required defaultValue={budget ? String(budget / 100) : ""} /><div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Vazgeç</button><button className="primary-button" disabled={submitting}>{submitting ? "Kaydediliyor…" : "Bütçeyi Kaydet"}</button></div></form></section></div>;
}

function MoneyInput({ name, label, required = false, defaultValue }: { name: string; label: string; required?: boolean; defaultValue?: string }) { return <label><span>{label}{required ? " *" : ""}</span><div className="money-input"><input name={name} required={required} type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0,00" defaultValue={defaultValue} /><b>₺</b></div></label>; }
function Kpi({ icon, label, value, detail, main = false, danger = false }: { icon: string; label: string; value: string; detail: string; main?: boolean; danger?: boolean }) { return <article className={`summary-card ${main ? "summary-main" : ""} ${danger ? "summary-danger" : ""}`}><div className="summary-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>; }
function Empty({ icon, title, text }: { icon: string; title: string; text: string }) { return <div className="state-box empty-state"><div>{icon}</div><strong>{title}</strong><span>{text}</span></div>; }
function Breakdown({ title, subtitle, rows, total }: { title: string; subtitle: string; rows: { label: string; amount: number }[]; total: number }) { return <section className="accounts-panel breakdown-panel"><div className="panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div></div>{rows.length ? <div className="breakdown-list">{rows.slice(0, 8).map((row) => { const percent = total ? Math.round(row.amount / total * 100) : 0; return <div key={row.label}><div><strong>{row.label}</strong><span>{formatMoney(row.amount)} · %{percent}</span></div><div className="breakdown-track"><i style={{ width: `${percent}%` }} /></div></div>; })}</div> : <div className="compact-empty"><b>↗</b><span>Bu dönem için veri yok.</span></div>}</section>; }
function categoryIcon(category: string) { return ({ Market: "M", "Yeme İçme": "Y", Ulaşım: "U", Ev: "E", Fatura: "F", Sağlık: "S", Eğitim: "Ö", Giyim: "G", Teknoloji: "T", Eğlence: "♪", Seyahat: "✈", Dijital: "D" } as Record<string, string>)[category] || "₺"; }
