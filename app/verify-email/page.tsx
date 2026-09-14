import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const sent = params.sent === "1";
  return <main className="login-page"><section className="login-card auth-narrow-card">
    <Link href="/start" className="login-brand"><img src="/pratikall-logo.png" alt="PratikAll"/><span>Pratik<span>All</span></span></Link>
    <p className="eyebrow">E-POSTA DOĞRULAMA</p><h1>Gelen kutunuzu kontrol edin</h1>
    <p className="login-lead">Hesabınızı etkinleştirmek için gönderdiğimiz bağlantıya tıklayın. Bağlantı gelmediyse aşağıdan yeniden isteyebilirsiniz.</p>
    {sent && <p className="auth-success" role="status">Eğer hesap doğrulanmayı bekliyorsa yeni bağlantı gönderildi. Spam klasörünü de kontrol edin.</p>}
    <form action="/api/auth/resend-confirmation" method="post" className="auth-single-form">
      <label htmlFor="confirmation-email">E-posta adresi</label>
      <input id="confirmation-email" name="email" type="email" autoComplete="email" required placeholder="adiniz@ornek.com" />
      <button type="submit" className="auth-submit-input">Doğrulama e-postasını yeniden gönder</button>
    </form>
    <div className="auth-page-links"><Link href="/login">E-postamı doğruladım, giriş yap</Link></div>
  </section></main>;
}
