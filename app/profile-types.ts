import type { CSSProperties } from "react";

export type ModuleKey =
  | "overview"
  | "accounts"
  | "cards"
  | "loans"
  | "expenses"
  | "bills"
  | "subscriptions"
  | "assistant"
  | "calendar"
  | "reports";

export type UserProfile = {
  ownerName: string;
  appName: string;
  companyName: string;
  theme: string;
  enabledModules: ModuleKey[];
  defaultReminderDays: number;
  logoUrl: string;
  useDefaultLogo: boolean;
  emailSenderName: string;
  emailReplyTo: string;
  emailSignature: string;
  setupCompleted: boolean;
};

export const MODULE_OPTIONS: { key: ModuleKey; label: string; detail: string }[] = [
  { key: "overview", label: "Genel Bakış", detail: "Toplamlar ve öncelikli işler" },
  { key: "accounts", label: "Açık Hesaplar", detail: "Alacak ve tahsilat takibi" },
  { key: "cards", label: "Kredi Kartları", detail: "Ekstre, limit ve ödeme tarihleri" },
  { key: "loans", label: "Krediler", detail: "Taksit ve kalan borç takibi" },
  { key: "expenses", label: "Harcamalar", detail: "Kişisel gider, kategori ve kart takibi" },
  { key: "bills", label: "Faturalar", detail: "Tekrarlayan faturalar ve otomatik ödeme" },
  { key: "subscriptions", label: "Abonelikler", detail: "Dijital üyelik, yenileme ve kart bilgisi" },
  { key: "assistant", label: "Asistan", detail: "Notlar, görevler ve hatırlatmalar" },
  { key: "calendar", label: "Takvim", detail: "Tüm ödeme ve hatırlatmaları birleştirir" },
  { key: "reports", label: "Raporlar", detail: "Harcama, bütçe ve finansal özet" },
];

export const THEME_OPTIONS = [
  { key: "red", label: "PratikAll", color: "#d71635", dark: "#ad1028", soft: "#fff0f3" },
  { key: "blue", label: "Lacivert", color: "#2457d6", dark: "#1942ae", soft: "#edf3ff" },
  { key: "green", label: "Yeşil", color: "#168451", dark: "#0f6840", soft: "#eaf8f1" },
  { key: "purple", label: "Mor", color: "#7351c5", dark: "#5837aa", soft: "#f3efff" },
  { key: "graphite", label: "Antrasit", color: "#343943", dark: "#22262d", soft: "#f0f1f3" },
] as const;

export function profileThemeStyle(theme: string) {
  const selected = THEME_OPTIONS.find((item) => item.key === theme) ?? THEME_OPTIONS[0];
  return {
    "--red": selected.color,
    "--red-dark": selected.dark,
    "--red-soft": selected.soft,
  } as CSSProperties;
}
