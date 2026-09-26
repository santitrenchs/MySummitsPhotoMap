# Notificaciones push en Android — plan

Estado de partida auditado el 2026-09-25. **Está todo por hacer menos el proyecto
de Firebase**: `peakadex-7f545` existe, `google-services.json` está commiteado y
FCM viene activado de serie en cualquier proyecto de Firebase.

Lo que no existe:

| | Estado |
|---|---|
| Dependencia `firebase-messaging` | ❌ solo `analytics` y `crashlytics` |
| Permiso `POST_NOTIFICATIONS` / servicio en el manifiesto | ❌ nada |
| Código Android (`FirebaseMessaging`, `NotificationChannel`, …) | ❌ ni un fichero |
| Tabla de tokens de dispositivo | ❌ nada en `schema.prisma` |
| Endpoint de registro | ❌ no hay `app/api/v1/devices` |
| Envío desde el servidor | ❌ ninguna dependencia en `package.json` |

⚠️ **Los interruptores de Ajustes → Notificaciones que ya existen son solo de
correo.** `emailNotifications` y `activityNotifications` se consultan únicamente
para decidir si se manda un email. Quien los ve encendidos hoy no recibe ningún
push, porque no existen.

## Decisiones tomadas

**Eventos con push** — cuatro de los cinco que hoy mandan correo:

| Evento | Push | Email |
|---|---|---|
| Solicitud de amistad | ✅ | ✅ |
| Amistad aceptada | ✅ | ✅ |
| Invitación a cordada | ✅ | ✅ |
| Etiquetado en foto | ✅ | ✅ |
| Herencia de cordada | ❌ | ✅ |

La herencia se queda fuera a propósito: es un aviso de responsabilidad que
conviene leer entero, no una interrupción de tres líneas.

**Ajustes separados.** Un campo nuevo `pushNotifications`, independiente de
`emailNotifications`. Reutilizar `activityNotifications` dejaría sin push a quien
apagó el correo sin haberlo pedido nunca.

## El problema de arquitectura que hay que resolver primero

Los cuatro eventos se envían desde **nueve sitios**, duplicados entre las rutas de
web y las de v1:

```
solicitud de amistad   app/api/friendships/route.ts:47
                       app/api/v1/friends/route.ts:49
                       app/api/v1/invitations/resolve/route.ts:52
amistad aceptada       app/api/friendships/[id]/route.ts:43
                       app/api/v1/friends/[id]/route.ts:45
invitación a cordada   lib/services/cordada.service.ts:250
etiquetado en foto     app/api/photos/[id]/faces/route.ts:69
                       app/api/face-detections/[id]/tag/route.ts:34
                       app/api/v1/photos/[id]/persons/route.ts:85
```

Añadir el push en los nueve garantiza que con el tiempo se desincronicen: alguien
tocará una ruta y no su gemela. Ya pasó con `emailNotifications`, que durante
meses solo se respetaba en los emails de solicitud de amistad y no en los de
etiquetado.

**Fase 3 extrae un `notify.service.ts`** con una función por evento que decide a
la vez correo y push, y las nueve llamadas pasan a invocarla. Mismo patrón que
`account.service.ts`, que ya unificó el borrado de cuenta entre web y v1.

## Cuándo pedir el permiso

⚠️ Desde Android 13 `POST_NOTIFICATIONS` es un permiso en tiempo de ejecución, y
**el sistema solo deja preguntar una vez**. Denegado, la app ya no puede volver a
mostrar el diálogo: el usuario tendría que ir a los ajustes del sistema. En
Android 12 y anteriores se concede al instalar, así que el flujo tiene que
contemplar los dos casos.

**Momento elegido: justo después de que el usuario mande su primera solicitud de
amistad o su primera invitación a cordada.** Los cuatro eventos con push son
sociales y, todos, cosas que **contesta otra persona más tarde**. En ese instante
la propuesta es concreta y verificable — «te avisamos cuando responda» — y el
usuario acaba de demostrar intención social.

Descartado pedirlo al arrancar: es el error clásico, la gente deniega por reflejo
y se quema la única oportunidad.

Descartado también tras capturar la primera cima: es el momento de más emoción,
pero no explica por qué querrías un aviso, porque capturar no genera ninguno.

