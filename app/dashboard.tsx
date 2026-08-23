"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BrandingSetup from "./branding-setup";
import FinancePanel from "./finance-panel";
import PersonalFinancePanel, { PersonalFinanceSnapshot } from "./personal-finance";
import DashboardIntelligence, { NotificationBell } from "./dashboard-intelligence";
import GlobalSearch from "./global-search";
import {
  MODULE_OPTIONS,
  profileThemeStyle,
  type ModuleKey,
  type UserProfile,
} from "./profile-types";

type Account = {
  id: string;
  company: string;
  customerName: string;
  phone: string;
  email: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  plannedPaymentMethod: string;
  dueDate: string;
  note: string;
  status: "open" | "partial" | "paid";
  createdAt: string;
  lastPaymentDate: string | null;
};

type Filter = "all" | "overdue" | "soon" | "paid";
type NotificationEvent = "account_summary" | "payment_reminder" | "payment_received";
type NotificationChannel = "sms" | "email";

type NotificationDraft = {
  eventType: NotificationEvent;
  channels: NotificationChannel[];
  phone: string;
  email: string;
  message: string;
};

type NotificationResult = {
  deliveryMode: "provider";
  deliveryStatus: "submitted" | "partial" | "failed";
  summary: string;
  message: string;
  results: {
    channel: NotificationChannel;
    recipient: string;
    provider: string;
    status: "submitted" | "failed";
    providerId?: string;
    error?: string;
  }[];
};

type NotificationIntegrationStatus = Record<
  NotificationChannel,
  { ready: boolean; provider: string }
>;

type SupportDeliveryState = "sent" | "not_configured" | "failed";
type SupportReportResult = {
  id: string;
  saved: boolean;
  centralStatus: SupportDeliveryState;
  emailStatus: SupportDeliveryState;
};

type WeatherSnapshot = {
  city: string;
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  weatherCode: number;
  high: number;
  low: number;
};

const WEATHER_CITIES = {
  "İstanbul": { latitude: 41.0082, longitude: 28.9784 },
  "Ankara": { latitude: 39.9334, longitude: 32.8597 },
  "İzmir": { latitude: 38.4237, longitude: 27.1428 },
  "Antalya": { latitude: 36.8969, longitude: 30.7133 },
  "Bursa": { latitude: 40.1885, longitude: 29.061 },
} as const;

function weatherDetails(code: number, rain: number, temperature: number) {
  if (code >= 95) return { icon: "⛈", label: "Gök gürültülü", tip: "Dışarı çıkmadan önce hava durumunu yeniden kontrol et." };
  if (rain >= 45 || (code >= 51 && code <= 82)) return { icon: "☂", label: "Yağışlı", tip: "Şemsiyeni yanına almayı unutma." };
  if (code >= 71 && code <= 77) return { icon: "❄", label: "Karlı", tip: "Yollar kaygan olabilir; planına biraz zaman ekle." };
  if (code <= 1) return { icon: "☀", label: "Açık", tip: temperature >= 28 ? "Güneşli bir gün; dışarıdaki işlerini erken planlayabilirsin." : "Hava açık; kısa bir mola için güzel bir gün." };
  if (code <= 3 || code === 45 || code === 48) return { icon: "☁", label: "Bulutlu", tip: "Gün içinde hava değişebilir; planlarını tek bakışta kontrol et." };
  return { icon: "◌", label: "Değişken", tip: "Günün planına başlamadan önce hava durumuna göz at." };
}

