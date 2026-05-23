# Share & OG Image

## Flujo de compartir

1. Usuario tapa share en una `AscentCard` (solo variante `profile`).
2. **Mobile** con `navigator.share`: abre el share sheet nativo iOS con `{ url, title: "Peakadex" }`. `navigator.share()` se llama **síncronamente** (sin await previo) para preservar la cadena de gestos iOS.
3. **Desktop**: popover con dos acciones:
   - **WhatsApp** → `https://wa.me/?text={url}`
   - **Copiar enlace** → copia solo la URL al clipboard
4. Share URL: `${APP_URL}/ascent/{ascentId}?lang={locale}`

## OG metadata (`app/ascent/[id]/page.tsx`)

- `title`: `${user.name} ha capturado ${peak.name}`
- `description`: `Altitud: ${altitudeM} m · Rareza: ${rarityLabel}`

## Share page (`app/ascent/[id]/page.tsx`)

Página pública (sin auth). Renderiza una card con:

- Fondo `#EDEEF0`
- Logo Peakadex arriba
- Card max-width 400px, blanca, `borderRadius: 20px`
  - Header: avatar + nombre + fecha + botón "Join Peakadex" (top-right, verde `#2F7A5F`)
  - Foto con `padding: "0 12px 12px"`, inner `borderRadius: 16` — borde blanco via padding wrapper
  - Gradient overlay oscuro en la foto (bottom)
  - Watermark top-left: `peak [icon] adex` en blanco
  - Badge Mythic top-right (si `isMythic`)
  - Peak name + route + coordenadas (`lat/lng`, NOT mountain range) al fondo
  - KPIs: 3-col grid con rareza / altitud / reward

**Formato de coordenadas:**
```tsx
`${Math.abs(peak.latitude).toFixed(4)}°${peak.latitude >= 0 ? "N" : "S"}`
` · `
`${Math.abs(peak.longitude).toFixed(4)}°${peak.longitude >= 0 ? "E" : "W"}`
```

## OG image (`app/api/og/[id]/route.ts`)

Sharp-based (NOT next/og). Cache in-memory (Map, 24h TTL, max 200 entries).

**Dimensiones**: 1080×1350px.

**Capas:**
1. Foto full-bleed (sharp resize cover)
2. Gradient oscuro (bottom 50%)
3. SVG overlay con opentype.js (sin fontconfig):
   - Nombre usuario (top-left, blanco, grande)
   - Fecha debajo del nombre
   - Nombre pico (bottom, grande bold)
   - Badge altitud (derecha del nombre)
   - Mountain range (debajo del nombre, más pequeño)
4. Watermark Peakadex (top-left) — icon PNG extraído del SVG + texto `peak`/`adex`

**Extracción del logo PNG desde SVG:**
```typescript
const LOGO_ICON_PNG = (() => {
  const svgContent = fs.readFileSync(path.join(process.cwd(), "public/logo-icon.svg"), "utf8");
  const match = svgContent.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
  return match ? Buffer.from(match[1], "base64") : null;
})();
```

**Tintado a blanco:**
```typescript
for (let i = 0; i < data.length; i += 4) {
  data[i] = 255; data[i+1] = 255; data[i+2] = 255;
  data[i+3] = Math.round(data[i+3] * logoOpacity);
}
```

## Archivos clave

| Archivo | Rol |
|---|---|
| `app/ascent/[id]/page.tsx` | Share page pública + OG metadata |
| `app/api/og/[id]/route.ts` | Generación OG image con Sharp |
| `lib/services/public-ascent.service.ts` | `getPublicAscent(id)` |
| `components/ascents/AscentCard.tsx` | Share button + popover |
