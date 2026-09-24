# Retos en Android — auditoría y plan de port

Estado: **Fases 1, 2, 3 y 6 hechas** · Auditoría del 2026-09-24 contra `develop`.

La funcionalidad de Retos existe solo en web. Este documento audita lo que hay y
define los pasos para llevarla a Android.

---

## Auditoría

### Lo que ya está hecho y se reutiliza tal cual

`lib/services/challenge.service.ts` (699 líneas, 24 tests) contiene **toda** la
lógica de negocio y no necesita cambios:

| Función | Devuelve |
|---|---|
| `listChallenges(userId, locale)` | `{ mine, available }` |
| `getChallengeDetail(id, userId, locale)` | `ChallengeDetail \| null` |
| `getChallengeMapPeaks(id, userId, locale)` | `{ id, name, peaks }` |
| `joinChallenge(userId, id)` / `leaveChallenge(...)` | `void`, idempotentes |

Todas reciben `userId` y `locale` como parámetros, así que sirven igual a web y
a móvil. **Android no necesita lógica nueva de negocio.**

### El bloqueante

De las 39 rutas de `app/api/v1/`, **ninguna** toca retos. Las de web
(`app/api/challenges/*`) usan `auth()` de NextAuth, que Android no puede
consumir: el móvil va con Bearer JWT vía `getV1Session(req)`.

### Superficie web a portar

| Componente | Líneas |
|---|---|
| `components/bitacora/ChallengeDetailClient.tsx` | 685 |
| `components/bitacora/AvailableChallengesSheet.tsx` | 263 |
| `components/bitacora/ChallengesTab.tsx` | 214 |
| `components/map/MapChallengeFilter.tsx` | 205 |
| `components/map/ChallengePatch.tsx` | 111 |

Más **35 claves i18n** (`challenges_*`) × 5 locales.

Especificación visual: `DESIGN.md → "Retos — Web (listado y detalle)"`.

### Dos cosas que CLAUDE.md no documenta

- **`ChallengeTranslations` / `parseTranslations`**: los retos llevan nombre y
  descripción traducidos por locale, así que el servidor necesita saber en qué
  idioma responder. Android no manda `Accept-Language`; resuelto en la fase 1 —
  ver "Idioma" en Decisiones.
- **`getPeakChallengeIndex` + `/api/challenges/peak-index`**: alimenta las
  páginas SEO de cimas (`app/peaks/[slug]/PeakChallenges.tsx`). Fuera de alcance
  móvil.

### Estado de Android

Cero: ni un modelo, ni un endpoint, ni una pantalla. Bitácora tiene 3 pestañas
(Cimas / Fotos / Etiquetado); web tiene 4, con Retos en segunda posición.

---

## Decisiones tomadas

**Alcance por entregas.** El Atlas por retos (fase 5) es separable y se decide
con el resto ya funcionando. `AtlasScreen.kt` son 2.951 líneas y su modelo de
viewport (`peaksCache`, `applyViewportScore`, `onMapIdle`) **no se parece al de
web**: no es un port, es un diseño nuevo.

**Idioma: `Accept-Language` primero, `User.language` de respaldo** —
`lib/api-v1/locale.ts`. El orden es el contrario del que parece obvio: la
cabecera dice lo que el cliente está pintando **ahora**, mientras que la
preferencia guardada solo dice lo que era la última vez que el usuario la cambió
dentro de la app. En Android 13+ el idioma por app se puede cambiar desde los
ajustes del sistema, y eso nunca llega a `PATCH /api/v1/settings`.

Android no manda la cabecera hoy (OkHttp no añade ninguna), así que en la
práctica cae a `User.language`, que la app sí mantiene al día con `saveLanguage`.
Añadir la cabecera al interceptor más adelante es una línea y no toca el servidor.

---

## Fases

### Fase 1 · API v1 — ✅ hecha

Cuatro rutas finas sobre el servicio existente, más `lib/api-v1/locale.ts`:

| Ruta | Método | Devuelve |
|---|---|---|
| `v1/challenges` | GET | `{ mine, available }` |
| `v1/challenges/[id]` | GET | `{ challenge }` |
| `v1/challenges/[id]/join` | POST / DELETE | `{ ok: true }` |
| `v1/challenges/[id]/map` | GET | `{ challenge }` — solo si entra la fase 5 |

Reglas que web ya cumple y hay que replicar:

- **`userId` siempre del JWT**, nunca del body ni de la query. Ni en `join` (o
  cualquiera podría apuntar a terceros) ni en el detalle (`?userId=` filtraría el
  historial de otro).
- **`isActive` se filtra de forma asimétrica**: `available` solo activos; `mine`
  todos, o retirar un reto haría desaparecer el progreso de quien ya estaba.
- **`join` valida `isActive`**, para que un id filtrado de un listado viejo no
  sirva.
- **404 en vez de 403** para reto inexistente o inactivo-no-unido: su existencia
  no se confirma a quien adivina ids.
- **Nunca devolver `String(err)`** al cliente; loguear en servidor y responder
  `Internal server error`.

