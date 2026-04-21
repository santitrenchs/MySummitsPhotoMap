import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "AziAtlas <noreply@mail.aziatlas.com>";
const APP_URL = (
  process.env.NEXTAUTH_URL ??
  process.env.AUTH_URL ??
  "https://www.aziatlas.com"
).replace(/\/$/, "");

const FONT_STACK = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

function renderEmailHead() {
  return `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>`;
}

function renderBrandHeader() {
  return `
        <tr>
          <td style="padding:24px 32px 20px;background:#ffffff;border-bottom:1px solid #f1f5f9;text-align:center;">
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
              <tr>
                <td style="vertical-align:middle;padding-right:10px;">
                  <img src="${APP_URL}/logo-email.png" width="42" height="42" alt="" style="display:block;border:0;">
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:34px;line-height:1;font-weight:800;letter-spacing:-0.03em;color:#0369a1;font-family:${FONT_STACK};">AziAtlas</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
}

const PASSWORD_RESET_COPY: Record<string, { subject: string; h1: string; body: string; cta: string; expiry: string; fallback: string }> = {
  es: {
    subject: "Restablece tu contraseña — AziAtlas",
    h1: "Restablece tu contraseña",
    body: "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón para continuar.",
    cta: "Restablecer contraseña",
    expiry: "Este enlace caduca en <strong>1 hora</strong>. Si no solicitaste restablecer tu contraseña, puedes ignorar este email.",
    fallback: "Si el botón no funciona, copia y pega este enlace en tu navegador:",
  },
  ca: {
    subject: "Restableix la teva contrasenya — AziAtlas",
    h1: "Restableix la teva contrasenya",
    body: "Hem rebut una sol·licitud per restablir la contrasenya del teu compte. Fes clic al botó per continuar.",
    cta: "Restablir contrasenya",
    expiry: "Aquest enllaç caduca en <strong>1 hora</strong>. Si no has sol·licitat restablir la contrasenya, pots ignorar aquest email.",
    fallback: "Si el botó no funciona, copia i enganxa aquest enllaç al teu navegador:",
  },
  en: {
    subject: "Reset your password — AziAtlas",
    h1: "Reset your password",
    body: "We received a request to reset your account password. Click the button below to continue.",
    cta: "Reset password",
    expiry: "This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can ignore this email.",
    fallback: "If the button doesn't work, copy and paste this link into your browser:",
  },
  fr: {
    subject: "Réinitialise ton mot de passe — AziAtlas",
    h1: "Réinitialise ton mot de passe",
    body: "Nous avons reçu une demande de réinitialisation du mot de passe de ton compte. Clique sur le bouton pour continuer.",
    cta: "Réinitialiser le mot de passe",
    expiry: "Ce lien expire dans <strong>1 heure</strong>. Si tu n'as pas demandé de réinitialisation, tu peux ignorer cet email.",
    fallback: "Si le bouton ne fonctionne pas, copie et colle ce lien dans ton navigateur :",
  },
  de: {
    subject: "Passwort zurücksetzen — AziAtlas",
    h1: "Passwort zurücksetzen",
    body: "Wir haben eine Anfrage zum Zurücksetzen deines Passworts erhalten. Klicke auf den Button, um fortzufahren.",
    cta: "Passwort zurücksetzen",
    expiry: "Dieser Link läuft in <strong>1 Stunde</strong> ab. Wenn du kein Zurücksetzen angefordert hast, kannst du diese E-Mail ignorieren.",
    fallback: "Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:",
  },
};

export async function sendPasswordResetEmail(to: string, token: string, locale = "es") {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  const copy = PASSWORD_RESET_COPY[locale] ?? PASSWORD_RESET_COPY.es;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: copy.subject,
    html: `
<!DOCTYPE html>
<html lang="${locale}">
${renderEmailHead()}
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
${renderBrandHeader()}
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">${copy.h1}</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">${copy.body}</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${resetUrl}"
                     style="display:inline-block;background:#0369a1;color:#ffffff;font-size:15px;font-weight:700;
                            text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.01em;">
                    ${copy.cta}
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">${copy.expiry}</p>
            <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;">
            <p style="margin:0;font-size:12px;color:#cbd5e1;word-break:break-all;">
              ${copy.fallback}<br>
              <a href="${resetUrl}" style="color:#0369a1;">${resetUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} AziAtlas · <a href="${APP_URL}" style="color:#94a3b8;">www.aziatlas.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error("[email] Resend error:", error);
    throw new Error(`Resend failed: ${JSON.stringify(error)}`);
  }

  console.log("[email] sent OK, id:", data?.id);
}

