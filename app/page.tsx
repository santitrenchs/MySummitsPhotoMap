import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LandingPage from "@/components/landing/LandingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peakadex — Captura cimas. Colecciona rarezas. Conviértete en Legendario.",
  description:
    "La app de montaña que convierte cada ascensión en una carta coleccionable. Registra tus cimas, desbloquea rarezas según la altitud y compite con tu cordada. Gratis.",
  openGraph: {
    title: "Peakadex — Captura cimas. Colecciona rarezas.",
    description: "Convierte cada ascensión en una carta coleccionable.",
    type: "website",
  },
};

export default async function RootPage() {
  const session = await auth();
  if (session) redirect("/home");
  return <LandingPage />;
}