Documentadas en `docs/api-v1.md → Retos`.

**Verificado contra la API real** (sesión de staging, 2026-09-24): las cinco
rutas devuelven 401 sin auth; la lista da `mine`/`available` con progreso; el
detalle trae 239 cimas con `done`; el mapa las mismas 239 con coordenadas; `join`
y `leave` responden 200 y son idempotentes, dejando el estado como estaba
(`mine` 2 → 3 → 2); un id inexistente da 404; y la cadena de idioma funciona —
cabecera `es` → "Los 3000 de Buyse", `fr` → "Les 3000 de Buyse", cabecera no
soportada → cae a `User.language`.

Dato para la fase 2: **`lastAscentDate` llega como `"2026-06-05T00:00:00.000Z"`**,
un String ISO. En Kotlin es `String?`, nunca `Date`.

### Fase 2 · Modelos + Retrofit — ✅ hecha

9 `@Serializable` en `core/model/Models.kt` (`ChallengeSummary`,
`ChallengeAvailable`, `ChallengesResponse`, `ChallengePeakRow`,
`ChallengeDetail`, `ChallengeDetailResponse`, `ChallengeMapPeak`,
`ChallengeMap`, `ChallengeMapResponse`) y 5 métodos en `ApiService`.

Trampas del proyecto, todas contempladas:
- **Respuestas envueltas**: `{ challenge }` va contra `ChallengeDetailResponse`,
  nunca contra el modelo directo.
- `lastAscentDate` es **`String?`** — llega como `"2026-06-05T00:00:00.000Z"`.
- Todo campo omitible lleva **valor por defecto**.

**`ChallengeSerializationTest`** (`app/src/test/.../core/model/`) deserializa
**capturas literales de la API** — 5 tests, todos en verde. Existe porque en este
proyecto la deserialización de Kotlinx **falla en silencio**: un default que falta
o un wrapper olvidado no rompen la compilación, la pantalla simplemente sale
vacía. Compilar no demuestra nada. Cubre la lista, el detalle con una cima hecha
y una pendiente, las cimas del mapa, los campos desconocidos (el `rarity` anidado
que el modelo ignora) y los ausentes.

⚠️ Es el **primer test de Android del repo** y **CI no lo ejecuta**: el workflow
solo corre `tsc`, `check-i18n`, vitest y ESLint, nada de Gradle. Hay que lanzarlo
a mano con `./gradlew testDebugUnitTest`, o añadir un job.

⚠️ Al escribir KDoc en Kotlin, **una barra seguida de asterisco abre un comentario
anidado** y deja el bloque sin cerrar. Escribir `v1/challenges/` con un comodín
dentro de un KDoc rompe la compilación con un "Unclosed comment" a 100 líneas de
distancia.

### Fase 3 · Tab "Retos" en Bitácora — ✅ hecha

`feature/challenges/ChallengesTab.kt` + `ChallengesViewModel.kt`. Cuarta pestaña
en segunda posición (Cimas · Retos · Fotos · Etiquetado), con `PeakSearchField`
compartido y CTA verde que abre la hoja "Retos disponibles".

**Verificado en emulador contra staging**: la lista carga los retos reales con su
progreso; la barra sale **segmentada en 8 muescas** para "Els 3000 del Piriney" y
**lisa** para "Buyse's 3000ers" (239 cimas); la hoja muestra los ya unidos
marcados en vez de esconderlos; y el reto sin chapa cae a su círculo con inicial.

`progressPct` se portó a Kotlin desde `lib/progress-pct.ts` con su regla: nunca
redondear a una cifra que contradiga la fracción de al lado. Visible en la
captura — 5/239 es **2%**, no 0%.

**El join optimista necesita recargar después.** Al unirse a "Miradors de
Barcelona" la pantalla mostró **1/3 · 33%**, no 0/3: el usuario ya tenía una de
sus cimas subida de antes. El progreso de un reto recién unido no es cero, porque
se calcula desde las ascensiones que ya existen. El estado optimista pone 0 solo
para el primer frame y la recarga trae la cifra real.

### Fase 4 · Detalle del reto

Ruta a pantalla completa en el navController **externo**, como
`CordadaDetailRoute` — pierde la barra inferior, que es lo correcto en un
drill-down.

- Cabecera: parche 76dp + nombre + descripción (2 líneas) + barra con `%` a la
  derecha + línea `27 / 150 · 123 pendientes` con `MÁS ALTA` empujado a la derecha.
- **"Tu colección"**: mosaico 4:5, 3 columnas, insignia de rareza arriba a la
  izquierda, nombre y altitud sobre el degradado.
- **"Pendientes"**: filas de 40dp separadas por 1px — flor de rareza · nombre ·
  cordillera · altitud a la derecha. Una sola columna.
- Tap en fila pendiente → `NewAscentSheet` con la cima preseleccionada.
- Hoja de filtros: **Estado** (Todos/Hechos/Pendientes) + **Ordenar por**.

Detalles fáciles de perder:
- La barra de progreso va **segmentada hasta 30 cimas** y lisa por encima.
  **Nunca con tirador**: parece un slider en una barra que no hace nada al tocarla.
