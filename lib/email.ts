import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "AziTracks <noreply@mail.azitracks.com>";
const APP_URL = process.env.NEXTAUTH_URL ?? "https://www.azitracks.com";

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Restablece tu contraseña — AziTracks",
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#0369a1;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;">🏔️ AziTracks</p>
          </td>
        </tr>
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
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} AziTracks · azitracks.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
