"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/support/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportType: "error",
        subject: "Uygulama ekranı beklenmedik şekilde durdu",
        details: "PratikAll bu hatayı otomatik olarak raporladı.",
        page: window.location.pathname,
        technicalMessage: [error.message, error.digest].filter(Boolean).join(" · "),
        isAutomatic: true,
      }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <main className="fatal-error-page">
      <section>
        <span className="brand-logo-frame" role="img" aria-label="PratikAll" />
        <p>PRATİKALL DESTEK</p>
        <h1>Bir şey planlandığı gibi çalışmadı.</h1>
        <span>Teknik rapor otomatik oluşturuldu. Tekrar deneyebilir veya devam ederse Destek bölümünden ayrıntı ekleyebilirsiniz.</span>
        <button onClick={reset}>Tekrar Dene</button>
      </section>
    </main>
  );
}
