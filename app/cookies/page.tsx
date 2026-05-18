import fs from "fs";
import path from "path";
import LegalLayout from "@/components/legal/LegalLayout";
import { markdownToHtml } from "@/lib/markdownToHtml";
import { getAuthLocale } from "@/lib/i18n/server";
import { getT, i } from "@/lib/i18n";

export const metadata = { title: "Cookie Policy – Peakadex" };

export default async function CookiesPage() {
  const locale = await getAuthLocale();
  const t = getT(locale);
  const md = fs.readFileSync(path.join(process.cwd(), "content/legal/cookies.md"), "utf8");
  const html = markdownToHtml(md);
  return (
    <LegalLayout
      title={t.legal_cookiesTitle}
      lastUpdated={i(t.legal_lastUpdated, { date: "Mayo 2026", version: "1.0" })}
      contentHtml={html}
      backLabel={t.legal_back}
      termsLink={t.legal_termsLink}
      privacyLink={t.legal_privacyLink}
      cookiesLink={t.legal_cookiesLink}
    />
  );
}