const WELCOME_COPY: Record<string, { subject: (n: string) => string; h1: (n: string) => string; body1: string; body2: string; cta: string }> = {
  es: {
    subject: (n) => `¡Bienvenido/a a AziAtlas, ${n}!`,
    h1: (n) => `¡Bienvenido/a, ${n}!`,
    body1: "Ya eres parte de AziAtlas. Empieza registrando tu primera cima y construye tu historial de ascensiones.",
    body2: "Explora el mapa, conecta con tus amigos y sube peldaños en la clasificación de tu cordada.",
    cta: "Ir a AziAtlas →",
  },
  ca: {
    subject: (n) => `Benvingut/da a AziAtlas, ${n}!`,
    h1: (n) => `Benvingut/da, ${n}!`,
    body1: "Ja ets part d'AziAtlas. Comença registrant el teu primer cim i construeix el teu historial d'ascensions.",
    body2: "Explora el mapa, connecta amb els teus amics i puja graons a la classificació de la teva cordada.",
    cta: "Anar a AziAtlas →",
  },
  en: {
    subject: (n) => `Welcome to AziAtlas, ${n}!`,
    h1: (n) => `Welcome, ${n}!`,
    body1: "You're now part of AziAtlas. Start by logging your first summit and build your ascent history.",
    body2: "Explore the map, connect with friends, and climb the rankings in your rope team.",
    cta: "Go to AziAtlas →",
  },
  fr: {
    subject: (n) => `Bienvenue sur AziAtlas, ${n} !`,
    h1: (n) => `Bienvenue, ${n} !`,
    body1: "Tu fais maintenant partie d'AziAtlas. Commence par enregistrer ton premier sommet et construis ton historique d'ascensions.",
    body2: "Explore la carte, connecte-toi avec tes amis et grimpe dans le classement de ta cordée.",
    cta: "Aller sur AziAtlas →",
  },
  de: {
    subject: (n) => `Willkommen bei AziAtlas, ${n}!`,
    h1: (n) => `Willkommen, ${n}!`,
    body1: "Du bist jetzt Teil von AziAtlas. Beginne damit, deinen ersten Gipfel einzutragen und deine Aufstiegshistorie aufzubauen.",
    body2: "Erkunde die Karte, verbinde dich mit Freunden und erklimme die Rangliste deiner Seilschaft.",
    cta: "Zu AziAtlas →",
  },
};

export async function sendWelcomeEmail(to: string, name: string, locale = "es") {
  const appUrl = `${APP_URL}/home`;
  const firstName = name.split(" ")[0];
  const copy = WELCOME_COPY[locale] ?? WELCOME_COPY.es;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: copy.subject(firstName),
    html: `
<!DOCTYPE html>
<html lang="${locale}">
${renderEmailHead()}
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
${renderBrandHeader()}
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">${copy.h1(firstName)}</h1>
            <p style="margin:0 0 16px;font-size:15px;color:#64748b;line-height:1.6;">${copy.body1}</p>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">${copy.body2}</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${appUrl}"
                     style="display:inline-block;background:#0369a1;color:#ffffff;font-size:15px;font-weight:700;
                            text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.01em;">
                    ${copy.cta}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} AziAtlas · <a href="${APP_URL}" style="color:#94a3b8;">www.aziatlas.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error("[email] welcome email Resend error:", error);
    throw new Error(`Resend failed: ${JSON.stringify(error)}`);
  }

  console.log("[email] welcome sent OK, id:", data?.id);
}

const INVITATION_COPY: Record<string, { subject: (n: string) => string; h1: (n: string) => string; body: (n: string) => string; codeLabel: string; cta: string; footer: (n: string) => string }> = {
  es: {
    subject: (n) => `${n} te invita a AziAtlas`,
    h1: (n) => `${n} te ha invitado`,
    body: (n) => `Tu amigo/a <strong>${n}</strong> te invita a unirte a AziAtlas, la app para registrar tus ascensiones, explorar cimas y comparar tu progreso con tu cordada.`,
    codeLabel: "Tu código de acceso",
    cta: "Crear mi cuenta →",
    footer: (n) => `Una vez registrado/a, busca a <strong>${n}</strong> en la sección <strong>Amigos</strong> y envíale una solicitud. El código caduca en <strong>7 días</strong> y es de un solo uso.`,
  },
  ca: {
    subject: (n) => `${n} et convida a AziAtlas`,
    h1: (n) => `${n} t'ha convidat`,
    body: (n) => `El teu amic/ga <strong>${n}</strong> et convida a unir-te a AziAtlas, l'app per registrar les teves ascensions, explorar cims i comparar el teu progrés amb la teva cordada.`,
    codeLabel: "El teu codi d'accés",
    cta: "Crear el meu compte →",
    footer: (n) => `Un cop registrat/da, cerca a <strong>${n}</strong> a la secció <strong>Amics</strong> i envia-li una sol·licitud. El codi caduca en <strong>7 dies</strong> i és d'un sol ús.`,
  },
  en: {
    subject: (n) => `${n} invited you to AziAtlas`,
    h1: (n) => `${n} has invited you`,
    body: (n) => `Your friend <strong>${n}</strong> invites you to join AziAtlas, the app to log your ascents, explore summits, and compare your progress with your rope team.`,
    codeLabel: "Your access code",
    cta: "Create my account →",
    footer: (n) => `Once registered, search for <strong>${n}</strong> in the <strong>Friends</strong> section and send them a request. The code expires in <strong>7 days</strong> and can only be used once.`,
  },
  fr: {
    subject: (n) => `${n} t'invite sur AziAtlas`,
    h1: (n) => `${n} t'a invité(e)`,
    body: (n) => `Ton ami(e) <strong>${n}</strong> t'invite à rejoindre AziAtlas, l'app pour enregistrer tes ascensions, explorer les sommets et comparer ta progression avec ta cordée.`,
    codeLabel: "Ton code d'accès",
    cta: "Créer mon compte →",
    footer: (n) => `Une fois inscrit(e), recherche <strong>${n}</strong> dans la section <strong>Amis</strong> et envoie-lui une demande. Le code expire dans <strong>7 jours</strong> et n'est utilisable qu'une seule fois.`,
  },
  de: {
    subject: (n) => `${n} lädt dich zu AziAtlas ein`,
    h1: (n) => `${n} hat dich eingeladen`,
    body: (n) => `Dein Freund/deine Freundin <strong>${n}</strong> lädt dich ein, AziAtlas beizutreten — die App zum Erfassen deiner Aufstiege, Erkunden von Gipfeln und Vergleichen deines Fortschritts mit deiner Seilschaft.`,
    codeLabel: "Dein Zugangscode",
    cta: "Konto erstellen →",
    footer: (n) => `Nach der Registrierung suche <strong>${n}</strong> im Bereich <strong>Freunde</strong> und sende eine Anfrage. Der Code läuft in <strong>7 Tagen</strong> ab und kann nur einmal verwendet werden.`,
  },
};

