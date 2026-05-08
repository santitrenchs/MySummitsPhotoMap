import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "Peakadex <noreply@mail.peakadex.com>";
const APP_URL = (
  process.env.NEXTAUTH_URL ??
  process.env.AUTH_URL ??
  "https://www.peakadex.com"
).replace(/\/$/, "");

const FONT_STACK = "Arial,Helvetica,sans-serif";

function renderEmailHead() {
  return `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>`;
}

function renderBrandHeader() {
  return `
        <tr>
          <td style="padding:24px 32px 20px;background:#ffffff;border-bottom:1px solid #f1f5f9;text-align:center;">
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
              <tr>
                <td style="vertical-align:middle;">
                  <span style="font-family:${FONT_STACK};font-size:28px;font-weight:800;letter-spacing:-0.02em;color:#0D2538;">peak</span>
                </td>
                <td style="vertical-align:middle;padding:0 4px;">
                  <img src="https://pub-e648f9ddf0d74df1b67853b9453fbca5.r2.dev/logo-email-v2.png" width="30" height="30" alt="" style="display:block;border:0;">
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-family:${FONT_STACK};font-size:28px;font-weight:800;letter-spacing:-0.02em;color:#8a9bb0;">adex</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
}

const PASSWORD_RESET_COPY: Record<string, { subject: string; h1: string; body: string; cta: string; expiry: string; fallback: string }> = {
  es: {
    subject: "Restablece tu contraseña — Peakadex",
    h1: "Restablece tu contraseña",
    body: "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón para continuar.",
    cta: "Restablecer contraseña",
    expiry: "Este enlace caduca en <strong>1 hora</strong>. Si no solicitaste restablecer tu contraseña, puedes ignorar este email.",
    fallback: "Si el botón no funciona, copia y pega este enlace en tu navegador:",
  },
  ca: {
    subject: "Restableix la teva contrasenya — Peakadex",
    h1: "Restableix la teva contrasenya",
    body: "Hem rebut una sol·licitud per restablir la contrasenya del teu compte. Fes clic al botó per continuar.",
    cta: "Restablir contrasenya",
    expiry: "Aquest enllaç caduca en <strong>1 hora</strong>. Si no has sol·licitat restablir la contrasenya, pots ignorar aquest email.",
    fallback: "Si el botó no funciona, copia i enganxa aquest enllaç al teu navegador:",
  },
  en: {
    subject: "Reset your password — Peakadex",
    h1: "Reset your password",
    body: "We received a request to reset your account password. Click the button below to continue.",
    cta: "Reset password",
    expiry: "This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can ignore this email.",
    fallback: "If the button doesn't work, copy and paste this link into your browser:",
  },
  fr: {
    subject: "Réinitialise ton mot de passe — Peakadex",
    h1: "Réinitialise ton mot de passe",
    body: "Nous avons reçu une demande de réinitialisation du mot de passe de ton compte. Clique sur le bouton pour continuer.",
    cta: "Réinitialiser le mot de passe",
    expiry: "Ce lien expire dans <strong>1 heure</strong>. Si tu n'as pas demandé de réinitialisation, tu peux ignorer cet email.",
    fallback: "Si le bouton ne fonctionne pas, copie et colle ce lien dans ton navigateur :",
  },
  de: {
    subject: "Passwort zurücksetzen — Peakadex",
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
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Peakadex · <a href="${APP_URL}" style="color:#94a3b8;">www.peakadex.com</a></p>
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
    subject: (n) => `¡Bienvenido/a a Peakadex, ${n}!`,
    h1: (n) => `¡Bienvenido/a, ${n}!`,
    body1: "Ya eres parte de Peakadex. Empieza registrando tu primera cima y construye tu historial de ascensiones.",
    body2: "Explora el mapa, conecta con tus amigos y sube peldaños en la clasificación de tu cordada.",
    cta: "Ir a Peakadex →",
  },
  ca: {
    subject: (n) => `Benvingut/da a Peakadex, ${n}. La teva història comença aquí`,
    h1: (n) => `Benvingut/da, ${n}`,
    body1: `Cada cim té una història.<br>I avui comença la teva.<br><br>Ja formes part de Peakadex. Registra la teva primera ascensió i comença a escriure el teu camí a la muntanya.`,
    body2: `Explora nous horitzons, descobreix cims i comparteix cada pas amb la teva cordada.<br>La muntanya t'espera.`,
    cta: "Començar l'aventura →",
  },
  en: {
    subject: (n) => `Welcome to Peakadex, ${n}!`,
    h1: (n) => `Welcome, ${n}!`,
    body1: "You're now part of Peakadex. Start by logging your first summit and build your ascent history.",
    body2: "Explore the map, connect with friends, and climb the rankings in your rope team.",
    cta: "Go to Peakadex →",
  },
  fr: {
    subject: (n) => `Bienvenue sur Peakadex, ${n} !`,
    h1: (n) => `Bienvenue, ${n} !`,
    body1: "Tu fais maintenant partie de Peakadex. Commence par enregistrer ton premier sommet et construis ton historique d'ascensions.",
    body2: "Explore la carte, connecte-toi avec tes amis et grimpe dans le classement de ta cordée.",
    cta: "Aller sur Peakadex →",
  },
  de: {
    subject: (n) => `Willkommen bei Peakadex, ${n}!`,
    h1: (n) => `Willkommen, ${n}!`,
    body1: "Du bist jetzt Teil von Peakadex. Beginne damit, deinen ersten Gipfel einzutragen und deine Aufstiegshistorie aufzubauen.",
    body2: "Erkunde die Karte, verbinde dich mit Freunden und erklimme die Rangliste deiner Seilschaft.",
    cta: "Zu Peakadex →",
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
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Peakadex · <a href="${APP_URL}" style="color:#94a3b8;">www.peakadex.com</a></p>
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
    subject: (n) => `${n} te invita a Peakadex`,
    h1: (n) => `${n} te invita a Peakadex`,
    body: (_n) => `Cada cima tiene una historia.<br>Ahora es tu momento de empezar la tuya. Únete a Peakadex, registra tus ascensiones y vive la aventura con tu cordada.`,
    codeLabel: "Tu código de acceso",
    cta: "Crear mi cuenta →",
    footer: (n) => `Una vez registrado/a, busca a <strong>${n}</strong> en la sección <strong>Amigos</strong> y envíale una solicitud. El código caduca en <strong>7 días</strong> y es de un solo uso.`,
  },
  ca: {
    subject: (n) => `${n} t'invita a Peakadex`,
    h1: (n) => `${n} t'invita a Peakadex`,
    body: (_n) => `Cada cim té una història.<br>Ara és el teu moment de començar la teva. Uneix-te a Peakadex, registra les teves ascensions i viu l'aventura amb la teva cordada.`,
    codeLabel: "El teu codi d'accés",
    cta: "Unir-me a Peakadex →",
    footer: (n) => `Un cop registrat/da, cerca a <strong>${n}</strong> a la secció <strong>Amics</strong> i envia-li una sol·licitud. El codi caduca en <strong>7 dies</strong> i és d'un sol ús.`,
  },
  en: {
    subject: (n) => `${n} invites you to Peakadex`,
    h1: (n) => `${n} invites you to Peakadex`,
    body: (_n) => `Every summit has a story.<br>Now it's your turn to start yours. Join Peakadex, log your ascents and live the adventure with your rope team.`,
    codeLabel: "Your access code",
    cta: "Create my account →",
    footer: (n) => `Once registered, search for <strong>${n}</strong> in the <strong>Friends</strong> section and send them a request. The code expires in <strong>7 days</strong> and can only be used once.`,
  },
  fr: {
    subject: (n) => `${n} t'invite sur Peakadex`,
    h1: (n) => `${n} t'invite sur Peakadex`,
    body: (_n) => `Chaque sommet a une histoire.<br>C'est maintenant ton tour de commencer la tienne. Rejoins Peakadex, enregistre tes ascensions et vis l'aventure avec ta cordée.`,
    codeLabel: "Ton code d'accès",
    cta: "Créer mon compte →",
    footer: (n) => `Une fois inscrit(e), recherche <strong>${n}</strong> dans la section <strong>Amis</strong> et envoie-lui une demande. Le code expire dans <strong>7 jours</strong> et n'est utilisable qu'une seule fois.`,
  },
  de: {
    subject: (n) => `${n} lädt dich zu Peakadex ein`,
    h1: (n) => `${n} lädt dich zu Peakadex ein`,
    body: (_n) => `Jeder Gipfel hat eine Geschichte.<br>Jetzt ist dein Moment, deine eigene zu beginnen. Tritt Peakadex bei, erfasse deine Aufstiege und erlebe das Abenteuer mit deiner Seilschaft.`,
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
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Peakadex · <a href="${APP_URL}" style="color:#94a3b8;">www.peakadex.com</a></p>
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
    subject: (n) => `${n} quiere unirse a tu cordada en Peakadex 🧗`,
    h1: "Nueva solicitud de amistad",
    body: (n) => `<strong>${n}</strong> quiere añadirte a su cordada. Acepta la solicitud para ver sus ascensiones y aparecer juntos en la clasificación.`,
    cta: "Ver solicitud →",
  },
  ca: {
    subject: (n) => `${n} vol compartir camí amb tu a Peakadex`,
    h1: "Una nova cordada t'espera",
    body: (n) => `<strong>${n}</strong> vol sumar-te a la seva cordada.<br><br>Cada cim és millor quan es comparteix. Accepta la sol·licitud i segueix les seves ascensions, compareu el vostre progrés i avanceu junts cap a nous reptes.`,
    cta: "Unir-me a la cordada →",
  },
  en: {
    subject: (n) => `${n} wants to join your rope team on Peakadex 🧗`,
    h1: "New friend request",
    body: (n) => `<strong>${n}</strong> wants to add you to their rope team. Accept the request to see their ascents and appear together in the rankings.`,
    cta: "View request →",
  },
  fr: {
    subject: (n) => `${n} veut rejoindre ta cordée sur Peakadex 🧗`,
    h1: "Nouvelle demande d'amitié",
    body: (n) => `<strong>${n}</strong> veut t'ajouter à sa cordée. Accepte la demande pour voir ses ascensions et apparaître ensemble dans le classement.`,
    cta: "Voir la demande →",
  },
  de: {
    subject: (n) => `${n} möchte deiner Seilschaft auf Peakadex beitreten 🧗`,
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
    subject: (n) => `${n} ja forma part de la teva cordada`,
    h1: "La cordada creix",
    body: (n) => `<strong>${n}</strong> ha acceptat la teva sol·licitud.<br><br>Un nou company de camí. Nous cims a l'horitzó.<br>Compartiu ascensions, desafieu-vos i escriviu plegats noves històries a la muntanya.`,
    cta: "Veure la cordada →",
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
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Peakadex · <a href="${APP_URL}" style="color:#94a3b8;">www.peakadex.com</a></p>
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
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Peakadex · <a href="${APP_URL}" style="color:#94a3b8;">www.peakadex.com</a></p>
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

const PHOTO_TAG_COPY: Record<string, { subject: (n: string, peak: string) => string; h1: (n: string) => string; body: (n: string, peak: string) => string; cta: string }> = {
  es: {
    subject: (n, _peak) => `${n} te ha etiquetado en una foto`,
    h1: (n) => `${n} te ha etiquetado`,
    body: (n, peak) => `<strong>${n}</strong> te ha etiquetado en una foto de la ascensión a <strong>${peak}</strong>.`,
    cta: "Ver foto →",
  },
  ca: {
    subject: (n, peak) => `${n} ha fet tornar un record a ${peak}`,
    h1: (_n) => `Un record compartit`,
    body: (n, peak) => `<strong>${n}</strong> t'ha etiquetat en una foto de l'ascensió a <strong>${peak}</strong>.<br><br>Moments que tornen. Passes que deixen empremta.<br>Reviu aquell dia i guarda'l com part del teu camí a la muntanya.`,
    cta: "Veure la foto →",
  },
  en: {
    subject: (n, _peak) => `${n} tagged you in a photo`,
    h1: (n) => `${n} tagged you`,
    body: (n, peak) => `<strong>${n}</strong> tagged you in a photo from the ascent of <strong>${peak}</strong>.`,
    cta: "View photo →",
  },
  fr: {
    subject: (n, _peak) => `${n} t'a tagué(e) dans une photo`,
    h1: (n) => `${n} t'a tagué(e)`,
    body: (n, peak) => `<strong>${n}</strong> t'a tagué(e) dans une photo de l'ascension de <strong>${peak}</strong>.`,
    cta: "Voir la photo →",
  },
  de: {
    subject: (n, _peak) => `${n} hat dich in einem Foto markiert`,
    h1: (n) => `${n} hat dich markiert`,
    body: (n, peak) => `<strong>${n}</strong> hat dich in einem Foto des Aufstiegs auf <strong>${peak}</strong> markiert.`,
    cta: "Foto ansehen →",
  },
};

export async function sendPhotoTagEmail(
  to: string,
  taggerName: string,
  peakName: string,
  ascentId: string,
  locale = "es",
) {
  const copy = PHOTO_TAG_COPY[locale] ?? PHOTO_TAG_COPY.es;
  const photoUrl = `${APP_URL}/ascents/${ascentId}`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: copy.subject(taggerName, peakName),
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
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">${copy.body(taggerName, peakName)}</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${photoUrl}"
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
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Peakadex · <a href="${APP_URL}" style="color:#94a3b8;">www.peakadex.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error("[email] photo tag Resend error:", error);
    throw new Error(`Resend failed: ${JSON.stringify(error)}`);
  }

  console.log("[email] photo tag sent OK, id:", data?.id);
}
