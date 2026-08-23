import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PratikAll – Akıllı Kişisel Asistan",
    short_name: "PratikAll",
    description: "Finans, takvim, abonelik ve hatırlatmalarınızı tek yerde yönetin.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f8f8",
    theme_color: "#10263f",
    lang: "tr",
    categories: ["productivity", "finance", "utilities"],
    icons: [
      { src: "/pratikall-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pratikall-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pratikall-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
