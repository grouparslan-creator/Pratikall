"use client";

import { useEffect } from "react";

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function AnalyticsTracker() {
  useEffect(() => {
    if (!window.location.pathname.startsWith("/start")) return;
    const track = async () => {
      try {
        let browserId = window.localStorage.getItem("pa_visitor_id");
        if (!browserId) {
          browserId = crypto.randomUUID();
          window.localStorage.setItem("pa_visitor_id", browserId);
        }
        const date = new Date().toISOString().slice(0, 10);
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${date}:${browserId}`));
        await fetch("/api/analytics/visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorHash: toHex(digest) }),
          keepalive: true,
        });
      } catch {
        // Ziyaret ölçümü sayfanın kullanımını hiçbir zaman engellemez.
      }
    };
    void track();
  }, []);
  return null;
}
