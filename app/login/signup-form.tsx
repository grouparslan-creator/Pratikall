"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignupForm() {
  const [accountType, setAccountType] = useState<"personal" | "business">("personal");

  return <form action="/api/auth/signup" method="post" className="signup-form">
    <fieldset className="account-type-picker">
      <legend>Hesap türü</legend>
      <label className={accountType === "personal" ? "active" : ""}>
        <input type="radio" name="account_type" value="personal" checked={accountType === "personal"} onChange={() => setAccountType("personal")} />
        <span><strong>Bireysel</strong><small>Kişisel finans takibi</small></span>
      </label>
      <label className={accountType === "business" ? "active" : ""}>
        <input type="radio" name="account_type" value="business" checked={accountType === "business"} onChange={() => setAccountType("business")} />
        <span><strong>Kurumsal</strong><small>İşletme ve faturalama</small></span>
      </label>
    </fieldset>
    <div className="signup-grid">
      <label><span>Ad soyad *</span><input name="full_name" autoComplete="name" maxLength={100} required placeholder="Adınız Soyadınız" /></label>
      <label><span>Telefon *</span><input name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={20} required placeholder="05xx xxx xx xx" /></label>
      <label><span>E-posta *</span><input name="email" type="email" autoComplete="email" required placeholder="adiniz@ornek.com" /></label>
      <label><span>Şifre *</span><input name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="En az 8 karakter" /></label>
      <label className="field-wide"><span>Şifre tekrar *</span><input name="password_confirm" type="password" autoComplete="new-password" minLength={8} required placeholder="Şifrenizi yeniden yazın" /></label>
    </div>
    {accountType === "business" && <section className="business-fields" aria-label="Kurumsal fatura bilgileri">
      <h3>Kurumsal fatura bilgileri</h3><p>Faturanızın doğru düzenlenebilmesi için resmi bilgileri girin.</p>
      <div className="signup-grid">
        <label className="field-wide"><span>Resmî şirket unvanı *</span><input name="company_name" maxLength={150} required placeholder="Vergi levhasındaki unvan" /></label>
        <label><span>VKN / TCKN *</span><input name="tax_number" inputMode="numeric" pattern="[0-9]{10,11}" minLength={10} maxLength={11} required placeholder="10 veya 11 hane" /></label>
        <label><span>Vergi dairesi *</span><input name="tax_office" maxLength={100} required placeholder="Vergi dairesi" /></label>
        <label><span>İl *</span><input name="billing_city" autoComplete="address-level1" maxLength={60} required placeholder="İl" /></label>
        <label><span>İlçe *</span><input name="billing_district" autoComplete="address-level2" maxLength={60} required placeholder="İlçe" /></label>
        <label className="field-wide"><span>Fatura adresi *</span><textarea name="billing_address" autoComplete="street-address" maxLength={300} required rows={3} placeholder="Açık adres" /></label>
      </div>
    </section>}
    <label className="terms-check">
      <input name="terms_accepted" type="checkbox" value="yes" required />
      <span><Link href="/terms">Kullanım koşullarını</Link> ve <Link href="/privacy">gizlilik politikasını</Link> okudum, kabul ediyorum.</span>
    </label>
    <button type="submit" className="auth-submit-input">Hesap oluştur</button>
  </form>;
}
