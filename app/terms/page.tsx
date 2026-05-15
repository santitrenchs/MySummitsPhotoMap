import fs from "fs";
import path from "path";
import LegalLayout from "@/components/legal/LegalLayout";
import { markdownToHtml } from "@/lib/markdownToHtml";

export const metadata = { title: "Términos y Condiciones – Peakadex" };

export default function TermsPage() {
  const md = fs.readFileSync(path.join(process.cwd(), "content/legal/terms.md"), "utf8");
  const html = markdownToHtml(md);
  return (
    <LegalLayout
      title="Términos y Condiciones"
      lastUpdated="Última actualización: Mayo 2026 · Versión 2.0"
      contentHtml={html}
    />
  );
}
