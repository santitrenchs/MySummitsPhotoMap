"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/users",       label: "Usuarios",    icon: "👥" },
  { href: "/admin/vouchers",    label: "Vouchers",    icon: "🎟️" },
  { href: "/admin/peaks",       label: "Cimas",       icon: "⛰️" },
  { href: "/admin/geoposicion", label: "Geoposición", icon: "📍" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      width: 200, background: "white",
      borderRight: "1px solid #e2e8f0",
      padding: "24px 0",
    }}>
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 20px", fontSize: 14, fontWeight: active ? 600 : 500,
              color: active ? "#2563eb" : "#334155",
              textDecoration: "none",
              background: active ? "#eff6ff" : "transparent",
              borderLeft: active ? "3px solid #2563eb" : "3px solid transparent",
              transition: "background 0.1s",
            }}
          >
            <span>{icon}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
