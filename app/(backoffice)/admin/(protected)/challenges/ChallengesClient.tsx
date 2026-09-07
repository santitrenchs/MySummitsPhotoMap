"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ChallengeRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  totalPeaks: number;
  participantCount: number;
  createdAt: string;
};

type PickedPeak = {
  id: string;
  name: string;
  altitudeM: number;
  mountainRange: string | null;
  country: string | null;
};

type SearchPeak = PickedPeak & { comarca: string | null };

/** Locales the app ships. "es" is the base text stored in name/description. */
const LOCALES = [
  { code: "es", label: "Español (base)" },
  { code: "ca", label: "Català" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
] as const;
type LocaleCode = (typeof LOCALES)[number]["code"];
type Translations = Partial<Record<string, { name?: string | null; description?: string | null }>>;

type EditorState = {
  id: string | null; // null = creating
  name: string;
  description: string;
  translations: Translations;
  sortOrder: number;
  isActive: boolean;
  coverUrl: string | null;
  peaks: PickedPeak[];
};

const EMPTY_EDITOR: EditorState = {
  id: null, name: "", description: "", translations: {}, sortOrder: 0, isActive: true, coverUrl: null, peaks: [],
};

export function ChallengesClient() {
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ChallengeRow | null>(null);

  /**
   * `showSpinner` only on the very first load. Refreshes after a toggle/save/delete keep
   * the current rows on screen — otherwise the whole table blanks out for a beat on every
   * single-row action. Same load() vs refresh() distinction used elsewhere in the app.
   */
  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch("/api/admin/challenges");
      const data = await res.json();
      setChallenges(data.challenges ?? []);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  async function openEditor(row?: ChallengeRow) {
    setError(null);
    if (!row) { setEditor({ ...EMPTY_EDITOR }); return; }
    const res = await fetch(`/api/admin/challenges/${row.id}`);
    const data = await res.json();
    const c = data.challenge;
    setEditor({
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      translations: c.translations ?? {},
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      coverUrl: c.coverUrl,
      peaks: c.peaks,
    });
  }

  async function save() {
    if (!editor) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: editor.name,
        description: editor.description || null,
        translations: editor.translations,
        sortOrder: editor.sortOrder,
        isActive: editor.isActive,
        peakIds: editor.peaks.map((p) => p.id),
      };
      const res = editor.id
        ? await fetch(`/api/admin/challenges/${editor.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/challenges", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar");
        return;
      }
      setEditor(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: ChallengeRow) {
    await fetch(`/api/admin/challenges/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !row.isActive }),
    });
    load();
  }

  async function doDelete() {
    if (!confirmDelete) return;
    await fetch(`/api/admin/challenges/${confirmDelete.id}`, { method: "DELETE" });
    setConfirmDelete(null);
    load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Retos</h1>
          <p className="page-subtitle">
            Listas curadas de cimas. El usuario solo puede unirse o abandonar — no las crea.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openEditor()}>+ Nuevo reto</button>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">Cargando…</div>
          ) : challenges.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏔</div>
              Todavía no hay ningún reto. Crea el primero con “+ Nuevo reto”.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Slug</th>
                  <th style={{ textAlign: "right" }}>Cimas</th>
                  <th style={{ textAlign: "right" }}>Participantes</th>
                  <th style={{ textAlign: "right" }}>Orden</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {challenges.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      {c.description && (
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          {c.description}
                        </div>
                      )}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                      {c.slug}
                    </td>
                    <td style={{ textAlign: "right" }}>{c.totalPeaks}</td>
                    <td style={{ textAlign: "right" }}>{c.participantCount}</td>
                    <td style={{ textAlign: "right" }}>{c.sortOrder}</td>
                    <td>
                      <button
                        className={`badge ${c.isActive ? "badge-success" : "badge-neutral"}`}
                        onClick={() => toggleActive(c)}
                        style={{ cursor: "pointer", border: "none" }}
                        title={c.isActive ? "Desactivar (deja de ofrecerse)" : "Activar"}
                      >
                        {c.isActive ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn" onClick={() => openEditor(c)}>Editar</button>
                        <button
                          className="action-btn"
                          onClick={() => setConfirmDelete(c)}
                          style={{ color: "var(--danger, #dc2626)" }}
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editor && (
        <ChallengeEditor
          state={editor}
          setState={setEditor}
          onSave={save}
          onCancel={() => setEditor(null)}
          saving={saving}
          error={error}
        />
      )}

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Borrar “{confirmDelete.name}”</h2>
            <p className="modal-body">
              Se borrará el reto y la participación de {confirmDelete.participantCount} usuario(s).
              Las ascensiones no se tocan. Si solo quieres retirarlo, desactívalo en vez de borrarlo.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={doDelete}>Borrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Editor ────────────────────────────────────────────────────────────────────

function ChallengeEditor({
  state, setState, onSave, onCancel, saving, error,
}: {
  state: EditorState;
  setState: (s: EditorState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [lang, setLang] = useState<LocaleCode>("es");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchPeak[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uploading, setUploading] = useState(false);

  // Peak search reuses the existing admin peaks endpoint — debounced, no new API needed.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/peaks?q=${encodeURIComponent(q)}&limit=20`);
        const data = await res.json();
        setResults(data.peaks ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  /** Spanish writes the base columns; any other locale writes into `translations`. */
  function setLangField(field: "name" | "description", value: string) {
    if (lang === "es") {
      setState({ ...state, [field]: value });
      return;
    }
    setState({
      ...state,
      translations: { ...state.translations, [lang]: { ...state.translations[lang], [field]: value } },
    });
  }

  const pickedIds = new Set(state.peaks.map((p) => p.id));

  function addPeak(p: SearchPeak) {
    if (pickedIds.has(p.id)) return;
    setState({ ...state, peaks: [...state.peaks, p].sort((a, b) => b.altitudeM - a.altitudeM) });
  }

  function removePeak(id: string) {
    setState({ ...state, peaks: state.peaks.filter((p) => p.id !== id) });
  }

  async function uploadCover(file: File) {
    if (!state.id) return; // cover upload needs an existing challenge id
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/challenges/${state.id}/cover`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setState({ ...state, coverUrl: data.coverUrl });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640, maxHeight: "85vh", overflowY: "auto" }}
      >
        <h2 className="modal-title">{state.id ? "Editar reto" : "Nuevo reto"}</h2>

        {/* Name + description per language. "es" writes the base columns, which every
            other locale falls back to, so a challenge works with only Spanish filled in. */}
        <div className="form-group">
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {LOCALES.map((l) => {
              const active = lang === l.code;
              const filled = l.code === "es"
                ? !!state.name.trim()
                : !!state.translations[l.code]?.name?.trim();
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  style={{
                    padding: "5px 11px", borderRadius: 999, cursor: "pointer", fontSize: 12,
                    fontWeight: 600,
                    border: `1px solid ${active ? "#2563eb" : "var(--border)"}`,
                    background: active ? "#eff6ff" : "transparent",
                    color: active ? "#1d4ed8" : "var(--text-muted)",
                  }}
                >
                  {l.label}{filled && l.code !== "es" ? " ✓" : ""}
                </button>
              );
            })}
          </div>

          <label className="form-label">Nombre {lang !== "es" && `(${lang})`}</label>
          <input
            className="form-input"
            value={lang === "es" ? state.name : (state.translations[lang]?.name ?? "")}
            onChange={(e) => setLangField("name", e.target.value)}
            placeholder={lang === "es" ? "Els 3000 del Pirineu" : `Nombre en ${lang} — vacío usa el texto base`}
          />

          <label className="form-label" style={{ marginTop: 12 }}>
            Descripción {lang !== "es" && `(${lang})`}
          </label>
          <input
            className="form-input"
            value={lang === "es" ? state.description : (state.translations[lang]?.description ?? "")}
            onChange={(e) => setLangField("description", e.target.value)}
            placeholder={lang === "es" ? "Subtítulo que se ve en la card de Disponibles" : "Vacío usa el texto base"}
          />

          {lang !== "es" && (
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "8px 0 0" }}>
              Lo que dejes vacío se muestra en español.
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
          <div className="form-group" style={{ flex: "0 0 120px" }}>
            <label className="form-label">Orden</label>
            <input
              className="form-input"
              type="number"
              value={state.sortOrder}
              onChange={(e) => setState({ ...state, sortOrder: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={state.isActive}
                onChange={(e) => setState({ ...state, isActive: e.target.checked })}
              />
              Activo (se ofrece en “Disponibles”)
            </label>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Portada (opcional)</label>
          {state.id ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {state.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={state.coverUrl}
                  alt=""
                  style={{ width: 84, height: 56, objectFit: "cover", borderRadius: 6 }}
                />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); }}
              />
              {uploading && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Subiendo…</span>}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Guarda el reto primero y luego edítalo para subir la portada. Sin portada se usa un degradado.
            </p>
          )}
        </div>

        {/* ── Peak picker ── */}
        <div className="form-group">
          <label className="form-label">Cimas del reto ({state.peaks.length})</label>
          <input
            className="form-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cima del catálogo para añadir…"
          />
          {query.trim().length >= 2 && (
            <div style={{
              border: "1px solid var(--border)", borderRadius: 8, marginTop: 6,
              maxHeight: 180, overflowY: "auto",
            }}>
              {searching ? (
                <div style={{ padding: 10, fontSize: 13, color: "var(--text-muted)" }}>Buscando…</div>
              ) : results.length === 0 ? (
                <div style={{ padding: 10, fontSize: 13, color: "var(--text-muted)" }}>Sin resultados</div>
              ) : (
                results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addPeak(p)}
                    disabled={pickedIds.has(p.id)}
                    style={{
                      display: "flex", width: "100%", gap: 8, alignItems: "baseline",
                      padding: "7px 10px", background: "none", border: "none",
                      borderBottom: "1px solid var(--border)", textAlign: "left",
                      cursor: pickedIds.has(p.id) ? "default" : "pointer",
                      opacity: pickedIds.has(p.id) ? 0.45 : 1,
                      color: "var(--text-primary)",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                      {p.altitudeM} m
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                      {p.mountainRange ?? p.comarca ?? p.country ?? ""}
                    </span>
                    {pickedIds.has(p.id) && <span style={{ fontSize: 12 }}>✓</span>}
                  </button>
                ))
              )}
            </div>
          )}

          {state.peaks.length > 0 && (
            <div style={{
              marginTop: 10, border: "1px solid var(--border)", borderRadius: 8,
              maxHeight: 220, overflowY: "auto",
            }}>
              {state.peaks.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex", gap: 8, alignItems: "baseline",
                    padding: "6px 10px", borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                    {p.altitudeM} m
                  </span>
                  <button
                    onClick={() => removePeak(p.id)}
                    style={{
                      marginLeft: "auto", background: "none", border: "none", cursor: "pointer",
                      color: "var(--text-muted)", fontSize: 15, lineHeight: 1,
                    }}
                    title="Quitar del reto"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p style={{ color: "var(--danger, #dc2626)", fontSize: 13, margin: "0 0 12px" }}>{error}</p>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={onSave}
            disabled={saving || !state.name.trim() || state.peaks.length === 0}
          >
            {saving ? "Guardando…" : state.id ? "Guardar cambios" : "Crear reto"}
          </button>
        </div>
      </div>
    </div>
  );
}
