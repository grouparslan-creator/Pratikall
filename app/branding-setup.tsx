"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  MODULE_OPTIONS,
  THEME_OPTIONS,
  type ModuleKey,
  type UserProfile,
} from "./profile-types";

type Props = {
  mode: "setup" | "settings";
  profile: UserProfile | null;
  suggestedOwnerName?: string;
  onSaved: (profile: UserProfile) => void;
  onClose?: () => void;
};

const defaultModules = MODULE_OPTIONS.map((module) => module.key);

export default function BrandingSetup({
  mode,
  profile,
  suggestedOwnerName = "",
  onSaved,
  onClose,
}: Props) {
  const initialOwner = profile?.ownerName || suggestedOwnerName || "";
  const [ownerName, setOwnerName] = useState(initialOwner);
  const [appName, setAppName] = useState(profile?.appName || (initialOwner ? `${initialOwner} Takip` : ""));
  const [companyName, setCompanyName] = useState(profile?.companyName || "");
  const [theme, setTheme] = useState(profile?.theme || "red");
  const [enabledModules, setEnabledModules] = useState<ModuleKey[]>(
    profile?.enabledModules?.length ? profile.enabledModules : defaultModules
  );
  const [defaultReminderDays, setDefaultReminderDays] = useState(
    profile?.defaultReminderDays ?? 3
  );
  const [emailSenderName, setEmailSenderName] = useState(
    profile?.emailSenderName || profile?.appName || ""
  );
  const [emailReplyTo, setEmailReplyTo] = useState(profile?.emailReplyTo || "");
  const [emailSignature, setEmailSignature] = useState(
    profile?.emailSignature || (profile?.appName ? `${profile.appName} ekibi` : "")
  );
  const [logoMode, setLogoMode] = useState<"default" | "initials" | "custom">(
    profile?.logoUrl ? "custom" : profile?.useDefaultLogo === false ? "initials" : "default"
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const localLogoPreview = useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : ""),
    [logoFile]
  );

  useEffect(() => {
    return () => {
      if (localLogoPreview) URL.revokeObjectURL(localLogoPreview);
    };
  }, [localLogoPreview]);

  function changeOwnerName(value: string) {
    const previousAutomaticName = ownerName ? `${ownerName} Takip` : "";
    setOwnerName(value);
    if (!appName || appName === previousAutomaticName) setAppName(value ? `${value} Takip` : "");
    if (!emailSenderName || emailSenderName === previousAutomaticName) {
      setEmailSenderName(value ? `${value} Takip` : "");
    }
    if (!emailSignature || emailSignature === `${previousAutomaticName} ekibi`) {
      setEmailSignature(value ? `${value} Takip ekibi` : "");
    }
  }

  function toggleModule(module: ModuleKey) {
    if (module === "overview" || module === "accounts") return;
    setEnabledModules((current) =>
      current.includes(module)
        ? current.filter((item) => item !== module)
        : [...current, module]
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName,
          appName,
          companyName,
          theme,
          enabledModules,
          defaultReminderDays,
          useDefaultLogo: logoMode === "default",
          emailSenderName,
          emailReplyTo,
          emailSignature,
        }),
      });
      const data = (await response.json()) as { profile?: UserProfile; error?: string };
      if (!response.ok || !data.profile) {
        throw new Error(data.error || "Ayarlar kaydedilemedi.");
      }

      let savedProfile = data.profile;
      if (logoMode === "custom" && logoFile) {
        const logoForm = new FormData();
        logoForm.set("logo", logoFile);
        const logoResponse = await fetch("/api/profile/logo", {
          method: "POST",
          body: logoForm,
        });
        const logoData = (await logoResponse.json()) as {
          logoUrl?: string;
          useDefaultLogo?: boolean;
          error?: string;
        };
        if (!logoResponse.ok || !logoData.logoUrl) {
          throw new Error(logoData.error || "Logo yüklenemedi.");
        }
        savedProfile = {
          ...savedProfile,
          logoUrl: logoData.logoUrl,
          useDefaultLogo: false,
        };
      }

      onSaved(savedProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ayarlar kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  const initials = (ownerName || appName || "T")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
  const previewLogo = localLogoPreview || profile?.logoUrl || "";

  return (
    <section className={`branding-card ${mode === "setup" ? "branding-first-run" : ""}`}>
      <div className="branding-head">
        <div>
          <span className="modal-kicker">{mode === "setup" ? "İLK KURULUM" : "KİŞİSELLEŞTİRME"}</span>
          <h2>{mode === "setup" ? "PratikAll’ı size göre hazırlayalım" : "Program görünümünü ve bildirimleri düzenleyin"}</h2>
          <p>{mode === "setup" ? "Hayatınızı kolaylaştıran akıllı asistan birkaç adımda hazır." : "Bu ayarların tamamını istediğiniz zaman yeniden değiştirebilirsiniz."}</p>
        </div>
        {mode === "settings" && onClose && (
          <button type="button" className="close-button" onClick={onClose} aria-label="Ayarları kapat">×</button>
        )}
      </div>

      <form onSubmit={save} className="branding-form">
        <div className="branding-preview">
          <div className={`branding-preview-logo mode-${logoMode}`}>
            {logoMode === "default" ? (
              <span className="brand-logo-frame" role="img" aria-label="PratikAll" />
            ) : logoMode === "custom" && previewLogo ? (
              <img src={previewLogo} alt="Yüklenen logo önizlemesi" />
            ) : (
              <b>{initials}</b>
            )}
          </div>
          <div>
            <strong>{appName || "Program Adı"}</strong>
            <span>{companyName || "Hayatını kolaylaştıran akıllı asistan"}</span>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title"><b>1</b><div><strong>İsim ve işletme</strong><span>Ömer yazıldığında program adı otomatik Ömer Takip olur.</span></div></div>
          <div className="field-grid">
            <label><span>Kullanıcı / marka adı *</span><input value={ownerName} onChange={(event) => changeOwnerName(event.target.value)} required placeholder="Ömer" /></label>
            <label><span>Program adı *</span><input value={appName} onChange={(event) => setAppName(event.target.value)} required placeholder="Ömer Takip" /></label>
            <label className="field-wide"><span>Firma adı</span><input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="İsteğe bağlı işletme adı" /></label>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title"><b>2</b><div><strong>Logo ve renk</strong><span>Kendi logonuzu yükleyebilir veya sade isim işareti kullanabilirsiniz.</span></div></div>
          <div className="logo-choice-grid">
            <label className={logoMode === "default" ? "selected" : ""}><input type="radio" name="logoMode" checked={logoMode === "default"} onChange={() => setLogoMode("default")} /><span className="choice-logo default-logo-mini" /><b>PratikAll</b><small>Yeni ana marka logosu</small></label>
            <label className={logoMode === "initials" ? "selected" : ""}><input type="radio" name="logoMode" checked={logoMode === "initials"} onChange={() => setLogoMode("initials")} /><span className="choice-logo initials-logo">{initials}</span><b>İsim işareti</b><small>Baş harflerden otomatik</small></label>
            <label className={logoMode === "custom" ? "selected" : ""}><input type="radio" name="logoMode" checked={logoMode === "custom"} onChange={() => setLogoMode("custom")} /><span className="choice-logo upload-logo">＋</span><b>Kendi logom</b><small>PNG, JPG veya WebP</small></label>
          </div>
          {logoMode === "custom" && (
            <label className="file-picker"><span>Logo dosyası</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} required={!profile?.logoUrl} /><small>En fazla 2 MB. Şeffaf PNG önerilir.</small></label>
          )}
          <div className="theme-picker" aria-label="Program rengi">
            {THEME_OPTIONS.map((option) => (
              <button key={option.key} type="button" className={theme === option.key ? "selected" : ""} onClick={() => setTheme(option.key)}><i style={{ background: option.color }} /><span>{option.label}</span><b>✓</b></button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title"><b>3</b><div><strong>Kullanılacak bölümler</strong><span>Gereksiz bölümleri gizleyin; istediğiniz zaman tekrar açın.</span></div></div>
          <div className="module-choice-grid">
            {MODULE_OPTIONS.map((module) => {
              const required = module.key === "overview" || module.key === "accounts";
              const selected = enabledModules.includes(module.key);
              return <label key={module.key} className={selected ? "selected" : ""}><input type="checkbox" checked={selected} disabled={required} onChange={() => toggleModule(module.key)} /><i>{selected ? "✓" : ""}</i><span><b>{module.label}</b><small>{module.detail}</small></span></label>;
            })}
          </div>
          <label className="reminder-field"><span>Varsayılan hatırlatma</span><select value={defaultReminderDays} onChange={(event) => setDefaultReminderDays(Number(event.target.value))}><option value={0}>Vade günü</option><option value={1}>1 gün önce</option><option value={3}>3 gün önce</option><option value={7}>7 gün önce</option><option value={14}>14 gün önce</option></select></label>
        </div>

        <div className="settings-section">
          <div className="settings-section-title"><b>4</b><div><strong>E-posta görünümü</strong><span>Logo, gönderen adı ve imza her e-postaya otomatik uygulanır.</span></div></div>
          <div className="field-grid">
            <label><span>Görünen gönderen adı</span><input value={emailSenderName} onChange={(event) => setEmailSenderName(event.target.value)} placeholder={appName || "Ömer Takip"} /></label>
            <label><span>Yanıt e-posta adresi</span><input type="email" value={emailReplyTo} onChange={(event) => setEmailReplyTo(event.target.value)} placeholder="destek@firmaniz.com" /></label>
            <label className="field-wide"><span>E-posta imzası</span><textarea rows={3} value={emailSignature} onChange={(event) => setEmailSignature(event.target.value)} placeholder={`${appName || "Programınız"} ekibi`} /></label>
          </div>
          <p className="settings-help">Gerçek gönderici adresi, e-posta servisinde doğrulanmış güvenli adres üzerinden çalışır. Buradaki ad, yanıt adresi, logo ve imza kişiselleştirilir.</p>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="branding-actions">
          {mode === "settings" && onClose && <button type="button" className="secondary-button" onClick={onClose}>Vazgeç</button>}
          <button className="primary-button" disabled={saving}>{saving ? "Kaydediliyor…" : mode === "setup" ? "Kurulumu Tamamla" : "Değişiklikleri Kaydet"}</button>
        </div>
      </form>
    </section>
  );
}
