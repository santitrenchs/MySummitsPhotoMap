// Server Component — no "use client" directive
// Landing-specific fonts are loaded here so they don't bloat the root layout
// (Inter + Space_Grotesk remain in app/layout.tsx for authenticated pages)
import localFont from "next/font/local";
import "./landing.css";
import LandingNav from "./LandingNav";
import LandingHero from "./LandingHero";
import LandingStats from "./LandingStats";
import LandingRarities from "./LandingRarities";
import LandingMythic from "./LandingMythic";
import LandingProgression from "./LandingProgression";
import LandingCards from "./LandingCards";
import LandingFAQ from "./LandingFAQ";
import LandingCTA from "./LandingCTA";
import LandingFooter from "./LandingFooter";
import { LandingTProvider } from "./LandingLocaleContext";
import { getLandingT } from "@/lib/i18n/landing";
import type { LandingLocale } from "@/lib/i18n/landing";

// Autoalojadas — ver el comentario de `app/layout.tsx`. Los ficheros viven todos
// en `app/fonts/` aunque este componente esté en `components/`: una sola carpeta
// evita que la misma familia acabe duplicada en dos sitios.
// Aquí había también Baloo 2 y Nunito. Se quitaron el 25/09/2026 al comprobar que
// `--font-baloo2` y `--font-nunito` no tenían ni una sola referencia en el
// repositorio: se descargaban en cada build y no pintaban un píxel. Nunito era
// justamente la que tumbó el despliegue de producción esa mañana.
const manrope = localFont({
  src: "../../app/fonts/Manrope-Variable.woff2",
  weight: "200 800",
  variable: "--font-manrope",
  display: "swap",
});
const jetbrainsMono = localFont({
  src: "../../app/fonts/JetBrainsMono-Variable.woff2",
  weight: "100 800",
  variable: "--font-mono-landing",
  display: "swap",
});

type Stats = {
  totalRarities: number;
  totalPeaks: number;
  capturedPeaks: number;
  totalAscents: number;
};

const LOCALE_URL: Record<LandingLocale, string> = {
  es: "https://www.peakadex.com",
  en: "https://www.peakadex.com/en",
  fr: "https://www.peakadex.com/fr",
  de: "https://www.peakadex.com/de",
  ca: "https://www.peakadex.com/ca",
};

export default function LandingPage({
  stats,
  peakCounts,
  locale = "es",
}: {
  stats: Stats;
  peakCounts: Record<string, number>;
  locale?: LandingLocale;
}) {
  const t = getLandingT(locale);
  // Font variables are scoped to the landing root div — no effect outside landing pages
  const fontClasses = `${manrope.variable} ${jetbrainsMono.variable}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Peakadex",
        url: "https://www.peakadex.com",
        email: "contact@peakadex.com",
        sameAs: [],
      },
      {
        "@type": "WebSite",
        name: "Peakadex",
        url: "https://www.peakadex.com",
        inLanguage: locale,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: "https://www.peakadex.com/map?q={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "Peakadex",
        applicationCategory: "SportsApplication",
        operatingSystem: "Web",
        url: LOCALE_URL[locale],
        inLanguage: locale,
        description: t.meta_desc,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      },
      {
        "@type": "FAQPage",
        mainEntity: t.faq_items.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return (
    <LandingTProvider value={t}>
      <div className={`ld-root ${fontClasses}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <LandingNav />
        <main>
          <LandingHero />
          <LandingStats stats={stats} />
          <LandingRarities peakCounts={peakCounts} />
          <LandingCards />
          <LandingMythic />
          <LandingProgression />
          <LandingFAQ />
          <LandingCTA />
        </main>
        <LandingFooter />
      </div>
    </LandingTProvider>
  );
}
