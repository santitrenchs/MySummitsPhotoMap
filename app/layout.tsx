import type { Metadata, Viewport } from "next";
import { Inter, Baloo_2, Nunito } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });
const baloo2 = Baloo_2({ subsets: ["latin"], weight: ["800"], variable: "--font-baloo2" });
const nunito = Nunito({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-nunito" });

export const metadata: Metadata = {
  title: "AziAtlas — Your Mountain Summit Map",
  description: "Track your mountain ascents with photos and people",
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
    <html lang="en" className={`${inter.variable} ${baloo2.variable} ${nunito.variable}`}>
      <head>
        <link rel="stylesheet" href="/maplibre-gl.css" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