**Antes del diálogo del sistema va una hoja de explicación propia** (*priming*).
Si el usuario dice que no ahí, no se llega a lanzar el diálogo del sistema y la
bala queda sin gastar para más adelante.

**Y el interruptor de Ajustes es la puerta permanente**: cuando el permiso está
denegado a nivel de sistema, activarlo no puede mostrar el diálogo, así que abre
la pantalla de ajustes de la app. Un interruptor que no hace nada al pulsarlo es
peor que no tenerlo.

## Fases

### Fase 1 — Servidor: modelo y registro del token
- `DeviceToken`: `id`, `userId`, `token` (único), `platform` (`android`|`ios`),
  `createdAt`, `lastSeenAt`. Índice por `userId`.
- `POST /api/v1/devices` registra o refresca (upsert por token, `lastSeenAt`).
  **`userId` siempre del JWT**, nunca del cuerpo.
- `DELETE /api/v1/devices` al cerrar sesión, borrando solo ese token.
- ⚠️ **El esquema exige SQL manual**: `db push` está bloqueado en este proyecto.
  Sacar el `ALTER` con `prisma migrate diff`, comprobar que no lleva ningún `DROP`
  y aplicarlo con `psql` **antes** de desplegar el código que lo lee.

#### SQL de la fase 1 (generado, **sin aplicar**)

Sacado con `prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel
prisma/schema.prisma --script`. Comprobado: **no contiene ningún `DROP`**.

```sql
CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");
CREATE INDEX "device_tokens_userId_idx" ON "device_tokens"("userId");
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

⚠️ **Hay que aplicarlo antes de desplegar el código que lo lee**, o el endpoint
responde 500. Y conviene aplicarlo a la vez que el `pushNotifications` de la fase
3, para no repetir la operación manual.

### Fase 2 — Servidor: envío por FCM
- ⚠️ **La API legacy de FCM está apagada desde 2024.** Hay que usar HTTP v1, que
  se autentica con OAuth2 a partir de una **cuenta de servicio**, no con la vieja
  server key. Variable nueva en Railway con el JSON de la cuenta.
- `lib/services/push.service.ts` con `sendPush(userId, payload)`: busca los tokens
  del usuario, envía y **borra las filas que devuelvan `UNREGISTERED` o
  `INVALID_ARGUMENT`**. Sin esa limpieza la tabla crece sin límite y cada envío
  falla en silencio para siempre.
- Best-effort como el correo: un fallo de FCM no puede tumbar la acción que lo
  originó.
- ⚠️ Comprobar el error en el cuerpo de la respuesta, no solo el status. Es la
  misma trampa que con Resend, que responde 200 con el error dentro.

#### Estado de la fase 2 (hecha)

`lib/services/push.service.ts`. Credencial en `FIREBASE_SERVICE_ACCOUNT_B64`,
puesta **solo en Staging** hasta probar un envío real a un dispositivo.

Verificado contra Google, no solo con mocks: el intercambio OAuth2 devuelve 200 y
un envío a un token inventado responde **400 `INVALID_ARGUMENT`**, que es la
prueba de que la autenticación se acepta (un 401 sería credencial mala) y de que
`INVALID_ARGUMENT` es efectivamente lo que devuelve un token basura.

⚠️ El access token se cachea a nivel de módulo, con un minuto de margen antes de
expirar. Eso rompe el aislamiento entre tests: el fichero de pruebas importa el
módulo fresco en cada caso (`vi.resetModules()` + `await import`).

### Fase 3 — Servidor: unificar correo y push
- `lib/services/notify.service.ts`, una función por evento.
- Sustituir las nueve llamadas dispersas.
- Campo `pushNotifications` en `User` (`@default(true)`) — **segundo `ALTER`
  manual**, se puede aplicar junto al de la fase 1.
- Reglas: el correo sigue gobernado por `emailNotifications` +
  `activityNotifications`; el push, por `pushNotifications`. Independientes.

#### Estado de la fase 3 (hecha)

`lib/services/notify.service.ts`, una función por evento. Las **nueve** llamadas
dispersas pasan por ella; fuera de ese fichero no queda ni una llamada directa a
los cuatro envíos de correo.

Campo `pushNotifications` aplicado en staging
(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS ... DEFAULT true`) y expuesto en
`/api/settings` y `/api/v1/settings`. Los 10 usuarios de staging quedan con push
activado por defecto.

