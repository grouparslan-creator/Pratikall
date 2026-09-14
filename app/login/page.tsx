import Link from "next/link";
import SignupForm from "./signup-form";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const returnTo = typeof params.return_to === "string" ? params.return_to : "/app";
  const error = typeof params.error === "string" ? params.error : "";
  const created = params.created === "1";
  const passwordUpdated = params.password_updated === "1";
  const expired = params.expired === "1";
  const errorMessages: Record<string, string> = {
    config: "Kayıt servisi henüz yapılandırılmamış. Lütfen yöneticiye bildirin.",
    email: "Geçerli bir e-posta adresi girin.",
    password: "Şifreniz en az 8 karakter olmalı.",
    password_match: "Şifreler birbiriyle aynı olmalı.",
    name: "Ad ve soyadınızı girin.",
    phone: "Geçerli bir telefon numarası girin.",
    terms: "Devam etmek için kullanım koşullarını ve gizlilik politikasını kabul edin.",
    company: "Kurumsal hesap için şirket unvanını girin.",
    tax_number: "Vergi numarası 10, şahıs şirketi TCKN bilgisi 11 haneli olmalı.",
    billing: "Kurumsal fatura bilgilerini eksiksiz doldurun.",
    exists: "Bu e-posta adresiyle zaten bir hesap bulunuyor. Giriş yapmayı deneyin.",
    disabled: "Yeni hesap oluşturma şu anda kapalı.",
    rate_limit: "Çok fazla doğrulama isteği gönderildi. Birkaç dakika sonra yeniden deneyin.",
    unavailable: "Kayıt servisine şu anda ulaşılamıyor. Lütfen biraz sonra yeniden deneyin.",
    signup: "Hesap oluşturulamadı. Bilgilerinizi kontrol edip yeniden deneyin.",
    missing: "E-posta ve şifre alanlarını doldurun.",
    invalid: "Giriş bilgileri doğrulanamadı. Bilgilerinizi kontrol edip yeniden deneyin.",
    unconfirmed: "E-posta adresiniz henüz doğrulanmamış. Doğrulama bağlantısını yeniden isteyebilirsiniz.",
    reset_invalid: "Şifre yenileme bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı isteyin.",
  };
  return <main className="login-page"><section className="login-card">
    <Link href="/start" className="login-brand"><img src="/pratikall-logo.png" alt="PratikAll"/><span>Pratik<span>All</span></span></Link>
    <p className="eyebrow">GÜVENLİ GİRİŞ</p><h1>Hesabınıza giriş yapın</h1><p className="login-lead">E-posta adresiniz ve şifrenizle PratikAll hesabınıza erişin.</p>
    {error && <p className="login-security" role="alert">{errorMessages[error] ?? errorMessages.signup}</p>}
    {created && <p className="login-security">Hesabınız oluşturuldu. E-posta doğrulaması açıksa gelen mesajdaki bağlantıyı tamamlayıp giriş yapın.</p>}
    {passwordUpdated && <p className="auth-success" role="status">Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.</p>}
    {expired && <p className="login-security" role="alert">Oturumunuzun süresi doldu. Lütfen yeniden giriş yapın.</p>}
    {error === "unconfirmed" && <p className="auth-inline-action"><Link href="/verify-email">Doğrulama e-postasını yeniden gönder</Link></p>}
    <div className="login-options">
      <div className="email-login ready"><div className="email-login-title"><b>@</b><span><strong>E-posta ile giriş</strong><small>Supabase Auth ile güvenli oturum</small></span></div>
        <form action="/api/auth/login" method="post"><input type="hidden" name="return_to" value={returnTo}/><label htmlFor="login-email">E-posta adresi</label><div className="auth-fields"><input id="login-email" name="email" type="email" autoComplete="email" placeholder="adiniz@ornek.com" required/><input name="password" type="password" autoComplete="current-password" placeholder="Şifreniz" minLength={8} required/></div><input type="submit" value="Giriş yap" className="auth-submit-input" style={{display:"block",width:"100%",minHeight:"44px",marginTop:"8px",border:"0",borderRadius:"10px",background:"var(--pa)",color:"#fff",fontWeight:800,cursor:"pointer"}} /><Link className="forgot-password-link" href="/forgot-password">Şifremi unuttum</Link></form>
      </div>
      <div className="login-divider"><span>veya</span></div>
      <div className="email-login ready"><div className="email-login-title"><b>+</b><span><strong>Yeni hesap oluştur</strong><small>Bireysel veya kurumsal hesabınızı hazırlayın</small></span></div>
        <SignupForm />
      </div>
    </div>
    <p className="login-security">Giriş bilgileriniz Supabase Auth tarafından doğrulanır. Şifreniz PratikAll veritabanında saklanmaz.</p>
    <div className="login-links"><Link href="/privacy">Gizlilik</Link><Link href="/terms">Kullanım koşulları</Link></div>
  </section></main>;
}
