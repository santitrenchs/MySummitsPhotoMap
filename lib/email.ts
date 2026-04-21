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

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Restablece tu contraseña — AziAtlas",
    html: `

<!DOCTYPE html>
<html lang="es">
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">Restablece tu contraseña</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
              Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón para continuar.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${resetUrl}"
                     style="display:inline-block;background:#0369a1;color:#ffffff;font-size:15px;font-weight:700;
                            text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.01em;">
                    Restablecer contraseña
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
              Este enlace caduca en <strong>1 hora</strong>. Si no solicitaste restablecer tu contraseña, puedes ignorar este email.
            </p>
            <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;">
            <p style="margin:0;font-size:12px;color:#cbd5e1;word-break:break-all;">
              Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
              <a href="${resetUrl}" style="color:#0369a1;">${resetUrl}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} AziAtlas · www.aziatlas.com</p>
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

export async function sendWelcomeEmail(to: string, name: string) {
  const appUrl = `${APP_URL}/home`;
  const firstName = name.split(" ")[0];

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `¡Bienvenido/a a AziAtlas, ${firstName}! 🏔️`,
    html: `
<!DOCTYPE html>
<html lang="es">
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">¡Bienvenido/a, ${firstName}!</h1>
            <p style="margin:0 0 16px;font-size:15px;color:#64748b;line-height:1.6;">
              Ya eres parte de AziAtlas. Empieza registrando tu primera cima y construye tu historial de ascensiones.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
              Explora el mapa, conecta con tus amigos y sube peldaños en la clasificación de tu cordada. 🧗
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${appUrl}"
                     style="display:inline-block;background:#0369a1;color:#ffffff;font-size:15px;font-weight:700;
                            text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.01em;">
                    Ir a AziAtlas →
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
    console.error("[email] welcome email Resend error:", error);
    throw new Error(`Resend failed: ${JSON.stringify(error)}`);
  }

  console.log("[email] welcome sent OK, id:", data?.id);
}

export async function sendFriendInvitationEmail(
  to: string,
  inviterName: string,
  voucherCode: string,
) {
  const registerUrl = `${APP_URL}/register`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `${inviterName} te invita a AziAtlas`,
    html: `
<!DOCTYPE html>
<html lang="es">
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">${inviterName} te ha invitado</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
              Tu amigo/a <strong>${inviterName}</strong> te invita a unirte a AziAtlas, la app para registrar tus ascensiones, explorar cimas y comparar tu progreso con tu cordada.
            </p>
            <!-- Voucher box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px 20px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:13px;color:#0369a1;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Tu código de acceso</p>
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
                    Crear mi cuenta →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
              Una vez registrado/a, busca a <strong>${inviterName}</strong> en la sección <strong>Amigos</strong> y envíale una solicitud. El código caduca en <strong>7 días</strong> y es de un solo uso.
            </p>
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
