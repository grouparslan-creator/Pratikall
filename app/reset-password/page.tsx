import Link from "next/link";
import ResetPasswordForm from "./reset-password-form";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return <main className="login-page"><section className="login-card auth-narrow-card">
    <Link href="/start" className="login-brand"><img src="/pratikall-logo.png" alt="PratikAll"/><span>Pratik<span>All</span></span></Link>
    <p className="eyebrow">YENİ ŞİFRE</p><h1>Yeni şifrenizi belirleyin</h1>
    <p className="login-lead">Bağlantınız doğrulandıktan sonra en az 8 karakterlik yeni bir şifre oluşturun.</p>
    <ResetPasswordForm />
    <div className="auth-page-links"><Link href="/login">Giriş ekranına dön</Link></div>
  </section></main>;
}
