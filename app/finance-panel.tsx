"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Mode = "cards" | "loans";
type CardRecord = {
  id: string; bank: string; cardName: string; lastFour: string; cardLimit: number;
  currentDebt: number; minimumPayment: number; statementDate: string; dueDate: string; status: string;
};
type LoanRecord = {
  id: string; bank: string; loanName: string; originalAmount: number; remainingDebt: number;
  installmentAmount: number; totalInstallments: number; remainingInstallments: number;
  nextPaymentDate: string; status: string;
};

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" });

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function formatMoney(value: number) { return money.format(value / 100); }
function formatDate(value: string) { return dateFormat.format(new Date(`${value}T12:00:00`)); }
function dateState(date: string, closed: boolean) {
  if (closed) return { key: "paid", label: "Ödendi" };
  const diff = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / 86_400_000);
  if (diff < 0) return { key: "overdue", label: `${Math.abs(diff)} gün gecikti` };
  if (diff === 0) return { key: "today", label: "Bugün" };
  if (diff <= 7) return { key: "soon", label: `${diff} gün kaldı` };
  return { key: "planned", label: "Planlandı" };
}

export default function FinancePanel({ mode }: { mode: Mode }) {
  const isCards = mode === "cards";
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(isCards ? "/api/credit-cards" : "/api/loans", { cache: "no-store" });
      const data = (await response.json()) as { cards?: CardRecord[]; loans?: LoanRecord[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Kayıtlar alınamadı.");
      if (isCards) setCards(data.cards ?? []); else setLoans(data.loans ?? []);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Kayıtlar alınamadı.");
    } finally { setLoading(false); }
  }, [isCards]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const summary = useMemo(() => {
    if (isCards) {
      return {
        debt: cards.reduce((sum, item) => sum + item.currentDebt, 0),
        limit: cards.reduce((sum, item) => sum + item.cardLimit, 0),
        payment: cards.reduce((sum, item) => sum + item.minimumPayment, 0),
        overdue: cards.filter((item) => dateState(item.dueDate, item.currentDebt <= 0).key === "overdue").length,
      };
    }
    return {
      debt: loans.reduce((sum, item) => sum + item.remainingDebt, 0),
      limit: loans.reduce((sum, item) => sum + item.originalAmount, 0),
      payment: loans.filter((item) => item.remainingDebt > 0).reduce((sum, item) => sum + item.installmentAmount, 0),
      overdue: loans.filter((item) => dateState(item.nextPaymentDate, item.remainingDebt <= 0).key === "overdue").length,
    };
  }, [cards, isCards, loans]);

  async function createRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const tl = (name: string) => Math.round(Number(form.get(name)) * 100);
    const count = (name: string) => Math.round(Number(form.get(name)));
    const payload = isCards ? {
      bank: form.get("bank"), cardName: form.get("cardName"), lastFour: form.get("lastFour"),
      cardLimit: tl("cardLimit"), currentDebt: tl("currentDebt"), minimumPayment: tl("minimumPayment"),
      statementDate: form.get("statementDate"), dueDate: form.get("dueDate"),
    } : {
      bank: form.get("bank"), loanName: form.get("loanName"), originalAmount: tl("originalAmount"),
      remainingDebt: tl("remainingDebt"), installmentAmount: tl("installmentAmount"),
      totalInstallments: count("totalInstallments"), remainingInstallments: count("remainingInstallments"),
      nextPaymentDate: form.get("nextPaymentDate"),
    };
    try {
      const response = await fetch(isCards ? "/api/credit-cards" : "/api/loans", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Kayıt eklenemedi.");
      setModalOpen(false);
      setToast(isCards ? "Kredi kartı eklendi." : "Kredi eklendi.");
      await load();
    } catch (error) { setToast(error instanceof Error ? error.message : "Kayıt eklenemedi."); }
    finally { setSubmitting(false); }
  }

  async function markPaid(item: CardRecord | LoanRecord) {
    const name = isCards ? (item as CardRecord).cardName : (item as LoanRecord).loanName;
    const text = isCards ? `${name} kart borcu ödendi olarak işaretlensin mi?` : `${name} kredisinin bu taksiti ödendi olarak işaretlensin mi?`;
    if (!window.confirm(text)) return;
    setPaying(item.id);
    try {
      const response = await fetch(`/api/${isCards ? "credit-cards" : "loans"}/${item.id}/pay`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paidAt: today() }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Ödeme işlenemedi.");
      setToast(isCards ? "Kart borcu ödendi." : "Kredi taksiti ödendi; sıradaki tarih güncellendi.");
      await load();
    } catch (error) { setToast(error instanceof Error ? error.message : "Ödeme işlenemedi."); }
    finally { setPaying(null); }
  }

  const records = isCards ? cards : loans;

  return (
    <div className="content-wrap finance-wrap">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">{isCards ? "KREDİ KARTLARI" : "KREDİLER"}</p>
          <h1>{isCards ? "Kart ödemelerini kaçırmayın." : "Kredi taksitlerini düzenli izleyin."}</h1>
          <p className="welcome-copy">{isCards ? "Ekstre borcu, asgari ödeme ve son ödeme tarihlerini tek yerde görün." : "Kalan borç, taksit sayısı ve yaklaşan ödeme tarihlerini takip edin."}</p>
        </div>
        <button className="primary-button finance-add" onClick={() => setModalOpen(true)}>＋ {isCards ? "Kart Ekle" : "Kredi Ekle"}</button>
      </section>

      <section className="finance-summary">
        <article className="summary-card summary-main"><div className="summary-icon">₺</div><div><span>{isCards ? "Toplam Kart Borcu" : "Toplam Kalan Kredi"}</span><strong>{formatMoney(summary.debt)}</strong><small>{records.length} kayıt</small></div></article>
        <article className="summary-card"><div className="summary-icon">{isCards ? "▣" : "∑"}</div><div><span>{isCards ? "Toplam Kart Limiti" : "Başlangıç Kredi Toplamı"}</span><strong>{formatMoney(summary.limit)}</strong><small>Genel toplam</small></div></article>
        <article className="summary-card summary-warning"><div className="summary-icon">⌛</div><div><span>{isCards ? "Toplam Asgari Ödeme" : "Aylık Taksit Toplamı"}</span><strong>{formatMoney(summary.payment)}</strong><small>{summary.overdue} geciken ödeme</small></div></article>
      </section>

      <section className="accounts-panel finance-panel">
        <div className="panel-head"><div><h2>{isCards ? "Kredi Kartları" : "Krediler"}</h2><p>{records.length} kayıt görüntüleniyor</p></div></div>
        {loading ? <div className="state-box">Kayıtlar hazırlanıyor…</div> : records.length === 0 ? (
          <div className="state-box empty-state"><div>{isCards ? "▣" : "₺"}</div><strong>Henüz kayıt yok</strong><span>{isCards ? "İlk kredi kartınızı ekleyin." : "İlk kredinizi ekleyin."}</span><button className="primary-button" onClick={() => setModalOpen(true)}>Yeni Kayıt Ekle</button></div>
        ) : <div className="finance-list">{records.map((raw) => {
          const card = raw as CardRecord;
          const loan = raw as LoanRecord;
          const closed = isCards ? card.currentDebt <= 0 : loan.remainingDebt <= 0;
          const date = isCards ? card.dueDate : loan.nextPaymentDate;
          const due = dateState(date, closed);
          return <article className={`finance-row status-${due.key}`} key={raw.id}>
            <div className="finance-identity"><div className="finance-avatar">{isCards ? "▣" : "₺"}</div><div><h3>{isCards ? card.cardName : loan.loanName}</h3><p>{isCards ? `${card.bank}${card.lastFour ? ` •••• ${card.lastFour}` : ""}` : loan.bank}</p></div></div>
            <div className="finance-value"><span>{isCards ? "Güncel Borç" : "Kalan Borç"}</span><strong>{formatMoney(isCards ? card.currentDebt : loan.remainingDebt)}</strong><small>{isCards ? `Limit ${formatMoney(card.cardLimit)}` : `Başlangıç ${formatMoney(loan.originalAmount)}`}</small></div>
            <div className="finance-value"><span>{isCards ? "Asgari Ödeme" : "Aylık Taksit"}</span><strong>{formatMoney(isCards ? card.minimumPayment : loan.installmentAmount)}</strong><small>{isCards ? `Kesim: ${formatDate(card.statementDate)}` : `${loan.remainingInstallments}/${loan.totalInstallments} taksit kaldı`}</small></div>
            <div className="account-date"><span>{isCards ? "Son Ödeme" : "Sıradaki Ödeme"}</span><strong>{formatDate(date)}</strong><em className={`due-badge badge-${due.key}`}>{due.label}</em></div>
            <div className="account-action"><label className={`paid-toggle ${closed ? "is-paid" : ""}`}><input type="checkbox" checked={closed || paying === raw.id} disabled={closed || paying === raw.id} onChange={() => void markPaid(raw)} /><span aria-hidden="true">✓</span><b>{paying === raw.id ? "İşleniyor" : isCards ? "Ödendi" : "Taksit ödendi"}</b></label></div>
          </article>;
        })}</div>}
      </section>

      {modalOpen && <div className="modal-backdrop" onMouseDown={() => setModalOpen(false)}><section className="modal-card" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head"><div><span className="modal-kicker">YENİ KAYIT</span><h2>{isCards ? "Kredi Kartı Ekle" : "Kredi Ekle"}</h2><p>Takip için gerekli ödeme bilgilerini girin.</p></div><button className="close-button" onClick={() => setModalOpen(false)} aria-label="Pencereyi kapat">×</button></div>
        <form className="account-form" onSubmit={createRecord}><div className="field-grid">
          <label><span>Banka *</span><input name="bank" required autoFocus placeholder="Banka adı" /></label>
          {isCards ? <>
            <label><span>Kart Adı *</span><input name="cardName" required placeholder="Şirket kartı" /></label>
            <label><span>Son 4 Hane</span><input name="lastFour" inputMode="numeric" maxLength={4} pattern="[0-9]{0,4}" placeholder="1234" /></label>
            <MoneyField name="cardLimit" label="Kart Limiti" />
            <MoneyField name="currentDebt" label="Güncel Borç" required />
            <MoneyField name="minimumPayment" label="Asgari Ödeme" />
            <label><span>Hesap Kesim Tarihi *</span><input name="statementDate" type="date" required /></label>
            <label><span>Son Ödeme Tarihi *</span><input name="dueDate" type="date" required /></label>
          </> : <>
            <label><span>Kredi Adı *</span><input name="loanName" required placeholder="Ticari kredi" /></label>
            <MoneyField name="originalAmount" label="Başlangıç Kredi Tutarı" required />
            <MoneyField name="remainingDebt" label="Kalan Borç" required />
            <MoneyField name="installmentAmount" label="Aylık Taksit" required />
            <label><span>Toplam Taksit *</span><input name="totalInstallments" type="number" min="1" required placeholder="12" /></label>
            <label><span>Kalan Taksit *</span><input name="remainingInstallments" type="number" min="0" required placeholder="10" /></label>
            <label><span>Sıradaki Ödeme Tarihi *</span><input name="nextPaymentDate" type="date" required /></label>
          </>}
        </div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Vazgeç</button><button className="primary-button" disabled={submitting}>{submitting ? "Kaydediliyor…" : "Kaydı Oluştur"}</button></div></form>
      </section></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function MoneyField({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return <label><span>{label}{required ? " *" : ""}</span><div className="money-input"><input name={name} required={required} type="number" min="0" step="0.01" inputMode="decimal" placeholder="0,00" defaultValue={required ? undefined : "0"} /><b>₺</b></div></label>;
}
