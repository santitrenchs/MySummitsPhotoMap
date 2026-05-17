import { prisma } from "@/lib/db/client";

export default async function AdminDashboard() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [userCount, peakCount, ascentThisMonth, totalAscents, peaksWithoutOsm] = await Promise.all([
    prisma.user.count(),
    prisma.peak.count(),
    prisma.ascent.count({ where: { date: { gte: firstDayOfMonth } } }),
    prisma.ascent.count(),
    prisma.peak.count({ where: { osmId: null } }),
  ]);

  const monthName = now.toLocaleString("es", { month: "long" });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen operacional de Peakadex</p>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-card-label">Total usuarios</div>
          <div className="kpi-card-value">{userCount.toLocaleString("es")}</div>
          <div className="kpi-card-change">
            <span className="badge badge-info">usuarios registrados</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Total cimas</div>
          <div className="kpi-card-value">{peakCount.toLocaleString("es")}</div>
          <div className="kpi-card-change">
            <span className="badge badge-neutral">en el catálogo</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Ascensiones ({monthName})</div>
          <div className="kpi-card-value">{ascentThisMonth.toLocaleString("es")}</div>
          <div className="kpi-card-change">
            <span className="badge badge-success">este mes</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Total ascensiones</div>
          <div className="kpi-card-value">{totalAscents.toLocaleString("es")}</div>
          <div className="kpi-card-change">
            <span className="badge badge-neutral">histórico</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Alertas operacionales</span>
          </div>
          {peaksWithoutOsm > 0 ? (
            <div className="alert-block">
              <strong>{peaksWithoutOsm} cima{peaksWithoutOsm !== 1 ? "s" : ""}</strong> sin OSM ID asignado.{" "}
              <a href="/admin/peaks" style={{ color: "inherit", fontWeight: 600, textDecoration: "underline" }}>
                Ver cimas →
              </a>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
              ✓ Sin alertas activas
            </p>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Accesos rápidos</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a href="/admin/users" className="btn btn-secondary" style={{ textDecoration: "none", textAlign: "center" }}>
              Gestionar usuarios
            </a>
            <a href="/admin/peaks" className="btn btn-secondary" style={{ textDecoration: "none", textAlign: "center" }}>
              Gestionar cimas
            </a>
            <a href="/admin/vouchers" className="btn btn-secondary" style={{ textDecoration: "none", textAlign: "center" }}>
              Gestionar vouchers
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
