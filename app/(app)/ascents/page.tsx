import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listAscents } from "@/lib/services/ascent.service";
import { DeleteAscentButton } from "@/components/ascents/DeleteAscentButton";
import { prisma } from "@/lib/db/client";

export default async function AscentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const ascents = await listAscents(session.user.tenantId);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>Ascents</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
            {ascents.length} ascent{ascents.length !== 1 ? "s" : ""} logged
          </p>
        </div>
        <Link
          href="/ascents/new"
          style={{
            padding: "8px 16px", background: "#0369a1", color: "white",
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            textDecoration: "none",
          }}
        >
          + New ascent
        </Link>
      </div>

      {ascents.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "64px 0",
          border: "1px dashed #e5e7eb", borderRadius: 12, color: "#9ca3af",
        }}>
          <p style={{ fontSize: 32, margin: "0 0 8px" }}>🏔</p>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", margin: 0 }}>No ascents yet</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 16px" }}>
            Log your first summit from the map or here
          </p>
          <Link
            href="/ascents/new"
            style={{
              padding: "8px 16px", background: "#0369a1", color: "white",
              borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}
          >
            + Log ascent
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ascents.map((ascent) => (
            <div
              key={ascent.id}
              style={{
                background: "white", border: "1px solid #e5e7eb",
                borderRadius: 12, padding: "16px 20px",
                display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                gap: 16,
              }}
            >
              <Link href={`/ascents/${ascent.id}`} style={{ flex: 1, minWidth: 0, textDecoration: "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
                    {ascent.peak.name}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: "#0369a1",
                    background: "#eff6ff", borderRadius: 20, padding: "2px 8px",
                  }}>
                    {ascent.peak.altitudeM.toLocaleString()} m
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
                  {new Date(ascent.date).toLocaleDateString("en-GB", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
                {ascent.route && (
                  <p style={{ fontSize: 13, color: "#374151", margin: "6px 0 0" }}>
                    <span style={{ color: "#9ca3af" }}>Route: </span>{ascent.route}
                  </p>
                )}
                {ascent.description && (
                  <p style={{
                    fontSize: 13, color: "#374151", margin: "4px 0 0",
                    overflow: "hidden", textOverflow: "ellipsis",
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  }}>
                    {ascent.description}
                  </p>
                )}
              </div>
              </Link>
              <DeleteAscentButton id={ascent.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
