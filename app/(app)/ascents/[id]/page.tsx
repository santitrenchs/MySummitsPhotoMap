import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTenantConnection } from "@/lib/db/tenant-resolver";
import { PhotoUploader } from "@/components/photos/PhotoUploader";
import { getServerT } from "@/lib/i18n/server";
import { i } from "@/lib/i18n";

export default async function AscentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const db = await getTenantConnection(session.user.tenantId);

  const ascent = await db.ascent.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      peak: {
        select: {
          name: true, altitudeM: true, mountainRange: true,
          latitude: true, longitude: true,
        },
      },
      photos: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true, url: true,
          faceDetections: {
            select: {
              faceTags: {
                select: { person: { select: { id: true, name: true, email: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!ascent) notFound();

  const t = await getServerT();

  // ── Derived data ──────────────────────────────────────────────────────────
  const heroPhoto = ascent.photos[0] ?? null;
  const allPhotos = ascent.photos;

  // Deduplicated persons across all photos, excluding the current user
  const personMap = new Map<string, { name: string; email: string | null }>();
  for (const photo of ascent.photos) {
    for (const fd of photo.faceDetections) {
      for (const tag of fd.faceTags) {
        personMap.set(tag.person.id, { name: tag.person.name, email: tag.person.email });
      }
    }
  }
  const allPersons = Array.from(personMap.entries()).map(([pid, p]) => ({ id: pid, ...p }));
  // "others" = everyone except the logged-in user
  const persons = allPersons.filter(p => p.email !== session.user.email);

  const dateStr = new Date(ascent.date).toLocaleDateString(t.dateLocale, {
    day: "numeric", month: "long", year: "numeric",
  });

  // Emotional summary sentence
  let emotionalText: string;
  if (persons.length === 0) {
    emotionalText = i(t.emotional_solo, { peak: ascent.peak.name, date: dateStr });
  } else if (persons.length === 1) {
    emotionalText = i(t.emotional_one, { peak: ascent.peak.name, p1: persons[0].name, date: dateStr });
  } else if (persons.length === 2) {
    emotionalText = i(t.emotional_two, { peak: ascent.peak.name, p1: persons[0].name, p2: persons[1].name, date: dateStr });
  } else {
    emotionalText = i(t.emotional_many, { peak: ascent.peak.name, p1: persons[0].name, p2: persons[1].name, n: persons.length - 2, date: dateStr });
  }

  const { latitude, longitude } = ascent.peak;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.08},${latitude - 0.05},${longitude + 0.08},${latitude + 0.05}&layer=mapnik&marker=${latitude},${longitude}`;
  const osmLink = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=13/${latitude}/${longitude}`;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: 48 }}>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", aspectRatio: "4/5", background: "#0f172a", overflow: "hidden" }}>
        {heroPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroPhoto.url}
            alt={ascent.peak.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <HeroPlaceholder />
        )}

        {/* Gradient scrim */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 35%, transparent 55%, rgba(0,0,0,0.72) 100%)",
          pointerEvents: "none",
        }} />

        {/* Back button */}
        <Link
          href="/ascents"
          style={{
            position: "absolute", top: 16, left: 16,
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 18, textDecoration: "none",
          }}
        >←</Link>

        {/* Edit link */}
        <Link
          href={`/ascents/${id}/edit`}
          style={{
            position: "absolute", top: 16, right: 16,
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 15, textDecoration: "none",
          }}
        >✏️</Link>

        {/* Peak name + altitude overlay */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 20px 20px" }}>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 600, margin: "0 0 4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {ascent.peak.mountainRange ?? ""}
          </p>
          <h1 style={{ color: "white", fontSize: 32, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            {ascent.peak.name}
          </h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{
              background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 20, padding: "4px 12px",
              color: "white", fontSize: 13, fontWeight: 700,
            }}>
              {ascent.peak.altitudeM.toLocaleString(t.dateLocale)} m
            </span>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{dateStr}</span>
          </div>
        </div>
      </div>

      {/* ── ACTION BAR ─────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20,
        padding: "14px 20px",
        borderBottom: "1px solid #f3f4f6",
        background: "white",
      }}>
        <ActionBtn emoji="🤍" label={String(allPhotos.length || "")} />
        {ascent.route && <ActionBtn emoji="🗺️" label={ascent.route} maxWidth={140} />}
        {persons.length > 0 && <ActionBtn emoji="👥" label={String(persons.length)} />}
        <div style={{ marginLeft: "auto" }}>
          <ActionBtn emoji="✏️" label="" href={`/ascents/${id}/edit`} />
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>

        {/* ── EMOTIONAL TEXT ───────────────────────────────────────────── */}
        <div style={{ padding: "18px 0 14px" }}>
          <p style={{
            fontSize: 15, color: "#111827", lineHeight: 1.6,
            margin: 0, fontWeight: 500,
          }}>
            {emotionalText}
          </p>
          {ascent.description && (
            <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, margin: "8px 0 0" }}>
              {ascent.description}
            </p>
          )}
        </div>

        {/* ── QUICK STATS ──────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <StatChip emoji="📅" text={dateStr} />
          <StatChip emoji="📏" text={`${ascent.peak.altitudeM.toLocaleString(t.dateLocale)} m`} />
          {ascent.route && <StatChip emoji="🧭" text={ascent.route} />}
          {allPhotos.length > 0 && <StatChip emoji="📸" text={i(t.detail_photos, { n: allPhotos.length })} />}
        </div>

        {/* ── PEOPLE ───────────────────────────────────────────────────── */}
        {persons.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>
              {t.detail_with}
            </h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {persons.map((p) => (
                <Link key={p.id} href={`/persons/${p.id}`} style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%",
                    background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
                    border: "2.5px solid white", boxShadow: "0 0 0 2px #e5e7eb",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, fontWeight: 700, color: "#0369a1",
                  }}>
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{p.name.split(" ")[0]}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── PHOTO GALLERY ────────────────────────────────────────────── */}
        {allPhotos.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
              {i(t.detail_photos, { n: allPhotos.length })}
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 3,
            }}>
              {allPhotos.map((photo, i) => (
                <div
                  key={photo.id}
                  style={{
                    aspectRatio: "1",
                    overflow: "hidden",
                    background: "#f1f5f9",
                    // First photo spans 2 columns + 2 rows if there are multiple
                    ...(i === 0 && allPhotos.length > 1
                      ? { gridColumn: "span 2", gridRow: "span 2", aspectRatio: "1" }
                      : {}),
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── MAP / WIKILOC ────────────────────────────────────────────── */}
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
              {ascent.wikiloc ? t.detail_routeWikiloc : t.detail_location}
            </h2>
            {ascent.wikiloc && (
              <a
                href={ascent.wikiloc.replace("embedv2.do", "iframe/index").replace(/&[^?]*$/, "")}
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, fontWeight: 600, color: "#4C8C2B", textDecoration: "none" }}
              >
                {t.detail_openWikiloc}
              </a>
            )}
          </div>

          {ascent.wikiloc ? (
            /* ── Wikiloc embed ── */
            <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb" }}>
              <iframe
                src={ascent.wikiloc}
                width="100%"
                height="300"
                style={{ border: "none", display: "block" }}
                title="Wikiloc route"
                allowFullScreen
              />
            </div>
          ) : (
            /* ── OpenStreetMap fallback ── */
            <a href={osmLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>
              <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb", position: "relative" }}>
                <iframe
                  src={mapUrl}
                  width="100%"
                  height="200"
                  style={{ border: "none", display: "block", pointerEvents: "none" }}
                  title="Peak location"
                />
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
                  padding: 10,
                }}>
                  <span style={{
                    background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)",
                    borderRadius: 20, padding: "4px 12px",
                    fontSize: 11, fontWeight: 600, color: "#374151",
                  }}>
                    {latitude.toFixed(4)}°N · {longitude.toFixed(4)}°E ↗
                  </span>
                </div>
              </div>
            </a>
          )}
        </section>

        {/* ── ADD PHOTOS ───────────────────────────────────────────────── */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>
            {t.detail_addPhotos}
          </h2>
          <PhotoUploader
            ascentId={id}
            existingPhotos={allPhotos.map((p) => ({ id: p.id, url: p.url }))}
          />
        </section>

      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function ActionBtn({ emoji, label, maxWidth, href }: { emoji: string; label: string; maxWidth?: number; href?: string }) {
  const inner = (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
      <span style={{ fontSize: 20 }}>{emoji}</span>
      {label && (
        <span style={{
          fontSize: 12, fontWeight: 600, color: "#374151",
          maxWidth: maxWidth ?? undefined,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{label}</span>
      )}
    </div>
  );
  if (href) return <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link>;
  return inner;
}

function StatChip({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: "#f9fafb", border: "1px solid #e5e7eb",
      borderRadius: 20, padding: "5px 12px",
      fontSize: 12, fontWeight: 600, color: "#374151",
    }}>
      <span>{emoji}</span>
      <span>{text}</span>
    </div>
  );
}

function HeroPlaceholder() {
  return (
    <svg viewBox="0 0 600 750" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="hp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#3b6ea5" />
        </linearGradient>
        <linearGradient id="hp-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#64748b" /><stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="hp-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" /><stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      <rect width="600" height="750" fill="url(#hp-sky)" />
      <polygon points="0,520 600,520 600,750 0,750" fill="#1e3a2f" opacity="0.8" />
      <polygon points="100,420 350,80 600,380 600,520 0,520" fill="url(#hp-rock)" />
      <polygon points="250,430 450,160 600,400 600,520 180,520" fill="#475569" opacity="0.55" />
      <polygon points="350,80 420,200 350,185 280,200" fill="url(#hp-snow)" />
      <circle cx="80" cy="100" r="14" fill="white" opacity="0.12" />
      <circle cx="140" cy="60" r="8" fill="white" opacity="0.1" />
      <circle cx="500" cy="80" r="10" fill="white" opacity="0.1" />
    </svg>
  );
}
