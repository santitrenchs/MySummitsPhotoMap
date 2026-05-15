import fs from "fs";
import path from "path";
import LegalLayout from "@/components/legal/LegalLayout";
import { markdownToHtml } from "@/lib/markdownToHtml";

export const metadata = { title: "Política de Cookies – Peakadex" };

export default function CookiesPage() {
  const md = fs.readFileSync(path.join(process.cwd(), "content/legal/cookies.md"), "utf8");
  const html = markdownToHtml(md);
  return (
    <LegalLayout
      title="Política de Cookies"
      lastUpdated="Última actualización: Mayo 2026 · Versión 1.0"
      contentHtml={html}
    />
  );
}
