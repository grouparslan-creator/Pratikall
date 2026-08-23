import Link from "next/link";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { getBillingIntegrationStatus } from "@/app/lib/billing";
export const dynamic = "force-dynamic";
export default async function BillingPage() {
  await requireChatGPTUser("/billing");
  const billing = getBillingIntegrationStatus();
  return <main className="account-page"><section className="account-card"><div className="account-brand"><img src="/pratikall-logo.png" alt="PratikAll"/><span>PratikAll</span></div><p className="eyebrow">ÖDEME VE ÜYELİK</p><h1>Üyeliğinizi yönetin</h1><p className="account-lead">30 günlük ücretsiz deneme boyunca ücret alınmaz. Ücretli üyelik kullanıma açıldığında paket ve ödeme onayı ayrıca gösterilir.</p><div className="account-status"><div><span>Mevcut dönem</span><strong>Ücretsiz deneme</strong></div><div><span>Ödeme güvenliği</span><strong>İyzico</strong></div></div><div className="billing-safety"><strong>Ödeme kontrolü sizde</strong><p>Onayınız olmadan ücretli üyelik başlatılmaz. Kart bilgileriniz PratikAll sunucularında saklanmaz.</p></div><div className="account-actions">{billing.ready ? <button className="primary-button">Paket seç</button> : <Link className="primary-button" href="/start#plans">Paketleri incele</Link>}<Link className="quiet-account-link" href="/account">Hesabıma dön</Link></div></section></main>;
}
