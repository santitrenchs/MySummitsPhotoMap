"use client";

import React, { useMemo, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { SearchField } from "@/components/ui/SearchField";
import { COUNTRY_CODES, SUGGESTED_COUNTRIES, countryName } from "@/lib/country";

/**
 * Country selector shared by the sign-up form and Settings. A trigger that
 * expands in place into a search field + list — the same inline pattern as the
 * language picker, so there is no overlay to position on a scrolling form.
 *
 * `value` is an ISO code or null. Choosing "not specified" reports null.
 * Suggested countries for the app language come first, then everything else
 * alphabetically in the user's language.
 */
export function CountryPicker({
  value,
  onChange,
  triggerStyle,
}: {
  value: string | null;
  onChange: (code: string | null) => void;
  /** Lets each screen match its own field look. */
  triggerStyle?: React.CSSProperties;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const all = useMemo(() => {
    const collator = new Intl.Collator(locale);
    return COUNTRY_CODES
      .map((code) => ({ code, name: countryName(code, locale) }))
      .sort((a, b) => collator.compare(a.name, b.name));
  }, [locale]);

  const suggested = SUGGESTED_COUNTRIES[locale] ?? [];
  const q = query.trim().toLocaleLowerCase(locale);
  const matches = q
    ? all.filter((c) => c.name.toLocaleLowerCase(locale).includes(q) || c.code.toLowerCase() === q)
    : [
        ...suggested.map((code) => all.find((c) => c.code === code)!).filter(Boolean),
        ...all.filter((c) => !suggested.includes(c.code)),
      ];

  function pick(code: string | null) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }

  return (
    <div style={{ border: open ? "1px solid #E5E7EB" : "none", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "12px 14px", background: "#fff", cursor: "pointer", textAlign: "left",
          border: open ? "none" : "1px solid #E5E7EB", borderRadius: open ? 0 : "var(--radius-md)",
          borderBottom: open ? "1px solid #f3f4f6" : undefined,
          fontSize: 15, color: value ? "#0D2538" : "#94A3B8",
          fontFamily: "var(--font-inter, sans-serif)",
          ...triggerStyle,
        }}
      >
        <GlobeIcon />
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value ? countryName(value, locale) : t.country_placeholder}
        </span>
        <span aria-hidden="true" style={{ fontSize: 11, color: "#9ca3af", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
      </button>

      {open && (
        <div style={{ background: "#fff" }}>
          <div style={{ padding: 8, display: "flex" }}>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder={t.country_search}
              variant="filled"
              autoFocus
              onKeyDown={(e) => {
                // Enter would submit the sign-up form; take the first match instead.
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (matches[0]) pick(matches[0].code);
                }
              }}
            />
          </div>
          <div role="listbox" style={{ maxHeight: 260, overflowY: "auto" }}>
            {matches.map(({ code, name }) => (
              <Option key={code} label={name} active={code === value} onClick={() => pick(code)} />
            ))}
            <Option label={t.country_notSpecified} active={value === null} muted onClick={() => pick(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Option({ label, active, muted, onClick }: { label: string; active: boolean; muted?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", width: "100%", minHeight: 44, padding: "0 16px",
        background: "none", border: "none", borderTop: "1px solid #f3f4f6", cursor: "pointer", textAlign: "left",
        fontSize: 14, fontWeight: active ? 600 : 400,
        color: active ? "#0369a1" : muted ? "#6b7280" : "#111827",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      <span style={{ flex: 1 }}>{label}</span>
      {active && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
