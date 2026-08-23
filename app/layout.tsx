import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaRegister from "./pwa-register";
import AnalyticsTracker from "./analytics-tracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PratikAll | Hayatını kolaylaştıran akıllı asistan",
  description: "Finansınızı, ödemelerinizi, aboneliklerinizi, takviminizi ve hatırlatmalarınızı tek yerde yöneten kişisel asistan.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/pratikall-logo.png",
    shortcut: "/pratikall-logo.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "PratikAll", statusBarStyle: "default" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PwaRegister />
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
