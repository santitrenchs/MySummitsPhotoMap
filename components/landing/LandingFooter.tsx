import Link from "next/link";
import { PeakadexLogo } from "@/components/brand/Logo";

const FOOTER_LINKS = {
  Producto: [
    { label: "Rarezas", href: "/#rarezas" },
    { label: "Cartas", href: "/#cartas" },
    { label: "Cómo funciona", href: "/#como-funciona" },
    { label: "Registrarse", href: "/register" },
    { label: "Iniciar sesión", href: "/login" },
  ],
  Legal: [
    { label: "Política de privacidad", href: "/privacy" },
    { label: "Términos de uso", href: "/terms" },
  ],
};

export default function LandingFooter() {
  return (
    <footer
      style={{
        background: "#050810",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "48px 0 32px",
      }}
    >
      <div className="ld-container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: 48,
            marginBottom: 40,
          }}
          className="ld-footer-grid"
        >
          {/* Brand column */}
          <div>
            <Link href="/" style={{ textDecoration: "none", display: "inline-block", marginBottom: 14 }}>
              <PeakadexLogo height={28} peakColor="#F0F4FF" adexColor="rgba(240,244,255,0.5)" />
            </Link>
            <p
              style={{
                fontSize: 13,
                color: "rgba(240,244,255,0.38)",
                lineHeight: 1.6,
                maxWidth: 260,
                margin: "0 0 20px",
              }}
            >
              Captura cimas. Colecciona rarezas.
              <br />
              Conviértete en Legendario.
            </p>
            <p
              style={{
                fontSize: 11,
                color: "rgba(240,244,255,0.22)",
                lineHeight: 1.5,
              }}
            >
              Hecho con ✿ para los que suben montañas de verdad.
            </p>
          </div>

          {/* Nav columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(240,244,255,0.35)",
                  marginBottom: 16,
                }}
              >
                {title}
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      style={{
                        fontSize: 13,
                        color: "rgba(240,244,255,0.5)",
                        textDecoration: "none",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#F0F4FF")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(240,244,255,0.5)")}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 12, color: "rgba(240,244,255,0.25)", margin: 0 }}>
            © {new Date().getFullYear()} Peakadex. Todos los derechos reservados.
          </p>
          <p style={{ fontSize: 12, color: "rgba(240,244,255,0.2)", margin: 0 }}>
            Early Access — Staging
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .ld-footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 32px !important;
          }
          .ld-footer-grid > div:first-child {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </footer>
  );
}
