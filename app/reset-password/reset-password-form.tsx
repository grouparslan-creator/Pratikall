"use client";

import { useEffect, useState } from "react";

type RecoveryState = "checking" | "ready" | "invalid";

export default function ResetPasswordForm() {
  const [state, setState] = useState<RecoveryState>("checking");
  const [accessToken, setAccessToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get("access_token") ?? "";
    const type = fragment.get("type");
    const error = fragment.get("error");
    window.history.replaceState(null, "", window.location.pathname);
    queueMicrotask(() => {
      if (!error && token && type === "recovery") {
        setAccessToken(token);
        setState("ready");
      } else {
        setState("invalid");
      }
    });
  }, []);

  if (state === "checking") return <p className="login-security" role="status">Bağlantı doğrulanıyor…</p>;
  if (state === "invalid") return <p className="login-security" role="alert">Bu yenileme bağlantısı geçersiz veya süresi dolmuş. Giriş ekranından yeni bir bağlantı isteyin.</p>;

  return <form action="/api/auth/reset-password" method="post" className="auth-single-form" onSubmit={(event) => {
    if (password !== passwordConfirm) {
      event.preventDefault();
      setValidationError("Şifreler aynı olmalı.");
    }
  }}>
    <input type="hidden" name="access_token" value={accessToken} />
    <label htmlFor="new-password">Yeni şifre</label>
    <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="En az 8 karakter" value={password} onChange={(event) => { setPassword(event.target.value); setValidationError(""); }} />
    <label htmlFor="new-password-confirm">Yeni şifre tekrar</label>
    <input id="new-password-confirm" name="password_confirm" type="password" autoComplete="new-password" minLength={8} required placeholder="Şifrenizi yeniden yazın" value={passwordConfirm} onChange={(event) => { setPasswordConfirm(event.target.value); setValidationError(""); }} />
    {validationError ? <p className="auth-error" role="alert">{validationError}</p> : null}
    <button type="submit" className="auth-submit-input">Şifremi güncelle</button>
  </form>;
}
