import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import { Providers } from "@/components/providers";
import CookieBanner from "@/components/CookieBanner";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-space" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.peakadex.com"),
  title: "App para registrar cimas de montaña | Peakadex — Gratis",
  description: "Registra cada cima que subes, consigue cartas coleccionables según la altitud y compite con tu cordada. App de montañismo gratuita para senderistas y alpinistas.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "/";
  const lang =
    pathname.startsWith("/en") ? "en" :
    pathname.startsWith("/fr") ? "fr" :
    pathname.startsWith("/de") ? "de" :
    pathname.startsWith("/ca") ? "ca" : "es";

  return (
    <html lang={lang} className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-X4DRCNLPJ0" strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-X4DRCNLPJ0');
        `}</Script>
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
