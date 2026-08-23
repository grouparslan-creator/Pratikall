"use client";

import { useState } from "react";
import Link from "next/link";

const plans = [
  { name: "Bireysel", monthly: 124, yearly: 1240, desc: "Kişisel finansını düzenli ve sade biçimde takip et.", features: ["Gelir / gider", "Borç / alacak", "Fatura ve kart takibi", "Abonelikler", "Hatırlatmalar"] },
  { name: "Pro", monthly: 291, yearly: 2910, desc: "Esnaf ve serbest çalışanların günlük finans merkezi.", badge: "EN ÇOK TERCİH EDİLEN", features: ["Bireysel paketteki her şey", "Müşteri ve tahsilat", "Gelişmiş raporlar", "Veri dışa aktarma", "Öncelikli destek"] },
  { name: "İşletme", monthly: 624, yearly: 6240, desc: "Ekibini ve işletme finansını tek merkezden yönet.", features: ["Pro paketteki her şey", "Çoklu kullanıcı", "Rol ve yetkilendirme", "İşletme raporları", "Ekip yönetimi"] },
];

const comparison = [
  ["Gelir / gider", true, true, true], ["Borç / alacak", true, true, true], ["Fatura takibi", true, true, true],
  ["Kredi kartı", true, true, true], ["Abonelik", true, true, true], ["Hatırlatmalar", true, true, true],
  ["Temel raporlama", true, true, true], ["Veri dışa aktarma", false, true, true], ["Müşteri tahsilatı", false, true, true],
  ["Çoklu kullanıcı", false, false, true], ["Yetkilendirme", false, false, true], ["Gelişmiş raporlar", false, true, true],
];

const faqs = [
  ["PratikAll nedir?", "Borç, alacak, fatura, kart, abonelik, harcama ve hatırlatmaları tek çalışma alanında takip etmenizi sağlayan finansal asistandır."],
  ["PratikAll banka hesabıma erişir mi?", "Hayır. Mevcut sürüm banka hesabınıza bağlanmaz; yalnızca sizin eklediğiniz kayıtlarla çalışır."],
  ["Kart bilgilerim saklanıyor mu?", "Tam kart numarası veya güvenlik kodu saklanmaz. Kart takibi için yalnızca sizin girdiğiniz kart adı, banka ve son dört hane gibi bilgiler kullanılır."],
  ["Üyeliğimi istediğim zaman iptal edebilir miyim?", "Aktif ücretli abonelik başladığında üyelik yönetimi hesabınızdan yapılacaktır. Şu anda ödeme sistemi tamamlanmadan ücret alınmaz."],
  ["Verilerimi dışa aktarabilir miyim?", "Evet. Desteklenen kayıtları CSV ve Excel uyumlu biçimde indirebilir, rapor görünümünü PDF olarak kaydedebilirsiniz."],
  ["PratikAll bireysel kullanıcılar için uygun mu?", "Evet. Fatura, kart, abonelik, harcama ve kişisel hatırlatma modülleri bireysel kullanım için hazırlanmıştır."],
  ["İşletmemde birden fazla kullanıcı kullanabilir mi?", "Çoklu kullanıcı ve yetkilendirme İşletme paketinin planlanan kapsamındadır; genel kullanıma açılmadan önce ayrıca duyurulacaktır."],
  ["Mobil telefonda kullanabilir miyim?", "Evet. Web uygulaması telefon ekranlarına uyumludur ve desteklenen cihazlarda ana ekrana eklenebilir."],
];