export async function sendFriendInvitationEmail(
  to: string,
  inviterName: string,
  voucherCode: string,
  locale = "es",
) {
  const registerUrl = `${APP_URL}/register`;
  const copy = INVITATION_COPY[locale] ?? INVITATION_COPY.es;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: copy.subject(inviterName),
    html: `
<!DOCTYPE html>
<html lang="${locale}">
${renderEmailHead()}
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
${renderBrandHeader()}
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">${copy.h1(inviterName)}</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">${copy.body(inviterName)}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px 20px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:13px;color:#0369a1;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${copy.codeLabel}</p>
                  <p style="margin:0;font-size:26px;font-weight:800;color:#0f172a;letter-spacing:0.12em;">${voucherCode}</p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${registerUrl}"
                     style="display:inline-block;background:#0369a1;color:#ffffff;font-size:15px;font-weight:700;
                            text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.01em;">
                    ${copy.cta}
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">${copy.footer(inviterName)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} AziAtlas · <a href="${APP_URL}" style="color:#94a3b8;">www.aziatlas.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error("[email] invitation Resend error:", error);
    throw new Error(`Resend failed: ${JSON.stringify(error)}`);
  }

  console.log("[email] invitation sent OK, id:", data?.id);
}

const FRIEND_REQUEST_COPY: Record<string, { subject: (n: string) => string; h1: string; body: (n: string) => string; cta: string }> = {
  es: {
    subject: (n) => `${n} quiere unirse a tu cordada en AziAtlas 🧗`,
    h1: "Nueva solicitud de amistad",
    body: (n) => `<strong>${n}</strong> quiere añadirte a su cordada. Acepta la solicitud para ver sus ascensiones y aparecer juntos en la clasificación.`,
    cta: "Ver solicitud →",
  },
  ca: {
    subject: (n) => `${n} vol unir-se a la teva cordada a AziAtlas 🧗`,
    h1: "Nova sol·licitud d'amistat",
    body: (n) => `<strong>${n}</strong> vol afegir-te a la seva cordada. Accepta la sol·licitud per veure les seves ascensions i aparèixer junts a la classificació.`,
    cta: "Veure sol·licitud →",
  },
  en: {
    subject: (n) => `${n} wants to join your rope team on AziAtlas 🧗`,
    h1: "New friend request",
    body: (n) => `<strong>${n}</strong> wants to add you to their rope team. Accept the request to see their ascents and appear together in the rankings.`,
    cta: "View request →",
  },
  fr: {
    subject: (n) => `${n} veut rejoindre ta cordée sur AziAtlas 🧗`,
    h1: "Nouvelle demande d'amitié",
    body: (n) => `<strong>${n}</strong> veut t'ajouter à sa cordée. Accepte la demande pour voir ses ascensions et apparaître ensemble dans le classement.`,
    cta: "Voir la demande →",
  },
  de: {
    subject: (n) => `${n} möchte deiner Seilschaft auf AziAtlas beitreten 🧗`,
    h1: "Neue Freundschaftsanfrage",
    body: (n) => `<strong>${n}</strong> möchte dich zu seiner Seilschaft hinzufügen. Nimm die Anfrage an, um seine Aufstiege zu sehen und gemeinsam in der Rangliste zu erscheinen.`,
    cta: "Anfrage ansehen →",
  },
};

