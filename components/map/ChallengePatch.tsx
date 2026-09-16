"use client";

/**
 * The reto's patch — its face. Same object the Retos tab shows at 60px and the
 * challenge header at 76px; here it shrinks to 24px on the peak popup and 18px on a
 * list row.
 *
 * ⚠️ `object-fit: contain`, never a circular clip: the artwork is a disc with its own
 * ring, and cropping it to a circle shaves that ring off (see ChallengesTab). The
 * drop-shadow is what separates it from a white surface instead.
 *
 * A reto with no `coverUrl` falls back to the same circular placeholder the Retos
 * list uses. At 18px that placeholder says very little — which is the argument for
 * requiring real art on every published reto, not for inventing a different glyph.
 */
export function ChallengePatch({
  name,
  coverUrl,
  size,
}: {
  name: string;
  coverUrl: string | null;
  size: number;
}) {
  if (!coverUrl) {
    return (
      <div
        title={name}
        style={{
          flexShrink: 0, width: size, height: size,
          borderRadius: "50%", background: "rgba(47,122,95,0.14)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 24 24" width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} fill="none">
          <path d="M2 19 L9 7 L13 13 L16 8 L22 19 Z" fill="#2F7A5F" />
        </svg>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={coverUrl}
      alt=""
      title={name}
      loading="lazy"
      decoding="async"
      style={{
        flexShrink: 0, width: size, height: size,
        objectFit: "contain", display: "block",
        filter: "drop-shadow(0 1px 2px rgba(13,37,56,0.24))",
      }}
    />
  );
}

/**
 * The patch as a button, for the peak popup — the only surface where a patch is
 * pressable (it opens that reto's own screen). In the list the patches are inert: the
 * row is already a button, and a target inside it would steal its tap.
 *
 * `overPhoto` is the hero-photo variant: the same disc, but translucent white with a
 * blur behind it so the artwork reads over any photo, light or dark.
 */
export function ChallengePatchButton({
  name,
  coverUrl,
  size,
  label,
  overPhoto = false,
  onClick,
}: {
  name: string;
  coverUrl: string | null;
  /** The artwork's size; the button is this plus 14px, keeping it past the 44px floor. */
  size: number;
  label: string;
  overPhoto?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`reto-patch-btn${overPhoto ? " reto-patch-btn--photo" : ""}`}
      aria-label={label}
      title={name}
      onClick={onClick}
      style={{
        width: size + 14, height: size + 14,
        display: "grid", placeItems: "center",
        borderRadius: "50%",
        cursor: "pointer", padding: 0, flexShrink: 0,
        ...(overPhoto
          ? {
              border: "1px solid rgba(255,255,255,0.55)",
              background: "rgba(255,255,255,0.86)",
              backdropFilter: "blur(4px)",
              boxShadow: "0 2px 10px rgba(13,37,56,0.28)",
            }
          : {
              border: "1px solid #E8EEF3",
              background: "#F7FAFC",
            }),
      }}
    >
      <ChallengePatch name={name} coverUrl={coverUrl} size={size} />
    </button>
  );
}
