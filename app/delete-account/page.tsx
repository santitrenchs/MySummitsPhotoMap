import LegalLayout from "@/components/legal/LegalLayout";
import { getAuthLocale } from "@/lib/i18n/server";
import { getT, i } from "@/lib/i18n";

export const metadata = {
  title: "Delete your account – Peakadex",
  // Tiene que ser indexable: el punto de la página es que la encuentre alguien
  // que ya desinstaló la app y no recuerda la URL.
  robots: { index: true, follow: true },
};

/**
 * Página pública de eliminación de cuenta.
 *
 * Google Play la exige desde 2023 para cualquier app que permita registrarse, y
 * cubre el caso que el borrado dentro de la app no puede cubrir: alguien que ya
 * la desinstaló. Si la única vía estuviera dentro de la aplicación, esa persona
 * tendría que reinstalarla para poder marcharse.
 *
 * De ahí que sea pública. ⚠️ No se añade a `isAuthPage` en `proxy.ts` aunque sea
 * la lista de rutas sin sesión: esa lista **también** redirige a `/map` a quien
 * ya ha iniciado sesión, y aquí queremos que la lean los dos.
 *
 * El contenido va en claves de i18n y no en un markdown como privacy/terms
 * porque esos son contratos versionados en castellano, y esto son instrucciones:
 * las lee un usuario cualquiera y, muy probablemente, un revisor de Google.
 */
export default async function DeleteAccountPage() {
  const locale = await getAuthLocale();
  const t = getT(locale);

  const SUPPORT_EMAIL = "contact@peakadex.com";

  const html = `
    <p>${t.delacc_intro}</p>

    <h2>${t.delacc_inAppTitle}</h2>
    <p>${t.delacc_inAppBody}</p>

    <h2>${t.delacc_noAppTitle}</h2>
    <p>${i(t.delacc_noAppBody, { email: SUPPORT_EMAIL })}</p>

    <h2>${t.delacc_deletedTitle}</h2>
    <ul>
      <li>${t.delacc_deleted1}</li>
      <li>${t.delacc_deleted2}</li>
      <li>${t.delacc_deleted3}</li>
      <li>${t.delacc_deleted4}</li>
      <li>${t.delacc_deleted5}</li>
    </ul>

    <h2>${t.delacc_keptTitle}</h2>
    <p>${t.delacc_keptBody}</p>

    <h2>${t.delacc_timingTitle}</h2>
    <p>${t.delacc_timingBody}</p>
  `;

  return (
    <LegalLayout
      title={t.delacc_title}
      lastUpdated={i(t.legal_lastUpdated, { date: "Septiembre 2026", version: "1.0" })}
      contentHtml={html}
      backLabel={t.legal_back}
      termsLink={t.legal_termsLink}
      privacyLink={t.legal_privacyLink}
      cookiesLink={t.legal_cookiesLink}
    />
  );
}
