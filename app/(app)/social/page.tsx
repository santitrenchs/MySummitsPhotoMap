import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerT } from "@/lib/i18n/server";
import { getSocialFeed } from "@/lib/services/social.service";

function initials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name[0]?.toUpperCase() ?? "?";
}

function formatDate(isoDate: string, locale: string): string {
  return new Date(isoDate).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function SocialPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [t, feed] = await Promise.all([
    getServerT(),
    getSocialFeed(session.user.id),
  ]);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 12px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
          {t.nav_people}
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
          {t.social_subtitle}
        </p>
      </div>

      {/* Empty state */}
      {feed.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 24px",
          background: "#f9fafb", borderRadius: 16,
          border: "1px solid #e5e7eb",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏔</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
            {t.social_noFriends}
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px" }}>
            {t.social_noFriendsSub}
          </p>
          <Link
            href="/friends"
            style={{
              display: "inline-block",
              background: "#0369a1", color: "white",
              padding: "10px 20px", borderRadius: 10,
              fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}
          >
            {t.social_addFriends}
          </Link>
        </div>
      )}

      {/* Feed */}
      {feed.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {feed.map((item) => {
            const isOwnAscent = item.user.id === session.user.id;
            // Primary actor to show in the card header
            const primaryName = isOwnAscent ? (session.user.name ?? "You") : item.user.name;
            // Tagged friends excluding the creator
            const taggedOthers = item.taggedFriends.filter((f) => f.userId !== item.user.id);

            return (
              <article
                key={item.id}
                style={{
                  background: "white",
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                {/* Card header */}
                <div style={{ padding: "14px 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
                    color: "white", fontSize: 14, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 0 0 2px rgba(3,105,161,0.15)",
                  }}>
                    {initials(primaryName)}
                  </div>

                  {/* Name + date */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>
                      {primaryName}
                      {taggedOthers.length > 0 && (
                        <span style={{ fontWeight: 400, color: "#6b7280" }}>
                          {" "}
                          {t.detail_with.toLowerCase()}{" "}
                          {taggedOthers.map((f) => f.name).join(", ")}
                        </span>
                      )}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                      {formatDate(item.date, t.dateLocale)}
                    </p>
                  </div>

                  {/* Altitude badge */}
                  <div style={{
                    background: "#f0f9ff", color: "#0369a1",
                    fontSize: 12, fontWeight: 700,
                    padding: "4px 10px", borderRadius: 20,
                    border: "1px solid #bae6fd",
                    flexShrink: 0,
                  }}>
                    {item.peak.altitudeM.toLocaleString()} m
                  </div>
                </div>

                {/* Peak name + route */}
                <div style={{ paddingLeft: 68, paddingRight: 16, paddingBottom: item.photos.length > 0 ? 10 : 14 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e3a5f" }}>
                    {item.peak.name}
                  </p>
                  {item.route && (
                    <p style={{ margin: "3px 0 0", fontSize: 13, color: "#6b7280" }}>
                      {item.route}
                    </p>
                  )}
                </div>

                {/* Photo strip */}
                {item.photos.length > 0 && (
                  <div style={{
                    display: "flex", gap: 3,
                    overflowX: "auto", padding: "0 16px 14px",
                    scrollbarWidth: "none",
                  }}>
                    {item.photos.map((photo) => (
                      <div
                        key={photo.id}
                        style={{
                          flexShrink: 0,
                          width: item.photos.length === 1 ? "100%" : 120,
                          height: item.photos.length === 1 ? 220 : 120,
                          borderRadius: 10,
                          overflow: "hidden",
                          background: "#f3f4f6",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={item.peak.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