export default function StartPage() {
  const [yearly, setYearly] = useState(true);
  return <main className="marketing-shell">
    <header className="marketing-header">
      <Link href="/start" className="marketing-brand"><img src="/pratikall-logo.png" alt="PratikAll" /><span>Pratik<span>All</span></span></Link>
      <nav><a href="#how">Nasıl Çalışır?</a><a href="#audience">Kimin İçin?</a><a href="#plans">Paketler</a><a href="#faq">SSS</a></nav>
      <div className="marketing-actions"><Link href="/login">Giriş yap</Link><Link className="marketing-cta" href="/login">Ücretsiz Başla</Link></div>
    </header>

    <section className="marketing-hero">
      <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
      <p>FİNANS VE İŞ YÖNETİMİ, TEK YERDE</p>
      <h1>Finansını, ödemelerini ve tahsilatlarını tek yerden takip et.</h1>
      <span>Borçlarını, alacaklarını, faturalarını, kredi kartlarını ve yaklaşan ödemelerini PratikAll takip etsin. Sen sadece işine odaklan.</span>
      <div className="hero-buttons"><Link className="marketing-cta large" href="/login">Ücretsiz Başla <b>→</b></Link><a className="quiet-link" href="#how">Nasıl Çalışır?</a></div>
      <div className="trust-row"><span>✓ 30 gün ücretsiz</span><span>✓ Kredi kartı gerekmez</span><span>✓ Verileriniz sizin kontrolünüzde</span></div>
      <div className="assistant-preview"><aside><img src="/pratikall-logo.png" alt="" /><i /><i /><i /><i /></aside><section><div className="preview-greeting"><small>BUGÜN SENİN İÇİN</small><strong>Önemli finansal gelişmeler tek bakışta.</strong></div><div className="preview-cards"><article><em>◷</em><small>YAKLAŞAN</small><strong>Bugün 2 ödemen var</strong><span>Toplam ₺4.280</span></article><article><em>↗</em><small>TAHSİLAT</small><strong>₺47.500 bekleniyor</strong><span>3 müşteri</span></article><article><em>!</em><small>KART ÖDEMESİ</small><strong>Son güne 4 gün kaldı</strong><span>Hatırlatma açık</span></article></div></section></div>
    </section>

    <section className="feature-strip"><span>Gelir / Gider</span><span>Borç / Alacak</span><span>Faturalar</span><span>Kredi Kartları</span><span>Tahsilat</span><span>Raporlar</span></section>

    <section className="how-section" id="how"><div className="section-heading"><p>PRATİKALL NASIL ÇALIŞIR?</p><h2>Üç adımda finansal düzen.</h2><span>Karmaşık kurulum yok; bilgilerinizi ekleyin, PratikAll sizin için takip etsin.</span></div><div className="steps-grid"><article><i>1</i><b>◎</b><h3>Hesabını oluştur</h3><p>Dakikalar içinde ücretsiz hesabını aç.</p></article><article><i>2</i><b>＋</b><h3>Finansal bilgilerini ekle</h3><p>Gelir, gider, borç, alacak, fatura ve kartlarını tek yerde takip et.</p></article><article><i>3</i><b>✓</b><h3>PratikAll takip etsin</h3><p>Yaklaşan ödemelerini, tahsilatlarını ve önemli finansal gelişmeleri sana hatırlatsın.</p></article></div></section>

    <section className="audience-section" id="audience"><div className="section-heading"><p>PRATİKALL KİMİN İÇİN?</p><h2>İhtiyacınıza göre sadeleşen yapı.</h2></div><div className="audience-grid"><article><span>BİREYSEL</span><h3>Günlük finans kontrolü</h3><ul>{["Faturalar", "Kredi kartları", "Abonelikler", "Gelir / gider", "Ödeme hatırlatmaları"].map(item => <li key={item}>✓ {item}</li>)}</ul><a href="#plans">Bireysel paketi gör →</a></article><article><span>ESNAF / SERBEST ÇALIŞAN</span><h3>Tahsilat ve iş takibi</h3><ul>{["Müşteri alacakları", "Tahsilatlar", "Ödemeler", "İşletme giderleri", "Finansal takip"].map(item => <li key={item}>✓ {item}</li>)}</ul><a href="#plans">Pro paketi gör →</a></article><article><span>İŞLETME</span><h3>Ekip ve finans yönetimi</h3><ul>{["Çoklu kullanıcı", "Personel yetkilendirme", "Finans yönetimi", "Tahsilat takibi", "Raporlama"].map(item => <li key={item}>✓ {item}</li>)}</ul><a href="#plans">İşletme paketini gör →</a></article></div></section>

    <section className="pricing-section" id="plans"><div className="section-heading"><p>ŞEFFAF FİYATLANDIRMA</p><h2>İhtiyacın kadar öde, büyüdükçe yükselt.</h2><span>Tüm paketlerde 30 gün ücretsiz deneme bulunur.</span></div><div className="billing-toggle" aria-label="Ödeme dönemi"><button className={!yearly ? "active" : ""} onClick={() => setYearly(false)}>Aylık</button><button className={yearly ? "active" : ""} onClick={() => setYearly(true)}>Yıllık <b>2 ay ücretsiz</b></button></div><div className="pricing-grid">{plans.map(plan => { const saving = plan.monthly * 12 - plan.yearly; return <article className={`pricing-plan ${plan.badge ? "featured" : ""}`} key={plan.name}>{plan.badge && <div className="plan-badge">{plan.badge}</div>}<h3>{plan.name}</h3><p>{plan.desc}</p><div className="plan-price"><strong>₺{yearly ? Math.round(plan.yearly / 10) : plan.monthly}</strong><span>/ ay</span></div>{yearly ? <small>10 ay öde: ₺{plan.yearly.toLocaleString("tr-TR")} / yıl · ₺{saving.toLocaleString("tr-TR")} tasarruf</small> : <small>Aylık faturalandırılır</small>}<ul>{plan.features.map(item => <li key={item}>✓ {item}</li>)}</ul><Link href="/login">Ücretsiz Başla <b>→</b></Link></article>; })}</div></section>

    <section className="comparison-section"><div className="section-heading"><p>PAKET KARŞILAŞTIRMA</p><h2>Size uygun paketi karşılaştırın.</h2></div><div className="comparison-wrap"><table><thead><tr><th>Özellik</th><th>Bireysel</th><th>Pro</th><th>İşletme</th></tr></thead><tbody>{comparison.map(row => <tr key={String(row[0])}><th>{row[0]}</th>{row.slice(1).map((cell, index) => <td key={index} className={cell ? "included" : "not-included"}>{cell ? "✓" : "—"}</td>)}</tr>)}</tbody></table></div></section>

    <section className="security-section" id="security"><div className="security-copy"><p>GÜVENLİK VE KONTROL</p><h2>Finansal verilerinizin kontrolü sizde.</h2><span>PratikAll sizin adınıza finansal işlem gerçekleştirmez. Kayıtlarınızı dilediğiniz zaman görüntüleyebilir ve desteklenen formatlarda dışa aktarabilirsiniz.</span></div><div className="security-points"><article><b>🔒 Güvenli erişim</b><span>Oturum ve yetki kontrolleri</span></article><article><b>◉ Veri sahipliği</b><span>Kendi kayıtlarınızı yönetme ve silme talebi</span></article><article><b>✓ Onay sizde</b><span>Finansal işlem başlatılmaz</span></article></div></section>

    <section className="faq-section" id="faq"><div className="section-heading"><p>SIK SORULAN SORULAR</p><h2>Başlamadan önce bilmeniz gerekenler.</h2></div><div className="faq-grid">{faqs.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <section className="final-cta"><p>BUGÜN BAŞLA</p><h2>Finansal düzeninizi PratikAll’a taşıyın.</h2><span>30 gün ücretsiz deneyin. Kredi kartı gerekmez.</span><Link href="/login">Ücretsiz Başla →</Link></section>
    <footer><Link href="/start" className="marketing-brand"><img src="/pratikall-logo.png" alt="PratikAll" /><span>Pratik<span>All</span></span></Link><p>© 2026 PratikAll · Akıllı finans ve iş yönetimi.</p><a href="mailto:iletisim@pratikall.com">İletişim</a><Link href="/login">Destek</Link><a href="#faq">Sık Sorulan Sorular</a><Link href="/privacy">Gizlilik</Link><Link href="/terms">Kullanım Koşulları</Link></footer>
  </main>;
}
