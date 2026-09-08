"use client";

import Link from "next/link";

/**
 * How you go back from a detail screen. Use this — do not add another back control.
 *
 * It is a breadcrumb rather than a circular button on purpose: it names where you are
 * going, it sits above the title instead of competing with it for the same row, and it
 * needs no backdrop to be legible. The circular "←" it replaced only worked on the
 * cordada cover photo, which gave it contrast; on a flat background it floated.
 *
 * Always renders on the page background, above whatever identity block follows (a cover
 * photo, an avatar row, or just a title).
 */
export function BackBreadcrumb({
  href,
  label,
}: {
  href: string;
  /** Where the link goes, e.g. "Retos" or "Cordadas" — not "Volver". */
  label: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
        fontFamily: "var(--font-space-grotesk, sans-serif)",
        fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "#5A6E84",
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}
