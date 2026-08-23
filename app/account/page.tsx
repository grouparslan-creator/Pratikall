import Link from "next/link";
import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import { ensureMembershipsTable, getD1 } from "@/db";

export const dynamic = "force-dynamic";
type Membership = { trialEndsAt: string; emailReminders: number };

export default async function AccountPage() {
  const user = await requireChatGPTUser("/account");
  await ensureMembershipsTable();
  const db = getD1();
  const userKey = user.email.toLocaleLowerCase("tr-TR");
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + 30);
  await db.prepare("INSERT OR IGNORE INTO memberships (user_key, trial_ends_at) VALUES (?, ?)").bind(userKey, end.toISOString()).run();
  const membership = await db.prepare("SELECT trial_ends_at AS trialEndsAt, email_reminders AS emailReminders FROM memberships WHERE user_key = ?").bind(userKey).first<Membership>();
  const trialEnd = membership ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(membership.trialEndsAt)) : "—";

  return (
    <main className="account-page"><section className="account-card">
      <div className="account-brand"><img src="/pratikall-logo.png" alt="PratikAll"/><span>PratikAll</span></div>
      <p className="eyebrow">GÜVENLİK VE VERİLERİM</p><h1>Merhaba, {user.fullName || user.displayName}</h1>
      <p className="account-lead">Hesabınızı, üyeliğinizi ve verilerinizle ilgili işlemleri buradan yönetebilirsiniz.</p>
      <div className="account-status"><div><span>Plan</span><strong>30 günlük deneme</strong></div><div><span>Durum</span><strong>Aktif</strong></div><div><span>Deneme bitişi</span><strong>{trialEnd}</strong></div><div><span>E-posta hatırlatmaları</span><strong>{membership?.emailReminders ? "Açık" : "Kapalı"}</strong></div></div>
      <div className="security-statements"><p>✓ Verileriniz sizin kontrolünüzdedir.</p><p>✓ PratikAll hesabınızdan sizin adınıza finansal işlem gerçekleştirmez.</p><p>✓ Desteklenen verilerinizi dışa aktarabilir veya hesap silme talebi oluşturabilirsiniz.</p></div>
      <div className="account-actions"><Link className="primary-button" href="/app">Uygulamaya dön</Link><Link className="quiet-account-link" href="/billing">Ödeme ve üyelik</Link><Link className="quiet-account-link" href="/export">Verilerimi dışa aktar</Link><Link className="quiet-account-link" href="/privacy">Gizlilik</Link><a className="quiet-account-link" href={chatGPTSignOutPath("/start")}>Tüm cihazlardan çıkış yap</a></div>
      <p className="account-note">Şifre işlemleri kullandığınız giriş sağlayıcısı üzerinden yönetilir. Hesabınızı silmek için uygulamadaki “Görüşünü Bildir” alanından hesap silme talebi oluşturabilirsiniz.</p>
    </section></main>
  );
}
