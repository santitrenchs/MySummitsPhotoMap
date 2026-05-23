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