const FRIEND_ACCEPTED_COPY: Record<string, { subject: (n: string) => string; h1: string; body: (n: string) => string; cta: string }> = {
  es: {
    subject: (n) => `${n} ha aceptado tu solicitud de amistad`,
    h1: "¡Ya sois cordada!",
    body: (n) => `<strong>${n}</strong> ha aceptado tu solicitud. Ya podéis ver vuestras ascensiones y competir juntos en la clasificación.`,
    cta: "Ver amigos →",
  },
  ca: {
    subject: (n) => `${n} ha acceptat la teva sol·licitud d'amistat`,
    h1: "Ja sou cordada!",
    body: (n) => `<strong>${n}</strong> ha acceptat la teva sol·licitud. Ja podeu veure les vostres ascensions i competir junts a la classificació.`,
    cta: "Veure amics →",
  },
  en: {
    subject: (n) => `${n} accepted your friend request`,
    h1: "You're on the same rope team!",
    body: (n) => `<strong>${n}</strong> accepted your request. You can now see each other's ascents and compete together in the rankings.`,
    cta: "View friends →",
  },
  fr: {
    subject: (n) => `${n} a accepté ta demande d'amitié`,
    h1: "Vous êtes dans la même cordée !",
    body: (n) => `<strong>${n}</strong> a accepté ta demande. Vous pouvez maintenant voir vos ascensions et vous affronter dans le classement.`,
    cta: "Voir les amis →",
  },
  de: {
    subject: (n) => `${n} hat deine Freundschaftsanfrage angenommen`,
    h1: "Ihr seid jetzt eine Seilschaft!",
    body: (n) => `<strong>${n}</strong> hat deine Anfrage angenommen. Ihr könnt jetzt gegenseitig eure Aufstiege sehen und in der Rangliste gegeneinander antreten.`,
    cta: "Freunde ansehen →",
  },
};

export async function sendFriendAcceptedEmail(to: string, acceptorName: string, locale = "es") {
  const copy = FRIEND_ACCEPTED_COPY[locale] ?? FRIEND_ACCEPTED_COPY.es;
  const friendsUrl = `${APP_URL}/friends`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: copy.subject(acceptorName),
    html: `
<!DOCTYPE html>
<html lang="${locale}">
${renderEmailHead()}
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
${renderBrandHeader()}
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">${copy.h1}</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
              ${copy.body(acceptorName)}
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${friendsUrl}"
                     style="display:inline-block;background:#0369a1;color:#ffffff;font-size:15px;font-weight:700;
                            text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.01em;">
                    ${copy.cta}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} AziAtlas · <a href="${APP_URL}" style="color:#94a3b8;">www.aziatlas.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error("[email] friend accepted Resend error:", error);
    throw new Error(`Resend failed: ${JSON.stringify(error)}`);
  }

  console.log("[email] friend accepted sent OK, id:", data?.id);
}

export async function sendFriendRequestEmail(to: string, senderName: string, locale = "es") {
  const copy = FRIEND_REQUEST_COPY[locale] ?? FRIEND_REQUEST_COPY.es;
  const friendsUrl = `${APP_URL}/friends`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: copy.subject(senderName),
    html: `
<!DOCTYPE html>
<html lang="${locale}">
${renderEmailHead()}
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
        <!-- Header -->
${renderBrandHeader()}
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">${copy.h1}</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
              ${copy.body(senderName)}
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${friendsUrl}"
                     style="display:inline-block;background:#0369a1;color:#ffffff;font-size:15px;font-weight:700;
                            text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.01em;">
                    ${copy.cta}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} AziAtlas · <a href="${APP_URL}" style="color:#94a3b8;">www.aziatlas.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error("[email] friend request Resend error:", error);
    throw new Error(`Resend failed: ${JSON.stringify(error)}`);
  }

  console.log("[email] friend request sent OK, id:", data?.id);
}