Gobierno de cada canal, conservando el del correo tal cual estaba:

| Evento | Correo | Push |
|---|---|---|
| Solicitud de amistad | `emailNotifications` | `pushNotifications` |
| Amistad aceptada | `emailNotifications` | `pushNotifications` |
| Invitación a cordada | `emailNotifications` | `pushNotifications` |
| Etiquetado en foto | `activityNotifications` **y** `emailNotifications` | `pushNotifications` |

El refactor dejó cuatro consultas e imports huérfanos —`findUnique` que ya no
leía nadie— y se limpiaron: eran round trips de verdad, no solo avisos de lint.

**Falta el interruptor en la interfaz**: el campo existe en la API pero Ajustes
de Android todavía no lo pinta. Es la fase 5. Web no lo lleva a propósito, porque
el push hoy es solo de Android.

### Fase 4 — Android: recibir
- Dependencia `firebase-messaging` al BOM que ya existe.
- `POST_NOTIFICATIONS` en el manifiesto + el servicio con
  `intent-filter MESSAGING_EVENT`.
- `PeakadexMessagingService`: `onNewToken` → registra contra el servidor;
  `onMessageReceived` → construye el aviso.
- Canales de notificación, obligatorios desde Android 8. Uno por categoría
  (social / etiquetado) para que se puedan silenciar por separado.
- Registrar el token al iniciar sesión y borrarlo al cerrarla.
- ⚠️ **R8**: `app/proguard-rules.pro:64` ya protege los `ComponentRegistrar` de
  Firebase, porque R8 en modo full borraba sus constructores y la app crasheaba al
  arrancar. Verificar que el registrar de messaging queda cubierto — **el fallo
  solo se ve en build de release**.

#### Estado de la fase 4 (hecha)

`core/push/`: `PeakadexMessagingService`, `NotificationChannels`,
`PushTokenRegistrar`. Endpoints Retrofit `registerDevice` / `unregisterDevice`.

**Probado de extremo a extremo en el emulador**: la app arranca, registra su
token en la tabla de staging, y dos envíos reales por FCM llegan a la bandeja
con el canal y la importancia correctos (`social` → 3 DEFAULT, `tags` → 2 LOW).

⚠️ **El permiso no se pide todavía**: `POST_NOTIFICATIONS` salía `granted=false`
e `importance=NONE`, y por eso el primer envío llegó a FCM pero no se mostró.
Para la prueba se concedió con `adb shell pm grant`. Pedirlo es la fase 5.

⚠️ **`kotlinx-coroutines-play-services` se declaró explícita.** Llegaba solo de
forma transitiva vía `credentials-play-services-auth`; cambiar aquella habría
roto el push con un `unresolved reference: await` que no señala a nada.

⚠️ **R8 verificado, no supuesto.** La regla comodín de `proguard-rules.pro` cubre
`FirebaseMessagingRegistrar`: comprobado buscándolo en el `classes.dex` del APK
de release ya minificado. **Ojo con `grep` sobre un `.dex`**: sin `-a` lo trata
como binario y calla en vez de reportar la coincidencia — eso me dio un falso
"ausente" en el primer intento.

### Fase 5 — Android: permiso y ajustes
- Hoja de *priming* tras la primera solicitud de amistad o invitación a cordada.
- Diálogo del sistema solo si el usuario acepta el priming.
- Interruptor nuevo en Ajustes → Notificaciones, con salida a los ajustes del
  sistema cuando el permiso está denegado.
- Sin el permiso concedido, no registrar token: evita filas que nunca entregarán.

#### Estado de la fase 5 (hecha)

`PushPermission` + `PushPrimingSheet`, alojada en `MainScaffold` para que pueda
aparecer sobre cualquier pestaña. Se dispara desde `FriendsViewModel` tras la
primera solicitud de amistad o invitación enviada, una sola vez.

La marca de «ya se enseñó» se pone **acepte o no**: insistir tras un «ahora no»
es lo que convierte un permiso en una molestia. Queda el interruptor de Ajustes.

El interruptor tiene dos formas, y las dos se verificaron en el emulador:

| Permiso | Fila |
|---|---|
| concedido | interruptor real, ligado a `pushNotifications` |
| denegado | enlace con chevron → abre los ajustes del sistema |

