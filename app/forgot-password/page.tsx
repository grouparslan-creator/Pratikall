import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const sent = params.sent === "1";
  const error = typeof params.error === "string" ? params.error : "";
  return <main className="login-page"><section className="login-card auth-narrow-card">
    <Link href="/start" className="login-brand"><img src="/pratikall-logo.png" alt="PratikAll"/><span>Pratik<span>All</span></span></Link>
    <p className="eyebrow">HESAP KURTARMA</p><h1>Şifrenizi yenileyin</h1>
    <p className="login-lead">Hesabınızda kullandığınız e-posta adresine güvenli bir yenileme bağlantısı gönderelim.</p>
    {sent && <p className="auth-success" role="status">Eğer bu e-posta ile bir hesap varsa şifre yenileme bağlantısı gönderildi. Gelen kutusu ve spam klasörünü kontrol edin.</p>}
    {error && <p className="login-security" role="alert">İstek şu anda tamamlanamadı. Birkaç dakika sonra yeniden deneyin.</p>}
    <form action="/api/auth/recover" method="post" className="auth-single-form">
      <label htmlFor="recovery-email">E-posta adresi</label>
      <input id="recovery-email" name="email" type="email" autoComplete="email" required placeholder="adiniz@ornek.com" />
      <button type="submit" className="auth-submit-input">Yenileme bağlantısı gönder</button>
    </form>
    <div className="auth-page-links"><Link href="/login">Giriş ekranına dön</Link><Link href="/verify-email">Doğrulama e-postasını yeniden gönder</Link></div>
  </section></main>;
}
