import LandingPage from "@/components/landing/LandingPage";
import { getLandingStats } from "@/lib/services/landing.service";
import type { Metadata } from "next";

// force-dynamic: never pre-render at build time (Railway DB unreachable during build).
// Stats are cached for 1h via unstable_cache in getLandingStats().
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Peakadex — Captura cimas. Colecciona rarezas. Conviértete en Legendario.",
  description:
    "La app de montaña que convierte cada ascensión en una carta coleccionable. Registra tus cimas, desbloquea rarezas según la altitud y compite con tu cordada. Gratis.",
  openGraph: {
    title: "Peakadex — Captura cimas. Colecciona rarezas.",
    description: "Convierte cada ascensión en una carta coleccionable.",
    type: "website",
  },
  alternates: {
    canonical: "https://www.peakadex.com",
    languages: {
      "x-default": "https://www.peakadex.com",
      "es": "https://www.peakadex.com",
      "en": "https://www.peakadex.com/en",
      "fr": "https://www.peakadex.com/fr",
      "de": "https://www.peakadex.com/de",
      "ca": "https://www.peakadex.com/ca",
    },
  },
};

export default async function RootPage() {
  const { stats, peakCounts } = await getLandingStats();
  return <LandingPage stats={stats} peakCounts={peakCounts} locale="es" />;
}
