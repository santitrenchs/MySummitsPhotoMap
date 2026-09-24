# API v1 — Mobile Layer

**Status**: implementada y mergeada en `develop` (staging) el 2026-05-09. Pendiente de mergear a `main` cuando se decida.

## Auth

- `lib/api-v1/auth.ts` — `getV1Session(req)`: lee `Authorization: Bearer <token>`, verifica JWT con `jose` (`jwtVerify`, HS256, firmado con `AUTH_SECRET`)
- Login devuelve JWT de 30 días via `SignJWT` de `jose` (NO `next-auth/jwt` — requeriría `salt`)
- Middleware `proxy.ts` excluye `/api/v1` del matcher de NextAuth para que no interfiera

## Endpoints

### Auth
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/validate-voucher`

### Usuario
- `GET /api/v1/me`
- `GET|PATCH /api/v1/settings`
- `POST /api/v1/settings/password`
- `POST /api/v1/settings/avatar`

### Ascensiones
- `GET|POST /api/v1/ascents`
- `GET|PATCH|DELETE /api/v1/ascents/[id]`

### Fotos
- `POST /api/v1/photos/upload`
- `DELETE /api/v1/photos/[id]`
- `GET|POST|DELETE /api/v1/photos/[id]/persons` — tagging manual, sin face detection

### Picos
- `GET /api/v1/peaks` — búsqueda por `q=` o viewport bounds
- `GET /api/v1/peaks/[id]`

### Home & Feed
- `GET /api/v1/home`
- `GET /api/v1/feed`
- `POST /api/v1/feed/seen`

### Social
- `GET|POST /api/v1/friends`
- `PATCH|DELETE /api/v1/friends/[id]`
- `GET /api/v1/users/search`
- `GET /api/v1/persons` — lista self + amigos aceptados para UI de tagging

### Invitaciones
- `GET|POST /api/v1/invitations`

### Retos
- `GET /api/v1/challenges` — `{ mine, available }`. `mine` lleva progreso e incluye
  los retirados (ocultarlos haría desaparecer el progreso de quien ya estaba);
  `available` solo los activos, con `isJoined` para pintarlos marcados en vez de
  esconderlos.
- `GET /api/v1/challenges/[id]` — `{ challenge }` con las cimas y su estado
  hecho/pendiente **para el usuario del token**. 404 si no existe o si está
  inactivo y el usuario nunca se unió: su existencia no se confirma a quien
  adivina ids.
- `POST|DELETE /api/v1/challenges/[id]/join` — unirse / salir. **Idempotentes**
  las dos. Al salir no se borra progreso porque nunca se almacenó: se recalcula
  desde las ascensiones.
- `GET /api/v1/challenges/[id]/map` — `{ challenge: { id, name, peaks } }`, solo
  coordenadas, para acotar el Atlas a un reto. Sin paginar a propósito: un reto
  está limitado a 500 cimas al crearlo y el mapa las necesita todas para encuadrar.

**El `userId` sale siempre del JWT**, nunca del body ni de la query — ni en `join`
(permitiría apuntar a terceros) ni en el detalle (`?userId=` filtraría el
historial de otro usuario).

**Idioma**: `lib/api-v1/locale.ts` → `getV1Locale()`. Prioriza la cabecera
`Accept-Language` y cae a `User.language`. Los retos tienen nombre y descripción
traducidos, así que esto decide en qué idioma llegan. Android no manda la cabecera
hoy, así que usa `User.language`, que la app mantiene al día con `saveLanguage`.

⚠️ Plan del port a Android: `docs/retos-android.md`.

### Config (público, sin auth)
- `GET /api/v1/config` — devuelve `RARITIES` + `LEVEL_DEFS`, cache 1h CDN
- **Why:** single source of truth para iOS/Android — nunca hardcodear constantes en la app nativa

## Test script

`scripts/test-api-v1.sh` — ~40 tests, cubre todos los endpoints con edge cases.

```bash
./scripts/test-api-v1.sh [BASE_URL] [EMAIL] [PASSWORD]
```

## APNs (Push Notifications) — pendiente

Requiere:
- Tabla `DeviceToken` en DB
- `POST /api/v1/devices` para registrar token
- Función `sendPush(userId, title, body)` con `@parse/node-apn`
- APNs Key (.p8) en Apple Developer Portal
