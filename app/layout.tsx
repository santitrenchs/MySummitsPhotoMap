import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { Providers } from "@/components/providers";
import CookieBanner from "@/components/CookieBanner";
import Script from "next/script";
import "./globals.css";

// Fuentes autoalojadas, no `next/font/google`. Ese helper las descarga DURANTE el
// build, así que las seis familias del proyecto eran seis peticiones de red que
// tenían que salir bien para que un despliegue funcionara. El 25/09/2026 falló la
// de Nunito y tumbó el despliegue de producción con un `module-not-found` sobre un
// CSS generado, que no se parece en nada a la causa real.
//
// Se guarda la versión VARIABLE de cada familia: un fichero cubre todos los pesos
// y pesa menos que los estáticos sueltos que sustituye. Las seis suman 212 KB.
const inter = localFont({
  src: "./fonts/Inter-Variable.woff2",
  weight: "400 700",
  variable: "--font-inter",
  display: "swap",
});
const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk-Variable.woff2",
  weight: "300 700",
  variable: "--font-space",
  display: "swap",
});

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
    // suppressHydrationWarning: the admin layout runs a blocking anti-flash script that
    // sets `data-theme` on <html> before React hydrates, so the DOM legitimately carries an
    // attribute this server render never emits. React only suppresses one level deep — the
    // element's own attributes — so real mismatches inside the tree are still reported.
    <html
      lang={lang}
      className={`${inter.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
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
