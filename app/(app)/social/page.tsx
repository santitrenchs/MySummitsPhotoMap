import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerT } from "@/lib/i18n/server";
import { getSocialData, SocialFeedItem } from "@/lib/services/social.service";
import { AscentCard, AscentCardData } from "@/components/cards/AscentCard";

function toCardData(item: SocialFeedItem): AscentCardData {
  return {
    id: item.id,
    date: item.date,
    route: item.route,
    description: item.description,
    peak: item.peak,
    photoUrl: item.photos[0]?.url ?? null,
    persons: item.persons,
    user: item.user,
  };
}

export default async function SocialPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [t, { friendsCount, feed, myAscents }] = await Promise.all([
    getServerT(),
    getSocialData(session.user.id),
  ]);

  const state =
    friendsCount === 0 ? "no-friends"
    : feed.length === 0 ? "no-activity"
    : "has-activity";

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

      {/* ── State 1: No friends ── */}
      {state === "no-friends" && (
        <div style={{
          textAlign: "center", padding: "48px 24px 40px",
          background: "#f9fafb", borderRadius: 16,
          border: "1px solid #e5e7eb",
          marginBottom: myAscents.length > 0 ? 32 : 0,
        }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🏔</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
            {t.social_noFriends}
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px", maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
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

      {/* ── State 2: Friends but no activity ── */}
      {state === "no-activity" && (
        <div style={{
          textAlign: "center", padding: "48px 24px 40px",
          background: "#f9fafb", borderRadius: 16,
          border: "1px solid #e5e7eb",
          marginBottom: myAscents.length > 0 ? 32 : 0,
        }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>👀</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
            {t.social_noActivity}
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0, maxWidth: 300, marginLeft: "auto", marginRight: "auto" }}>
            {t.social_noActivitySub}
          </p>
        </div>
      )}

      {/* ── "Tu actividad" fallback (states 1 & 2) ── */}
      {state !== "has-activity" && myAscents.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#374151", margin: "0 0 14px" }}>
            {t.social_myActivity}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {myAscents.map((item, i) => (
              <AscentCard
                key={item.id}
                variant="social"
                ascent={toCardData(item)}
                locale={t.dateLocale}
                animationIndex={i}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── State 3: Normal feed ── */}
      {state === "has-activity" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {feed.map((item, i) => (
            <AscentCard
              key={item.id}
              variant="social"
              ascent={toCardData(item)}
              locale={t.dateLocale}
              animationIndex={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