- El orden por **Comarca / Cordillera solo aparece** si ese reto tiene ≥2 valores
  distintos. Están poblados en ~10% del catálogo y son null en todas las cimas de
  los retos reales.
- **La lista completa siempre**, nunca un "+N más". Los filtros ocultan, no truncan.

### Fase 5 · Reto en el Atlas *(separable)*

Congelar `peaksCache` al reto, saltar el fetch por viewport, desactivar el
culling, ocultar marcadores de cimas ajenas, encuadrar con `fitBounds`, chip navy
con progreso y ✕, y sección de retos **encima** de Rareza y Estado en el panel de
filtros (un reto es el *ámbito*, no un filtro más).

### Fase 6 · i18n — ✅ hecha (adelantada a la fase 3)

29 `<string>` + 6 `<plurals>` × 5 locales. Se hizo entera de una vez, incluidas
las claves de las fases 4 y 5, para no tocar cinco ficheros dos veces.

Los `{n,plural,=1{}other{s}}` de `lib/i18n` se convierten a `<plurals>` de
Android con `quantity="one"` / `"other"`, y los `{n}` a `%d` posicionales.
⚠️ Android trata la apóstrofe como carácter de control: hay que escaparla en
catalán ("Uneix-t'hi", "t'has") y francés ("l'Atlas", "l'ascension") o el build
falla.

### Fuera de alcance

Panel de admin, páginas SEO de cimas, subida de portadas.

---

## Unidades (metros / pies)

No es una fase: son reglas dentro de las fases 3, 4 y 5.

**La parte fácil ya está resuelta.** El servicio devuelve `altitudeM` y
`maxAltitudeM` como enteros **en metros** y las rutas v1 lo heredan: el servidor
nunca formatea, el cliente sí. Y `core/util/Units.kt` es **espejo 1:1** de
`lib/units.ts` — mismos cuatro nombres — con `UnitsState.current` como argumento
por defecto, así que en Android ni siquiera hay que pasar nada por props.

### Los tres sitios a portar

| Dónde | Web | Android |
|---|---|---|
| Cabecera "MÁS ALTA" | `formatAltitude(maxAltitudeM, u)` | `formatAltitude(challenge.maxAltitudeM)` |
| Tile de colección | `formatAltitude(peak.altitudeM, u)` | igual |
| Fila pendiente | `altitudeValue(...)` **+** `altitudeUnit(...)` | igual |

### Tres formas de hacerlo mal sin que dé error

1. **La fila de pendientes parte número y unidad en dos elementos** — el número
   en mono oscuro, la unidad en otro peso y color. Usar `formatAltitude` ahí
   pierde ese estilo. Es una de las tres formas que CLAUDE.md marca como
   indetectables: no hay ninguna `"m"` que grepear.
2. **Formatear en el composable, nunca en el ViewModel.** `UnitsState` es
   snapshot state y provoca recomposición, pero un `"3143 m"` ya formateado
   guardado en el estado del ViewModel no se entera de que el usuario cambió a
   pies. Es el fallo silencioso más probable del port.
3. **La ordenación se queda en metros.** `altitude_desc`/`asc` comparan
   `altitudeM` crudo. Rareza, nivel y comparaciones siempre métricas.

No llevan unidades: la tarjeta del tab (solo % y conteos), la barra de progreso y
la flor de rareza (`rarityId` viene del servidor).

### Pendiente de producto: unidad propia por reto

| Reto | Cifra redonda | En la otra unidad |
|---|---|---|
| Los catorcemiles de Colorado | 14.000 ft | 4.269 m |
| Los Munros de Escocia | 3.000 ft | 915 m |
| Los 3000 del Pirineo | 3.000 m | 9.843 ft |

Esas listas **están definidas en su unidad**: "catorcemil" y "Munro" *son* pies.
Un usuario en métrico abriendo Colorado ve `4269 m` y el *14* del nombre
desaparece.

**No se resuelve en este port** — sería un campo nuevo (`Challenge.displayUnits`)
a diseñar en web primero. Pero condiciona la fase 4: **centralizar el formateo de
altitud en un solo helper del detalle**, en vez de esparcir `formatAltitude` por
tres composables, hace que ese cambio futuro sea de una línea.

### Si entra la fase 5

El Atlas de Android etiqueta con `textField("{name}")` — **solo el nombre**, sin
altitud — así que hoy no tiene el problema del `altLabel` que sí tiene web. Si se
decide mostrar la altitud en la etiqueta del modo reto, hay que meter un
`altLabel` **ya formateado** en las propiedades del GeoJSON y **recalcularlo al
cambiar de unidad**: una expresión de estilo de maplibre no puede llamar a una
función por feature.

---

## Riesgo

Las fases 1-4 y 6 son mecánicas: el backend está probado y la UI tiene espejo
directo. **La fase 5 es la que puede triplicar su estimación**, porque tocar el
viewport del Atlas ya ha dado guerra antes y hacerlo mal degrada el mapa entero,
no solo los retos.
