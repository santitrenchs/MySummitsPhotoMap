import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import { Providers } from "@/components/providers";
import CookieBanner from "@/components/CookieBanner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-space" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.peakadex.com"),
  title: "Peakadex — Captura cimas. Colecciona rarezas.",
  description: "La app de montaña que convierte cada ascensión en una carta coleccionable. Registra tus cimas, desbloquea rarezas según la altitud y compite con tu cordada.",
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
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
