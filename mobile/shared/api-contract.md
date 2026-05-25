# Peakadex API v1 — Mobile Contract

Base URL: `https://www.peakadex.com/api/v1`
Auth: `Authorization: Bearer <jwt>` (JWT válido 30 días, HS256)

## Endpoints

### Auth
- `POST /auth/login` — `{ email, password }` → `{ token, user }`
- `POST /auth/register` — `{ name, email, password, voucherCode? }` → `{ token, user }`
- `POST /auth/forgot-password` — `{ email }`
- `POST /auth/reset-password` — `{ token, password }`
- `POST /auth/validate-voucher` — `{ code }` → `{ valid }`

### Usuario
- `GET /me` → perfil del usuario autenticado
- `GET /settings` → configuración del usuario
- `PATCH /settings` — actualizar campos de perfil
- `POST /settings/password` — cambiar contraseña
- `POST /settings/avatar` — subir avatar (multipart/form-data)

### Ascensiones
- `GET /ascents` → lista de ascensiones del usuario
- `POST /ascents` — crear ascensión
- `GET /ascents/:id` → detalle
- `PATCH /ascents/:id` — editar
- `DELETE /ascents/:id` — eliminar

### Fotos
- `POST /photos/upload` — subir foto (multipart/form-data)
- `DELETE /photos/:id`
- `GET /photos/:id/persons` → personas etiquetadas
- `POST /photos/:id/persons` — añadir etiqueta manual
- `DELETE /photos/:id/persons/:personId`

### Picos
- `GET /peaks?q=&lat=&lng=&bbox=` → búsqueda / por viewport
- `GET /peaks/:id` → detalle

### Home & Feed
- `GET /home` → datos del dashboard (stats, niveles, leaderboard, ascensiones recientes)
- `GET /feed` → actividad de amigos
- `POST /feed/seen` — marcar items como vistos

### Social
- `GET /friends` → lista de amigos
- `POST /friends` — enviar solicitud
- `PATCH /friends/:id` — aceptar solicitud
- `DELETE /friends/:id` — eliminar amistad
- `GET /users/search?q=` → buscar usuarios
- `GET /persons` → personas etiquetadas (self + amigos)

### Invitaciones
- `GET /invitations` → invitaciones enviadas
- `POST /invitations` — invitar por email

### Config (público, sin auth)
- `GET /config` → `{ RARITIES, LEVEL_DEFS }` — cache 1h CDN
  Single source of truth para constantes — nunca hardcodear en la app

## Pendiente
- `POST /devices` — registrar token APNs para push notifications
