import { I18nProvider } from "@/components/providers/I18nProvider";
import { getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/types";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale: Locale = await getLocale();
  return <I18nProvider initialLocale={locale}>{children}</I18nProvider>;
}
