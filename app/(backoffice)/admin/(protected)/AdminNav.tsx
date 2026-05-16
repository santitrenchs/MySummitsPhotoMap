"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICON_DASHBOARD = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const ICON_USERS = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const ICON_PEAKS = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 22 20 2 20"/>
  </svg>
);
const ICON_VOUCHERS = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/>
    <path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
  </svg>
);

const NAV_SECTIONS = [
  {
    label: "Principal",
    items: [
      { href: "/admin", label: "Dashboard", icon: ICON_DASHBOARD, exact: true as const },
    ],
  },
  {
    label: "Contenido",
    items: [
      { href: "/admin/users",    label: "Usuarios", icon: ICON_USERS,    exact: false as const },
      { href: "/admin/peaks",    label: "Cimas",    icon: ICON_PEAKS,    exact: false as const },
      { href: "/admin/vouchers", label: "Vouchers", icon: ICON_VOUCHERS, exact: false as const },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <nav className="admin-sidebar">
      {NAV_SECTIONS.map(({ label, items }) => (
        <div key={label} style={{ marginBottom: 8 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
            color: "var(--text-muted)", padding: "8px 16px 4px",
          }}>
            {label}
          </div>
          {items.map(({ href, label: itemLabel, icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={`admin-sidebar-item${active ? " active" : ""}`}
              >
                <span className="admin-sidebar-icon">{icon}</span>
                {itemLabel}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
