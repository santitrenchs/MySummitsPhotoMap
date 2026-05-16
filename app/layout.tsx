import type { Metadata, Viewport } from "next";
import { Inter, Baloo_2, Nunito, Manrope, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import CookieBanner from "@/components/CookieBanner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });
const baloo2 = Baloo_2({ subsets: ["latin"], weight: ["800"], variable: "--font-baloo2" });
const nunito = Nunito({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-nunito" });
const manrope = Manrope({ subsets: ["latin"], weight: ["800"], variable: "--font-manrope" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-space" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono-landing" });

export const metadata: Metadata = {
  title: "Peakadex — Captura cimas. Colecciona rarezas.",
  description: "La app de montaña que convierte cada ascensión en una carta coleccionable. Registra tus cimas, desbloquea rarezas según la altitud y compite con tu cordada.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${baloo2.variable} ${nunito.variable} ${manrope.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="stylesheet" href="/maplibre-gl.css" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