Se relee en cada `ON_RESUME`, porque el usuario puede ir a los ajustes del
sistema y volver. El interruptor persiste: comprobado `t → f → t` contra la base
de datos de staging.

⚠️ **La hoja de priming no se ha visto en pantalla.** Dispararla exige una
solicitud de amistad real, que crea datos y manda un correo a una persona. Las
dos ramas del interruptor sí se verificaron. Queda como comprobación manual.

Al conceder el permiso desde la hoja se registra el token en ese momento: antes
no se registraba, porque un token sin permiso solo sirve para gastar envíos que
el sistema descarta en silencio.

### Fase 6 — Android: abrir donde toca
- Al tocar la notificación, abrir la pantalla del evento: Cordada para las
  solicitudes e invitaciones, la carta para el etiquetado.
- `data` en el mensaje FCM con el destino; `MainActivity` lo interpreta.

#### Estado de la fase 6 (hecha)

`PushNavigation` + `PushDestination`. `MainActivity` lee los extras y
`MainScaffold` navega.

⚠️ **Dos caminos para el mismo intent, y los dos hacen falta**:

| Estado de la app | Quién construye el aviso | Por dónde llega |
|---|---|---|
| primer plano | `PeakadexMessagingService` | `onNewIntent` |
| segundo plano o cerrada | **el sistema**, `onMessageReceived` no corre | `onCreate` |

⚠️ `MainActivity` pasa a `launchMode="singleTask"`. Con el `standard` de antes,
`CLEAR_TOP|SINGLE_TOP` no garantizaba `onNewIntent` y podía apilarse una Activity
nueva encima.

⚠️ Los extras se limpian tras leerlos: sin eso, una rotación de pantalla
reentrega el mismo intent y la app vuelve a saltar al destino con el usuario ya
en otro sitio.

Verificado tocando notificaciones de verdad en el emulador, con la app en
segundo plano (o sea, el camino del aviso construido por el sistema):

| `data.screen` | Abre en |
|---|---|
| `friends` | pestaña Rope Team ✓ |
| `card` | pestaña Cards ✓ |
| `cordada` | mismo mecanismo + un `navigate` al navController externo — **no probado por separado** |

De paso quedó confirmado que el canal `tags` aterriza en la sección **Silent** de
la bandeja, que es lo que se buscaba con `IMPORTANCE_LOW`.

### Fase 7 — Verificación (hecha)

**El circuito completo funciona desde una acción real**, no solo por piezas. Se
mandó una solicitud de amistad de verdad contra la API de staging, firmando un
JWT para una cuenta de prueba (`testonboarding1`), y el push llegó al emulador:
`POST /api/v1/friends` → `sendFriendRequest` → `notifyFriendRequest` →
`sendPush` → FCM → dispositivo, en el canal `social` y en el idioma del
destinatario.

⚠️ **Y destapó un fallo real de privacidad.** El aviso decía
*"testpdx1@mailinator.com wants to be your friend"*: el correo de quien manda,
enseñado a alguien que todavía no le conoce. Eran dos cosas sumadas — el
`name ?? email` de amistades caía al correo, y el registro copia el correo
**también** en `name`. La invitación a cordada ya lo hacía bien, así que
convivían dos criterios para lo mismo. Arreglado moviendo la decisión dentro de
`notify.service`, que recibe el id y resuelve el nombre. Ver `a95dadd`.

Esto es lo que justifica la fase: las piezas estaban todas verdes y el defecto
solo aparecía al recorrer el circuito entero con datos reales.

**Sin probar todavía**, por necesitar condiciones que no se dan en el emulador:

- Token borrado al cerrar sesión (hace falta volver a entrar, y no tengo
  credenciales).
- `pushNotifications` apagado → llega el correo y no el push.
- Desinstalar → el token se purga al primer envío fallido (`UNREGISTERED`).
- El destino `cordada` de una notificación tocada.
- La hoja de priming en pantalla.

## Fuera de alcance

- **iOS/APNs**: el mismo `DeviceToken` sirve (`platform`), pero el envío y el
  cliente son otro trabajo.
- **Web push**: no se contempla.
- **Agrupar o silenciar por remitente**: más adelante, si molestan.