const paymentMethods = ["Nakit", "Havale / EFT", "Kredi Kartı", "Diğer"];

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function todayInIstanbul() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatMoney(kurus: number) {
  return currency.format(kurus / 100);
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T12:00:00`));
}

function daysBetween(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function dueState(account: Account, today: string) {
  if (account.remainingAmount <= 0) {
    return { key: "paid", label: "Kapandı", detail: "Borç tamamen ödendi" };
  }
  const diff = daysBetween(today, account.dueDate);
  if (diff < 0) {
    const days = Math.abs(diff);
    return {
      key: "overdue",
      label: `${days} gün gecikti`,
      detail: `Ödeme ${days} gün önce bekleniyordu`,
    };
  }
  if (diff === 0) {
    return { key: "today", label: "Bugün", detail: "Ödeme bugün bekleniyor" };
  }
  if (diff <= 7) {
    return {
      key: "soon",
      label: `${diff} gün kaldı`,
      detail: `Ödemeye ${diff} gün kaldı`,
    };
  }
  return { key: "planned", label: "Planlandı", detail: `${diff} gün kaldı` };
}

function notificationMessage(account: Account, eventType: NotificationEvent, brandName: string) {
  if (eventType === "payment_reminder") {
    return `Sayın ${account.customerName}, ${brandName} hesabınızda ${formatMoney(account.remainingAmount)} bakiye bulunmaktadır. Planlanan ödeme tarihi ${formatDate(account.dueDate)}. Bilginize.`;
  }
  if (eventType === "payment_received") {
    return `Sayın ${account.customerName}, ${brandName} hesabınıza ait ödemeniz kaydedilmiştir. Güncel kalan bakiyeniz ${formatMoney(account.remainingAmount)}. Teşekkür ederiz.`;
  }
  return `Sayın ${account.customerName}, ${brandName} hesap özetinize göre güncel kalan bakiyeniz ${formatMoney(account.remainingAmount)}, planlanan ödeme tarihiniz ${formatDate(account.dueDate)}. Bilginize.`;
}

function LogoMark({ profile }: { profile: UserProfile }) {
  const initials = (profile.ownerName || profile.appName)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
  return (
    <div className="brand-mark">
      {profile.logoUrl && !profile.useDefaultLogo ? (
        <img className="custom-brand-logo" src={profile.logoUrl} alt={`${profile.appName} logosu`} />
      ) : profile.useDefaultLogo ? (
        <span className="brand-logo-frame" role="img" aria-label="PratikAll" />
      ) : (
        <span className="initial-brand-logo" aria-label={`${profile.appName} işareti`}>{initials}</span>
      )}
    </div>
  );
}

export default function Home() {
  const [activeSection, setActiveSection] = useState<ModuleKey>("overview");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [suggestedOwnerName, setSuggestedOwnerName] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportError, setSupportError] = useState("");
  const [supportResult, setSupportResult] = useState<SupportReportResult | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<NotificationIntegrationStatus>({
    sms: { ready: false, provider: "NETGSM" },
    email: { ready: false, provider: "E-posta Servisi" },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [paymentAccount, setPaymentAccount] = useState<Account | null>(null);
  const [notificationAccount, setNotificationAccount] = useState<Account | null>(null);
  const [notificationDraft, setNotificationDraft] = useState<NotificationDraft | null>(null);
  const [notificationResult, setNotificationResult] = useState<NotificationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [weatherCity, setWeatherCity] = useState<keyof typeof WEATHER_CITIES>("İstanbul");
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const today = todayInIstanbul();

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      const data = (await response.json()) as {
        profile?: UserProfile | null;
        suggestedOwnerName?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Program ayarları alınamadı.");
      setProfile(data.profile ?? null);
      setSuggestedOwnerName(data.suggestedOwnerName ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Program ayarları alınamadı.");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const loadIntegrationStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/status", { cache: "no-store" });
      if (!response.ok) return;
      setIntegrationStatus((await response.json()) as NotificationIntegrationStatus);
    } catch {
      // Durum kutuları bağlantı kurulmadığını göstermeye devam eder.
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/accounts", { cache: "no-store" });
      const data = (await response.json()) as { accounts?: Account[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Kayıtlar alınamadı.");
      setAccounts(data.accounts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıtlar alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfile();
      void loadAccounts();
      void loadIntegrationStatus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAccounts, loadIntegrationStatus, loadProfile]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const savedCity = window.localStorage.getItem("pratikall-weather-city") as keyof typeof WEATHER_CITIES | null;
    if (savedCity && WEATHER_CITIES[savedCity]) setWeatherCity(savedCity);
  }, []);

  useEffect(() => {
    const location = WEATHER_CITIES[weatherCity];
    setWeatherLoading(true);
    window.localStorage.setItem("pratikall-weather-city", weatherCity);
    const controller = new AbortController();
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FIstanbul&forecast_days=1`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Hava durumu alınamadı");
        return response.json();
      })
      .then((data) => setWeather({
        city: weatherCity,
        temperature: Math.round(data.current.temperature_2m),
        apparentTemperature: Math.round(data.current.apparent_temperature),
        precipitationProbability: Math.round(data.daily.precipitation_probability_max[0] ?? 0),
        weatherCode: data.current.weather_code,
        high: Math.round(data.daily.temperature_2m_max[0]),
        low: Math.round(data.daily.temperature_2m_min[0]),
      }))
      .catch((error) => { if (error instanceof Error && error.name !== "AbortError") setWeather(null); })
      .finally(() => setWeatherLoading(false));
    return () => controller.abort();
  }, [weatherCity]);

  useEffect(() => {
    if (!error || profileLoading) return;
    void fetch("/api/support/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportType: "error",
        subject: "PratikAll işlemi tamamlanamadı",
        details: "Uygulama bu sorunu otomatik olarak raporladı.",
        page: window.location.pathname,
        technicalMessage: error,
        isAutomatic: true,
      }),
    }).catch(() => undefined);
  }, [error, profileLoading]);

  useEffect(() => {
    if (profile?.appName) document.title = `${profile.appName} | PratikAll Akıllı Asistan`;
  }, [profile?.appName]);

  const summary = useMemo(() => {
    return accounts.reduce(
      (totals, account) => {
        totals.original += account.originalAmount;
        totals.collected += account.paidAmount;
        totals.remaining += account.remainingAmount;
        const state = dueState(account, today).key;
        if (state === "overdue") totals.overdue += account.remainingAmount;
        if (state === "today" || state === "soon") totals.soon += account.remainingAmount;
        return totals;
      },
      { original: 0, collected: 0, remaining: 0, overdue: 0, soon: 0 }
    );
  }, [accounts, today]);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    return accounts.filter((account) => {
      const state = dueState(account, today).key;
      const matchesFilter =
        filter === "all" ||
        (filter === "overdue" && state === "overdue") ||
        (filter === "soon" && (state === "today" || state === "soon")) ||
        (filter === "paid" && state === "paid");
      const haystack = `${account.customerName} ${account.company} ${account.phone}`.toLocaleLowerCase("tr-TR");
      return matchesFilter && (!query || haystack.includes(query));
    });
  }, [accounts, filter, search, today]);

  const brandName = profile?.companyName || profile?.appName || "PratikAll";
  const priorityAccounts = useMemo(
    () =>
      accounts
        .filter((account) => account.remainingAmount > 0)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 6),
    [accounts]
  );

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: form.get("company"),
          customerName: form.get("customerName"),
          phone: form.get("phone"),
          email: form.get("email"),
          originalAmount: Math.round(amount * 100),
          plannedPaymentMethod: form.get("plannedPaymentMethod"),
          dueDate: form.get("dueDate"),
          note: form.get("note"),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Kayıt eklenemedi.");
      setNewAccountOpen(false);
      setToast("Açık hesap kaydı oluşturuldu.");
      await loadAccounts();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Kayıt eklenemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function addPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentAccount) return;
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    try {
      const response = await fetch(`/api/accounts/${paymentAccount.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          method: form.get("method"),
          paidAt: form.get("paidAt"),
          note: form.get("note"),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Tahsilat kaydedilemedi.");
      setPaymentAccount(null);
      setToast("Tahsilat başarıyla kaydedildi.");
      await loadAccounts();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Tahsilat kaydedilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function markAsPaid(account: Account) {
    const confirmed = window.confirm(
      `${account.customerName} için kalan ${formatMoney(account.remainingAmount)} tahsil edildi olarak işaretlensin mi?`
    );
    if (!confirmed) return;

    setMarkingPaid(account.id);
    try {
      const response = await fetch(`/api/accounts/${account.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: account.remainingAmount,
          method: account.plannedPaymentMethod,
          paidAt: today,
          note: "Ödendi kutusundan tamamlandı.",
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Ödeme işaretlenemedi.");
      setToast("Ödeme alındı; hesap kapatıldı.");
      await loadAccounts();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Ödeme işaretlenemedi.");
    } finally {
      setMarkingPaid(null);
    }
  }

  function openNotification(account: Account) {
    setNotificationAccount(account);
    setNotificationDraft({
      eventType: "account_summary",
      channels: [],
      phone: account.phone,
      email: account.email,
      message: notificationMessage(account, "account_summary", brandName),
    });
    setNotificationResult(null);
  }

  function closeNotification() {
    setNotificationAccount(null);
    setNotificationDraft(null);
    setNotificationResult(null);
  }

  function toggleNotificationChannel(channel: NotificationChannel) {
    setNotificationDraft((current) => {
      if (!current) return current;
      const channels = current.channels.includes(channel)
        ? current.channels.filter((item) => item !== channel)
        : [...current.channels, channel];
      return { ...current, channels };
    });
  }

  function changeNotificationEvent(eventType: NotificationEvent) {
    if (!notificationAccount) return;
    setNotificationDraft((current) =>
      current
        ? {
            ...current,
            eventType,
            message: notificationMessage(notificationAccount, eventType, brandName),
          }
        : current
    );
  }

  async function prepareNotification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!notificationAccount || !notificationDraft) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/accounts/${notificationAccount.id}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationDraft),
      });
      const data = (await response.json()) as NotificationResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "Bildirim gönderilemedi.");
      await loadAccounts();
      setNotificationResult(data);
      setToast(data.summary);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Bildirim gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyNotificationMessage() {
    if (!notificationResult) return;
    try {
      await navigator.clipboard.writeText(notificationResult.message);
      setToast("Bildirim metni kopyalandı.");
    } catch {
      setToast("Mesaj kopyalanamadı.");
    }
  }

  function exportReport() {
    const rows = accounts.map((account) => {
      const due = dueState(account, today);
      return [
        account.company || "Bireysel",
        account.customerName,
        account.phone,
        account.email,
        (account.originalAmount / 100).toFixed(2),
        (account.paidAmount / 100).toFixed(2),
        (account.remainingAmount / 100).toFixed(2),
        account.plannedPaymentMethod,
        account.dueDate,
        due.label,
        account.note,
      ];
    });
    const header = [
      "Firma",
      "Müşteri Adı",
      "Telefon",
      "E-posta",
      "Toplam Borç (TL)",
      "Tahsil Edilen (TL)",
      "Kalan Borç (TL)",
      "Ödeme Şekli",
      "Ödeme Tarihi",
      "Durum",
      "Not",
    ];
    const totals = [
      "GENEL TOPLAM",
      "",
      "",
      "",
      (summary.original / 100).toFixed(2),
      (summary.collected / 100).toFixed(2),
      (summary.remaining / 100).toFixed(2),
      "",
      "",
      "",
      "",
    ];
    const csv = [header, ...rows, [], totals]
      .map((row) => row.map(csvCell).join(";"))
      .join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = (profile?.appName || "finans-takip")
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    link.download = `${safeName || "finans-takip"}-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToast("Açık hesap raporu indirildi.");
  }

  function handleProfileSaved(savedProfile: UserProfile) {
    setProfile(savedProfile);
    setSettingsOpen(false);
    if (!savedProfile.enabledModules.includes(activeSection)) setActiveSection("overview");
    document.title = `${savedProfile.appName} | PratikAll Akıllı Asistan`;
    setToast("Program ayarları kaydedildi.");
  }

  function openSupport() {
    setSupportError("");
    setSupportResult(null);
    setSupportOpen(true);
  }

  async function submitSupportReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSupportSubmitting(true);
    setSupportError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/support/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: String(form.get("reportType") || "help"),
          subject: String(form.get("subject") || ""),
          details: String(form.get("details") || ""),
          page: window.location.pathname,
          technicalMessage: "",
          isAutomatic: false,
        }),
      });
      const data = (await response.json()) as SupportReportResult & { error?: string };
      if (!response.ok || !data.saved) throw new Error(data.error || "Rapor gönderilemedi.");
      setSupportResult(data);
      setToast("Destek raporunuz kaydedildi.");
    } catch (err) {
      setSupportError(err instanceof Error ? err.message : "Rapor gönderilemedi.");
    } finally {
      setSupportSubmitting(false);
    }
  }

  if (profileLoading) {
    return <main className="setup-page"><div className="setup-loading"><span>P</span><strong>PratikAll asistanınız hazırlanıyor…</strong></div></main>;
  }

  if (!profile) {
    return (
      <main className="setup-page">
        <BrandingSetup
          mode="setup"
          profile={null}
          suggestedOwnerName={suggestedOwnerName}
          onSaved={handleProfileSaved}
        />
      </main>
    );
  }

  const moduleIcons: Record<ModuleKey, string> = {
    overview: "⌂",
    accounts: "₺",
    cards: "▣",
    loans: "∑",
    expenses: "↘",
    bills: "⌁",
    subscriptions: "↻",
    assistant: "✓",
    calendar: "◷",
    reports: "↗",
  };

  return (
    <main className="app-shell" style={profileThemeStyle(profile.theme)}>
      <header className="topbar">
        <div className="topbar-inner">
          <LogoMark profile={profile} />
          <div className="header-divider" />
          <div className="product-name">
            <strong>{profile.appName}</strong>
            <span>{profile.companyName || (profile.appName === "PratikAll" ? "Hayatını kolaylaştıran akıllı asistan" : "PratikAll kişisel asistanı")}</span>
          </div>
          <div className="header-actions">
            <GlobalSearch accounts={accounts} onNavigate={setActiveSection} />
            <span className="secure-note">● Veriler güvende</span>
            <NotificationBell accounts={accounts} />
            <Link className="settings-button account-link" href="/account">Hesabım</Link>
            <button className="settings-button support-button" onClick={openSupport} aria-label="Destek ve geri bildirim alanını aç">? <span>Destek</span></button>
            <button className="settings-button" onClick={() => setSettingsOpen(true)} aria-label="Program ayarlarını aç">⚙ <span>Ayarlar</span></button>
            {(activeSection === "accounts" || activeSection === "overview") && <button className="primary-button" onClick={() => setNewAccountOpen(true)}>
              <span aria-hidden="true">＋</span> Yeni Açık Hesap
            </button>}
          </div>
        </div>
      </header>

      <nav className="module-nav" aria-label="Finans takip bölümleri">
        <div>
          {MODULE_OPTIONS.filter((module) => profile.enabledModules.includes(module.key)).map((module) => (
            <button key={module.key} className={activeSection === module.key ? "active" : ""} onClick={() => setActiveSection(module.key)}><span>{moduleIcons[module.key]}</span>{module.label}</button>
          ))}
        </div>
      </nav>

      {activeSection === "overview" ? <div className="content-wrap overview-wrap">
        <section className="welcome-row overview-welcome">
          <div>
            <p className="eyebrow">{profile.ownerName.toLocaleUpperCase("tr-TR")}, PRATİKALL YANINIZDA</p>
            <h1>Bugün neye odaklanmanız gerektiği burada.</h1>
            <p className="welcome-copy">PratikAll yalnızca önemli olanı öne çıkarır; ödemeler, abonelikler, notlar ve yaklaşan işler tek bakışta anlaşılır.</p>
          </div>
          <div className="today-box"><span>Bugün</span><strong>{formatDate(today)}</strong></div>
        </section>

        <section className="summary-grid" aria-label="Finans özeti">
          <article className="summary-card summary-main"><div className="summary-icon">₺</div><div><span>Toplam Açık Bakiye</span><strong>{formatMoney(summary.remaining)}</strong><small>{accounts.filter((item) => item.remainingAmount > 0).length} açık kayıt</small></div></article>
          <article className="summary-card summary-danger"><div className="summary-icon">!</div><div><span>Vadesi Geçen</span><strong>{formatMoney(summary.overdue)}</strong><small>{accounts.filter((item) => dueState(item, today).key === "overdue").length} kişi bekliyor</small></div></article>
          <article className="summary-card summary-warning"><div className="summary-icon">⌛</div><div><span>7 Gün İçinde</span><strong>{formatMoney(summary.soon)}</strong><small>Yaklaşan ödemeler</small></div></article>
          <article className="summary-card summary-success"><div className="summary-icon">✓</div><div><span>Toplam Tahsilat</span><strong>{formatMoney(summary.collected)}</strong><small>{summary.original > 0 ? `%${Math.round((summary.collected / summary.original) * 100)} tahsil edildi` : "Henüz hareket yok"}</small></div></article>
        </section>

        <DashboardIntelligence accounts={accounts} onNavigate={setActiveSection} />

        <section className="daily-companion" aria-label="Günlük asistan bilgileri">
          <article className="weather-card">
            <div className="weather-card-top">
              <div><span>BUGÜNÜN HAVASI</span><h2>{weatherLoading ? "Hava bilgisi alınıyor…" : weather ? `${weatherDetails(weather.weatherCode, weather.precipitationProbability, weather.temperature).label}, ${weather.temperature}°` : "Hava bilgisi şu an alınamadı"}</h2></div>
              <select aria-label="Hava durumu şehri" value={weatherCity} onChange={(event) => setWeatherCity(event.target.value as keyof typeof WEATHER_CITIES)}>
                {Object.keys(WEATHER_CITIES).map((city) => <option key={city}>{city}</option>)}
              </select>
            </div>
            {weather ? <div className="weather-card-body"><b aria-hidden="true">{weatherDetails(weather.weatherCode, weather.precipitationProbability, weather.temperature).icon}</b><div><strong>{weather.low}° / {weather.high}°</strong><small>Hissedilen {weather.apparentTemperature}° · Yağış %{weather.precipitationProbability}</small><p>{weatherDetails(weather.weatherCode, weather.precipitationProbability, weather.temperature).tip}</p></div></div> : <p className="weather-unavailable">Şehir seçiminiz saklandı. Bağlantı geldiğinde kart otomatik yenilenir.</p>}
          </article>
          <article className="city-events-card"><div><span>ŞEHİRDE NELER VAR?</span><h2>{weatherCity} etkinlikleri</h2></div><div className="event-chips" aria-label="Etkinlik kategorileri"><b>Konser</b><b>Tiyatro</b><b>Sergi</b><b>Ücretsiz</b></div><p>Yaklaşan etkinlikleri keşfet, ilgilendiğini takvimine ekle ve zamanı gelince hatırlatma al.</p><button onClick={() => setToast("Etkinlik kaynağı bağlantısı hazır; sağlayıcı bağlandığında canlı sonuçlar burada görünecek.")}>Etkinlikleri keşfet →</button><small>Canlı ve doğrulanmış etkinlik kaynağı bağlanacak</small></article>
        </section>

        <PersonalFinanceSnapshot onNavigate={setActiveSection} />

        <section className="overview-grid">
          <article className="overview-panel priority-panel">
            <div className="overview-panel-head"><div><span>ÖNCELİKLİ İŞLER</span><h2>Yaklaşan ve geciken tahsilatlar</h2></div><button onClick={() => setActiveSection("calendar")}>Tüm takvim →</button></div>
            {priorityAccounts.length === 0 ? <div className="compact-empty"><b>✓</b><span>Bekleyen tahsilat bulunmuyor.</span></div> : <div className="priority-list">
              {priorityAccounts.map((account) => {
                const due = dueState(account, today);
                return <div key={account.id} className={`priority-row priority-${due.key}`}><span className="priority-avatar">{account.customerName[0].toLocaleUpperCase("tr-TR")}</span><div><strong>{account.customerName}</strong><small>{account.company || "Bireysel müşteri"}</small></div><div><strong>{formatMoney(account.remainingAmount)}</strong><small>{formatDate(account.dueDate)}</small></div><em>{due.label}</em><button onClick={() => openNotification(account)} aria-label={`${account.customerName} için bildirim gönder`}>↗</button></div>;
              })}
            </div>}
          </article>

          <aside className="overview-side">
            <article className="health-card">
              <span>FİNANS SAĞLIĞI</span>
              <div className="health-score"><strong>{summary.original > 0 ? Math.max(0, Math.round(100 - (summary.overdue / summary.original) * 100)) : 100}</strong><small>/ 100</small></div>
              <p>Vadesi geçmiş tutar azaldıkça finans sağlığı puanınız yükselir.</p>
              <div className="health-track"><i style={{ width: `${summary.original > 0 ? Math.max(4, Math.round(100 - (summary.overdue / summary.original) * 100)) : 100}%` }} /></div>
            </article>
            <article className="quick-actions-card"><span>HIZLI İŞLEMLER</span><button onClick={() => setNewAccountOpen(true)}><b>＋</b><div><strong>Yeni açık hesap</strong><small>Müşteri ve vade ekleyin</small></div></button><button onClick={() => setActiveSection("expenses")}><b>↘</b><div><strong>Kişisel harcama</strong><small>Kart veya nakit gider ekleyin</small></div></button><button onClick={() => setActiveSection("assistant")}><b>✓</b><div><strong>Not veya hatırlatma</strong><small>Aklınızdakini PratikAll’a bırakın</small></div></button><button onClick={() => setActiveSection("reports")}><b>↗</b><div><strong>Raporları aç</strong><small>Toplamları inceleyin</small></div></button></article>
          </aside>
        </section>
      </div> : activeSection === "accounts" ? <div className="content-wrap">
        <section className="welcome-row">
          <div>
            <p className="eyebrow">GENEL DURUM</p>
            <h1>Açık hesapları tek bakışta takip edin.</h1>
            <p className="welcome-copy">
              Ödeme tarihleri yaklaşan veya geçen müşterileri kaçırmadan görün,
              tahsilatları anında işleyin.
            </p>
          </div>
          <div className="today-box">
            <span>Bugün</span>
            <strong>{formatDate(today)}</strong>
          </div>
        </section>

        <section className="summary-grid" aria-label="Borç özeti">
          <article className="summary-card summary-main">
            <div className="summary-icon">₺</div>
            <div>
              <span>Toplam Açık Bakiye</span>
              <strong>{formatMoney(summary.remaining)}</strong>
              <small>{accounts.filter((item) => item.remainingAmount > 0).length} açık kayıt</small>
            </div>
          </article>
          <article className="summary-card summary-danger">
            <div className="summary-icon">!</div>
            <div>
              <span>Vadesi Geçen</span>
              <strong>{formatMoney(summary.overdue)}</strong>
              <small>{accounts.filter((item) => dueState(item, today).key === "overdue").length} kişi bekliyor</small>
            </div>
          </article>
          <article className="summary-card summary-warning">
            <div className="summary-icon">⌛</div>
            <div>
              <span>7 Gün İçinde</span>
              <strong>{formatMoney(summary.soon)}</strong>
              <small>Yaklaşan ödemeler</small>
            </div>
          </article>
          <article className="summary-card summary-success">
            <div className="summary-icon">✓</div>
            <div>
              <span>Toplam Tahsilat</span>
              <strong>{formatMoney(summary.collected)}</strong>
              <small>Kaydedilen ödemeler</small>
            </div>
          </article>
        </section>

        <section className="accounts-panel">
          <div className="panel-head">
            <div>
              <h2>Müşteri Hesapları</h2>
              <p>{filteredAccounts.length} kayıt görüntüleniyor</p>
            </div>
            <div className="panel-tools">
              <button className="report-button" onClick={exportReport} disabled={accounts.length === 0}>
                ↓ Rapor Al
              </button>
              <label className="search-box">
                <span aria-hidden="true">⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Müşteri, firma veya telefon ara..."
                />
              </label>
            </div>
          </div>

          <div className="filter-tabs" role="tablist" aria-label="Hesap filtresi">
            {([
              ["all", "Tümü"],
              ["overdue", "Vadesi Geçen"],
              ["soon", "Yaklaşan"],
              ["paid", "Kapananlar"],
            ] as [Filter, string][]).map(([key, label]) => (
              <button
                key={key}
                className={filter === key ? "active" : ""}
                onClick={() => setFilter(key)}
                role="tab"
                aria-selected={filter === key}
              >
                {label}
              </button>
            ))}
          </div>

          {error ? (
            <div className="state-box error-state">
              <strong>Kayıtlar yüklenemedi</strong>
              <span>{error}</span>
              <button onClick={() => void loadAccounts()}>Tekrar dene</button>
            </div>
          ) : loading ? (
            <div className="state-box">Kayıtlar hazırlanıyor…</div>
          ) : filteredAccounts.length === 0 ? (
            <div className="state-box empty-state">
              <div>₺</div>
              <strong>Bu bölümde kayıt yok</strong>
              <span>Yeni bir açık hesap eklediğinizde burada görünecek.</span>
              <button className="primary-button" onClick={() => setNewAccountOpen(true)}>
                Yeni Açık Hesap Ekle
              </button>
            </div>
          ) : (
            <div className="account-list">
              {filteredAccounts.map((account) => {
                const due = dueState(account, today);
                const paidRatio = Math.min(100, Math.round((account.paidAmount / account.originalAmount) * 100));
                return (
                  <article className={`account-card status-${due.key}`} key={account.id}>
                    <div className="account-person">
                      <div className="avatar">{account.customerName.slice(0, 1).toLocaleUpperCase("tr-TR")}</div>
                      <div>
                        <h3>{account.customerName}</h3>
                        <p>{account.company || "Bireysel müşteri"}</p>
                        {account.phone && <a href={`tel:${account.phone}`}>{account.phone}</a>}
                        {account.email && <a href={`mailto:${account.email}`}>{account.email}</a>}
                      </div>
                    </div>
                    <div className="account-amount">
                      <span>Kalan Borç</span>
                      <strong>{formatMoney(account.remainingAmount)}</strong>
                      <small>Toplam {formatMoney(account.originalAmount)}</small>
                      <div className="progress-track"><span style={{ width: `${paidRatio}%` }} /></div>
                    </div>
                    <div className="account-payment">
                      <span>Ödeme Şekli</span>
                      <strong>{account.plannedPaymentMethod}</strong>
                      {account.paidAmount > 0 && <small>{formatMoney(account.paidAmount)} tahsil edildi</small>}
                    </div>
                    <div className="account-date">
                      <span>Ödeme Tarihi</span>
                      <strong>{formatDate(account.dueDate)}</strong>
                      <em className={`due-badge badge-${due.key}`}>{due.label}</em>
                    </div>
                    <div className="account-action">
                      <label className={`paid-toggle ${account.remainingAmount <= 0 ? "is-paid" : ""}`}>
                        <input
                          type="checkbox"
                          checked={account.remainingAmount <= 0 || markingPaid === account.id}
                          disabled={account.remainingAmount <= 0 || markingPaid === account.id}
                          onChange={() => void markAsPaid(account)}
                          aria-label={`${account.customerName} ödemesini tamamlandı olarak işaretle`}
                        />
                        <span aria-hidden="true">✓</span>
                        <b>{markingPaid === account.id ? "İşleniyor" : "Ödendi"}</b>
                      </label>
                      {account.remainingAmount > 0 && (
                        <button className="partial-button" onClick={() => setPaymentAccount(account)}>
                          Kısmi ödeme
                        </button>
                      )}
                      <button className="notify-button" onClick={() => openNotification(account)}>
                        ↗ Hareketi bildir
                      </button>
                    </div>
                    {account.note && <p className="account-note">Not: {account.note}</p>}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div> : activeSection === "cards" || activeSection === "loans" ? <FinancePanel mode={activeSection} /> : <PersonalFinancePanel mode={activeSection as "expenses" | "bills" | "subscriptions" | "assistant" | "calendar" | "reports"} accounts={accounts} />}

      {settingsOpen && (
        <div className="modal-backdrop settings-backdrop" onMouseDown={() => setSettingsOpen(false)}>
          <div className="settings-modal" onMouseDown={(event) => event.stopPropagation()}>
            <BrandingSetup mode="settings" profile={profile} onSaved={handleProfileSaved} onClose={() => setSettingsOpen(false)} />
          </div>
        </div>
      )}

      {supportOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSupportOpen(false)}>
          <section className="modal-card support-modal" role="dialog" aria-modal="true" aria-labelledby="support-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="modal-kicker">PRATİKALL DESTEK</span>
                <h2 id="support-title">Nasıl yardımcı olabiliriz?</h2>
                <p>Hata, yardım talebi ve geliştirme istekleri doğru ekibe otomatik yönlendirilir.</p>
              </div>
              <button className="close-button" onClick={() => setSupportOpen(false)} aria-label="Destek penceresini kapat">×</button>
            </div>
            {supportResult ? (
              <div className="support-success">
                <div>✓</div>
                <h3>Görüşünüz kaydedildi</h3>
                <p>Takip numarası: <strong>{supportResult.id.slice(0, 8).toLocaleUpperCase("tr-TR")}</strong> · Durum: Yeni</p>
                <button className="primary-button" onClick={() => setSupportOpen(false)}>Tamam</button>
              </div>
            ) : (
              <form className="account-form support-form" onSubmit={submitSupportReport}>
                <label><span>Bildirim türü *</span><select name="reportType" defaultValue="error"><option value="request">Öneri</option><option value="error">Hata Bildir</option><option value="request">Özellik İsteği</option><option value="help">Diğer</option></select></label>
                <label><span>Kısa başlık *</span><input name="subject" required minLength={3} maxLength={140} placeholder="Örneğin: Fatura kaydı oluşturulamıyor" /></label>
                <label><span>Açıklama *</span><textarea name="details" required minLength={5} maxLength={4000} rows={6} placeholder="Ne yapmaya çalıştığınızı ve ne olduğunu yazın…" /></label>
                <p className="support-privacy">Müşteri, kart veya finans kayıtlarınız bu mesaja otomatik olarak eklenmez.</p>
                {supportError && <div className="form-error" role="alert">{supportError}</div>}
                <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setSupportOpen(false)}>Vazgeç</button><button className="primary-button" disabled={supportSubmitting}>{supportSubmitting ? "Yönlendiriliyor…" : "Raporu Gönder"}</button></div>
              </form>
            )}
          </section>
        </div>
      )}

      {newAccountOpen && (
        <div className="modal-backdrop" onMouseDown={() => setNewAccountOpen(false)}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="new-account-title" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="modal-kicker">YENİ KAYIT</span>
                <h2 id="new-account-title">Yeni Açık Hesap</h2>
                <p>Müşteri ve ödeme planı bilgilerini girin.</p>
              </div>
              <button className="close-button" onClick={() => setNewAccountOpen(false)} aria-label="Pencereyi kapat">×</button>
            </div>
            <form onSubmit={createAccount} className="account-form">
              <div className="field-grid">
                <label><span>Müşteri Adı *</span><input name="customerName" required autoFocus placeholder="Ad Soyad" /></label>
                <label><span>Firma / Grup</span><input name="company" placeholder="İsteğe bağlı" /></label>
                <label><span>Telefon</span><input name="phone" inputMode="tel" placeholder="05xx xxx xx xx" /></label>
                <label><span>E-posta</span><input name="email" type="email" inputMode="email" placeholder="musteri@ornek.com" /></label>
                <label><span>Borç Tutarı *</span><div className="money-input"><input name="amount" required type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0,00" /><b>₺</b></div></label>
                <label><span>Planlanan Ödeme Şekli *</span><select name="plannedPaymentMethod" defaultValue="Havale / EFT">{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></label>
                <label><span>Ödeme Tarihi *</span><input name="dueDate" type="date" required min={today} /></label>
              </div>
              <label><span>Not</span><textarea name="note" rows={3} placeholder="Ürün, anlaşma veya hatırlatma notu..." /></label>
              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={() => setNewAccountOpen(false)}>Vazgeç</button>
                <button className="primary-button" disabled={submitting}>{submitting ? "Kaydediliyor…" : "Kaydı Oluştur"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {paymentAccount && (
        <div className="modal-backdrop" onMouseDown={() => setPaymentAccount(null)}>
          <section className="modal-card payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="modal-kicker">TAHSİLAT</span>
                <h2 id="payment-title">Ödeme Kaydet</h2>
                <p>{paymentAccount.customerName}</p>
              </div>
              <button className="close-button" onClick={() => setPaymentAccount(null)} aria-label="Pencereyi kapat">×</button>
            </div>
            <div className="remaining-banner"><span>Kalan borç</span><strong>{formatMoney(paymentAccount.remainingAmount)}</strong></div>
            <form onSubmit={addPayment} className="account-form">
              <label><span>Tahsil Edilen Tutar *</span><div className="money-input"><input name="amount" required type="number" min="0.01" max={(paymentAccount.remainingAmount / 100).toFixed(2)} step="0.01" defaultValue={(paymentAccount.remainingAmount / 100).toFixed(2)} inputMode="decimal" /><b>₺</b></div></label>
              <div className="field-grid">
                <label><span>Ödeme Şekli *</span><select name="method" defaultValue={paymentAccount.plannedPaymentMethod}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></label>
                <label><span>Tahsilat Tarihi *</span><input name="paidAt" type="date" required defaultValue={today} max={today} /></label>
              </div>
              <label><span>Açıklama</span><textarea name="note" rows={2} placeholder="İsteğe bağlı not..." /></label>
              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={() => setPaymentAccount(null)}>Vazgeç</button>
                <button className="primary-button" disabled={submitting}>{submitting ? "Kaydediliyor…" : "Tahsilatı Kaydet"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {notificationAccount && notificationDraft && (
        <div className="modal-backdrop" onMouseDown={closeNotification}>
          <section className="modal-card notification-modal" role="dialog" aria-modal="true" aria-labelledby="notification-title" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="modal-kicker">MÜŞTERİ BİLDİRİMİ</span>
                <h2 id="notification-title">Hareketi Müşteriye Bildir</h2>
                <p>{notificationAccount.customerName}</p>
              </div>
              <button className="close-button" onClick={closeNotification} aria-label="Pencereyi kapat">×</button>
            </div>
            <div className="notification-balance">
              <div><span>Güncel kalan bakiye</span><strong>{formatMoney(notificationAccount.remainingAmount)}</strong></div>
              <small>Gönderim isteğe bağlıdır; seçmediğiniz kanal kullanılmaz.</small>
            </div>

            {notificationResult ? (
              <div className="notification-result">
                <div className={`result-icon result-${notificationResult.deliveryStatus}`}>{notificationResult.deliveryStatus === "submitted" ? "✓" : notificationResult.deliveryStatus === "partial" ? "!" : "×"}</div>
                <h3>{notificationResult.summary}</h3>
                <p>Gönderim PratikAll içinden gerçekleştirildi; telefonunuzda başka bir uygulama açılmadı.</p>
                <div className="delivery-results">
                  {notificationResult.results.map((result) => <div key={result.channel} className={`delivery-row delivery-${result.status}`}><span>{result.channel === "sms" ? "SMS" : "E-POSTA"}</span><div><strong>{result.recipient}</strong><small>{result.provider}{result.providerId ? ` · No: ${result.providerId}` : ""}</small>{result.error && <em>{result.error}</em>}</div><b>{result.status === "submitted" ? "Gönderildi" : "Gönderilemedi"}</b></div>)}
                </div>
                <div className="notification-launchers">
                  {notificationResult.deliveryStatus !== "submitted" && <button className="primary-button" type="button" onClick={() => setNotificationResult(null)}>Düzenle ve tekrar dene</button>}
                  <button className="secondary-button" type="button" onClick={() => void copyNotificationMessage()}>Metni kopyala</button>
                </div>
                <button className="result-close" type="button" onClick={closeNotification}>Tamam</button>
              </div>
            ) : (
              <form onSubmit={prepareNotification} className="account-form notification-form">
                <label>
                  <span>Hareket Türü</span>
                  <select value={notificationDraft.eventType} onChange={(event) => changeNotificationEvent(event.target.value as NotificationEvent)}>
                    <option value="account_summary">Hesap özeti</option>
                    <option value="payment_reminder">Ödeme hatırlatması</option>
                    <option value="payment_received">Tahsilat bilgisi</option>
                  </select>
                </label>

                <fieldset className="notification-channels">
                  <legend>Gönderim Kanalları *</legend>
                  <div>
                    <label className={`${notificationDraft.channels.includes("sms") ? "selected" : ""} ${!integrationStatus.sms.ready ? "unavailable" : ""}`}>
                      <input type="checkbox" checked={notificationDraft.channels.includes("sms")} disabled={!integrationStatus.sms.ready} onChange={() => toggleNotificationChannel("sms")} />
                      <span className="channel-icon">SMS</span>
                      <span><b>SMS</b><small>{integrationStatus.sms.ready ? `${integrationStatus.sms.provider} bağlı` : "NETGSM bağlantısı bekleniyor"}</small></span>
                      <i>✓</i>
                    </label>
                    <label className={`${notificationDraft.channels.includes("email") ? "selected" : ""} ${!integrationStatus.email.ready ? "unavailable" : ""}`}>
                      <input type="checkbox" checked={notificationDraft.channels.includes("email")} disabled={!integrationStatus.email.ready} onChange={() => toggleNotificationChannel("email")} />
                      <span className="channel-icon">@</span>
                      <span><b>E-posta</b><small>{integrationStatus.email.ready ? `${integrationStatus.email.provider} bağlı` : "E-posta servisi bağlantısı bekleniyor"}</small></span>
                      <i>✓</i>
                    </label>
                  </div>
                </fieldset>

                <div className="field-grid">
                  <label><span>Telefon</span><input value={notificationDraft.phone} onChange={(event) => setNotificationDraft({ ...notificationDraft, phone: event.target.value })} inputMode="tel" placeholder="05xx xxx xx xx" /></label>
                  <label><span>E-posta</span><input value={notificationDraft.email} onChange={(event) => setNotificationDraft({ ...notificationDraft, email: event.target.value })} type="email" inputMode="email" placeholder="musteri@ornek.com" /></label>
                </div>

                <label><span>Gönderilecek Mesaj *</span><textarea value={notificationDraft.message} onChange={(event) => setNotificationDraft({ ...notificationDraft, message: event.target.value })} rows={5} maxLength={700} /></label>
                <p className="integration-note">Gönderim doğrudan program içinden yapılır. Başarılı ve başarısız sonuçlar müşteri hareketine kaydedilir; telefonun SMS veya e-posta uygulaması açılmaz.</p>
                <div className="form-actions">
                  <button type="button" className="secondary-button" onClick={closeNotification}>Vazgeç</button>
                  <button className="primary-button" disabled={submitting || notificationDraft.channels.length === 0}>{submitting ? "Gönderiliyor…" : "Şimdi Gönder"}</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {quickAddOpen && <div className="quick-add-sheet" role="dialog" aria-label="Hızlı işlem"><div><strong>Ne eklemek istersiniz?</strong><button onClick={() => setQuickAddOpen(false)}>×</button></div><section>
        <button onClick={() => { setActiveSection("accounts"); setNewAccountOpen(true); setQuickAddOpen(false); }}>Gelir Ekle</button><button onClick={() => { setActiveSection("expenses"); setQuickAddOpen(false); }}>Gider Ekle</button><button onClick={() => { setActiveSection("accounts"); setNewAccountOpen(true); setQuickAddOpen(false); }}>Alacak Ekle</button><button onClick={() => { setActiveSection("bills"); setQuickAddOpen(false); }}>Borç Ekle</button><button onClick={() => { setActiveSection("bills"); setQuickAddOpen(false); }}>Fatura Ekle</button><button onClick={() => { setActiveSection("cards"); setQuickAddOpen(false); }}>Kredi Kartı Ekle</button><button onClick={() => { setActiveSection("loans"); setQuickAddOpen(false); }}>Kredi Ekle</button><button onClick={() => { setActiveSection("subscriptions"); setQuickAddOpen(false); }}>Abonelik Ekle</button><button onClick={() => { setActiveSection("assistant"); setQuickAddOpen(false); }}>Hatırlatma Ekle</button>
      </section></div>}
      <nav className="instant-dock" aria-label="Mobil ana menü">
        <button className={activeSection === "overview" ? "active" : ""} onClick={() => { setActiveSection("overview"); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span>⌂</span><b>Ana Sayfa</b></button>
        <button className={activeSection === "accounts" ? "active" : ""} onClick={() => { setActiveSection("accounts"); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span>↔</span><b>İşlemler</b></button>
        <button className="dock-assistant" onClick={() => setQuickAddOpen(!quickAddOpen)}><span>＋</span><b>Ekle</b></button>
        <button className={activeSection === "reports" ? "active" : ""} onClick={() => { setActiveSection("reports"); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span>↗</span><b>Raporlar</b></button>
        <Link href="/account"><span>○</span><b>Profil</b></Link>
      </nav>

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
