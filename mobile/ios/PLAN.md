# Peakadex iOS — Plan de Desarrollo

> Plan por fases incremental. Cada fase produce código en producción,
> no prototipos. La lógica de negocio reside en la API — la app es UI + estado.

---

## Decisiones de arquitectura (inamovibles desde el inicio)

### Stack
| Capa | Tecnología | Motivo |
|---|---|---|
| UI | SwiftUI | Declarativo, Apple-first, sin deuda técnica |
| Estado | `@Observable` (Swift 5.9 / iOS 17+) | Reemplaza ObservableObject, más performante |
| Networking | `URLSession` + `async/await` | Sin dependencias externas, idiomático Swift 6 |
| Auth storage | `Keychain` (wrapper propio) | JWT nunca en UserDefaults |
| Imágenes | `Kingfisher` (SPM) | Cache de disco + memoria, lazy loading en listas |
| Mapas | `MapKit` (nativo) | Sin dependencias, integración con Apple Maps |
| Navegación | `NavigationStack` + `TabView` | NavigationPath para deep links |
| Inyección | `Environment` + inicializadores | Sin Singletons en Views |

### Patrón por feature
Cada feature sigue exactamente esta estructura — sin excepciones:
```
Features/Auth/
├── Views/          ← SwiftUI puro, sin lógica
├── ViewModels/     ← @Observable, llama a Services
└── Models/         ← structs Codable específicos del feature
```

### Dónde vive cada tipo de código
- **Reglas de negocio** → API (nunca duplicar en la app)
- **Transformaciones de datos para UI** → ViewModel
- **UI pura** → View (sin if/else de lógica de negocio)
- **Llamadas HTTP** → `APIClient` en Core/
- **Persistencia local** → solo JWT en Keychain + cache de imágenes

---

## Estructura de carpetas final

```
Peakadex/
├── PeakadexApp.swift
├── Core/
│   ├── API/
│   │   ├── APIClient.swift          ← URLSession wrapper, inyecta token
│   │   ├── APIError.swift           ← errores tipados
│   │   ├── Endpoint.swift           ← enum con todos los endpoints
│   │   └── Interceptors/
│   │       └── AuthInterceptor.swift
│   ├── Auth/
│   │   ├── AuthSession.swift        ← @Observable global, fuente de verdad del JWT
│   │   └── KeychainStorage.swift    ← wrapper seguro
│   ├── Models/                      ← structs Codable globales (Peak, Ascent, User...)
│   ├── Extensions/                  ← Color+tokens, View+helpers, Date+format
│   ├── Components/                  ← UI reutilizable (PeakadexButton, AsyncImage...)
│   └── Navigation/
│       └── AppRouter.swift          ← NavigationPath centralizado
│
├── Features/
│   ├── Auth/
│   ├── Home/
│   ├── Map/
│   ├── Logbook/
│   ├── NewAscent/
│   ├── AscentDetail/
│   ├── Social/
│   ├── Friends/
│   ├── Profile/
│   └── Settings/
│
└── Resources/
    ├── Assets.xcassets
    ├── Localizable.xcstrings        ← ca, es, en, fr, de
    └── Info.plist
```

---

## Fases de desarrollo

---

### FASE 0 — Cimientos (sin pantallas de usuario)
**Duración estimada: 3-4 días**
**Entregable: proyecto compilable con arquitectura completa pero sin UI final**

#### 0.1 Proyecto Xcode
- New Project → App → SwiftUI, iOS 17+, Swift 6
- Bundle ID: `com.peakadex.app`
- Guardar en `mobile/ios/`
- Añadir SPM: `Kingfisher` (imágenes)
- Configurar schemes: Debug / Staging / Production
- `.gitignore` para Xcode (xcuserdata, DerivedData)

#### 0.2 APIClient
```swift
// Core/API/APIClient.swift
// - baseURL configurable por scheme (staging vs production)
// - inyecta "Authorization: Bearer <token>" automáticamente
// - método genérico: func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T
// - maneja 401 → dispara logout en AuthSession
// - JSONDecoder con dateDecodingStrategy .iso8601
```

#### 0.3 Endpoint enum
```swift
// Todos los endpoints de /api/v1 como casos del enum
// Incluye: path, method, body, queryParams
// Ejemplo:
enum Endpoint {
  case login(email: String, password: String)
  case home
  case ascents(page: Int)
  case createAscent(body: CreateAscentBody)
  // ...
}
```

#### 0.4 AuthSession
```swift
// Core/Auth/AuthSession.swift
// @Observable class — inyectada en el environment desde PeakadexApp
// Propiedades: token: String?, currentUser: User?, isAuthenticated: Bool
// Métodos: login(), logout(), restoreFromKeychain()
// Al init: intenta restaurar token del Keychain
```

#### 0.5 Modelos globales
```swift
// Structs Codable que mapean exactamente las respuestas de /api/v1
struct User: Codable, Identifiable { ... }
struct Peak: Codable, Identifiable { ... }
struct Ascent: Codable, Identifiable { ... }
struct Photo: Codable, Identifiable { ... }
struct Friend: Codable, Identifiable { ... }
```

#### 0.6 Design tokens
```swift
// Core/Extensions/Color+Tokens.swift
extension Color {
  static let peakNavyDark = Color(hex: "#0D2538")
  static let peakGreenCTA = Color(hex: "#2F7A5F")
  static let peakBrandGreen = Color(hex: "#4A8C5C")
  // ...todos los tokens de shared/design-tokens.json
}
```

#### 0.7 NavigationShell vacío
- `TabView` con las 5 tabs (Home, Atlas, +, Logbook, Social)
- Tab central (+) abre sheet de nueva ascensión
- Cada tab muestra un placeholder `Text("Coming soon")`
- Compila y corre en simulador

**✅ Criterio de salida fase 0:** app corre en simulador, muestra tab bar, el APIClient puede hacer una llamada real a `/api/v1/config` y decodificar la respuesta.

---

### FASE 1 — Autenticación
**Duración estimada: 3-4 días**
**Entregable: flujo completo login → app, register, forgot password**

#### Pantallas
- `LoginView` — email + password + "Sign in with Apple" (futuro) + link registro
- `RegisterView` — name, email, password, voucher opcional
- `ForgotPasswordView` — email input
- `ResetPasswordView` — new password + confirm (se abre desde deep link)

#### ViewModel: AuthViewModel
```swift
@Observable class AuthViewModel {
  var email = ""
  var password = ""
  var isLoading = false
  var error: String?

  func login(session: AuthSession) async { ... }
  func register(session: AuthSession) async { ... }
  func forgotPassword() async { ... }
}
```

#### Flujo de navegación
```
App init
  → AuthSession.isAuthenticated?
      NO  → LoginView (NavigationStack)
              → RegisterView
              → ForgotPasswordView
      SÍ  → MainTabView
```

#### Best practices iOS a aplicar
- `@FocusState` para mover foco entre campos con teclado
- `submitLabel(.next)` / `submitLabel(.done)` en inputs
- `keyboardType(.emailAddress)` + `textContentType(.emailAddress)`
- `SecureField` con toggle show/hide
- Deshabilitar botón submit mientras `isLoading`
- Guardar token en Keychain en cuanto llega, nunca en memoria sola

**✅ Criterio de salida fase 1:** login real con credenciales de staging, token guardado en Keychain, al relanzar la app sin deslogear entra directo al tab bar.

---

### FASE 2 — Home (Mi Progreso)
**Duración estimada: 5-6 días**
**Entregable: dashboard completo con datos reales**

#### Pantallas
- `HomeView` — scroll vertical con todas las secciones

#### Secciones del HomeView (de arriba a abajo)
1. **Header** — avatar, nombre, settings button
2. **Hero card** — total ascensiones + distribución altitudinal
3. **KPIs secundarios** — fotos · regiones · amigos (3 columnas)
4. **Progresión de niveles** — nivel actual, siguiente, collapsed/expanded
5. **Leaderboard** — ranking de amigos con diff badges
6. **Banner de motivación** — gold/orange/green según posición
7. **Últimas cimas** — scroll horizontal de cards con foto
8. **Actividad de amigos** — feed mínimo
9. **Logros** — 7 badges con anillo de progreso SVG

#### ViewModel: HomeViewModel
```swift
@Observable class HomeViewModel {
  var homeData: HomeData?
  var isLoading = false
  var error: APIError?

  func load() async {
    // GET /api/v1/home
  }
}
```

#### Componentes reutilizables a construir en esta fase
- `LevelProgressRow` — fila de nivel con emoji, nombre, barra de progreso
- `StatBadge` — número grande + label pequeño
- `AchievementRing` — círculo SVG con progreso (se usará también en Profile)
- `AscentCardHorizontal` — card de foto en scroll horizontal
- `LeaderboardRow` — avatar + nombre + ascensiones + diff badge

#### Best practices iOS a aplicar
- `ScrollView` + `LazyVStack` para el scroll principal
- `refreshable` para pull-to-refresh
- `.task` modifier para cargar datos al aparecer la vista (no `onAppear`)
- Skeleton loading con `redacted(.placeholder)` mientras carga
- Secciones colapsables con `withAnimation(.spring)`

**✅ Criterio de salida fase 2:** HomeView muestra datos reales de staging, pull-to-refresh funciona, skeleton visible durante carga.

---

### FASE 3 — Logbook (Bitácora)
**Duración estimada: 4-5 días**
**Entregable: lista filtrable de ascensiones (propias + amigos) + detalle**

> **Lee `DESIGN.md` sección "Logbook Screen — Bitácora" antes de escribir una sola línea.** Toda la especificación visual y de comportamiento está allí. Esta sección cubre solo los detalles de implementación Swift/SwiftUI.

---

#### Archivos a crear

```
Features/Logbook/
├── Views/
│   ├── LogbookView.swift          ← pantalla principal (search bar + chips + lista)
│   ├── LogbookFilterSheet.swift   ← ModalBottomSheet con las 4 secciones
│   ├── AscentFlipCard.swift       ← card con flip animation (frente + dorso)
│   └── LogbookEmptyState.swift    ← 3 variantes de empty state
├── ViewModels/
│   └── LogbookViewModel.swift
└── Models/
    └── LogbookFilter.swift        ← enums + FilterState + applyFilters()
```

---

#### LogbookFilter.swift

```swift
enum ViewFilter  { case all, mine, friends }
enum TimeRange   { case all, month, year }
enum SortOrder   { case dateDesc, elevDesc }

struct LogbookFilterState {
    var search:     String     = ""
    var viewFilter: ViewFilter = .friends   // ← DEFAULT ES FRIENDS, nunca .all ni .mine
    var rarityId:   String?    = nil
    var mythic:     Bool       = false
    var timeRange:  TimeRange  = .all
    var sort:       SortOrder  = .dateDesc

    // Friends es la línea base — NO cuenta como "sucio"
    var isDirty: Bool {
        viewFilter != .friends || rarityId != nil || mythic || timeRange != .all || sort != .dateDesc
    }
}

// applyFilters() — filtrado puro, sin side effects
// SortOrder.dateDesc → devuelve el array tal cual (el servidor ya ordenó)
// SortOrder.elevDesc → sorted(by: { $0.peak.altitudeM > $1.peak.altitudeM })
func applyFilters(_ ascents: [Ascent], filters: LogbookFilterState) -> [Ascent]
```

---

#### LogbookViewModel.swift

```swift
@Observable class LogbookViewModel {
    // Estado de datos
    private(set) var allAscents:  [Ascent] = []
    private(set) var isLoading:   Bool = true
    private(set) var isRefreshing: Bool = false
    private(set) var error:       String? = nil

    // Estado de filtros (source of truth)
    var filters = LogbookFilterState()

    // Derivado: ascensiones filtradas + ordenadas (computed property)
    var filteredAscents: [Ascent] {
        applyFilters(allAscents, filters: filters)
    }

    func load() async { ... }      // GET /api/v1/ascents — sets isLoading
    func refresh() async { ... }   // pull-to-refresh — sets isRefreshing

    // Mutaciones de filtro
    func setSearch(_ q: String)      { filters.search = q }
    func setViewFilter(_ v: ViewFilter) { filters.viewFilter = v }
    func setRarityId(_ id: String?)  { filters.rarityId = id; filters.mythic = false }
    func setMythic(_ v: Bool)        { filters.mythic = v; filters.rarityId = nil }
    func setTimeRange(_ v: TimeRange){ filters.timeRange = v }
    func setSort(_ v: SortOrder)     { filters.sort = v }
    func clearFilters() {            // preserva search
        filters = LogbookFilterState(search: filters.search)
    }

    // mark-as-seen: llamar justo después de recibir datos en load()/refresh()
    private func markUnseenAsSeen(_ ascents: [Ascent]) async {
        let ids = ascents.filter { !$0.isOwn && $0.isUnseen }.map(\.id)
        guard !ids.isEmpty else { return }
        try? await Task.sleep(for: .seconds(3))
        try? await api.markFeedSeen(ascentIds: ids)   // POST /api/v1/feed/seen
        // fallo no crítico — ignora errores
    }
}
```

> **Importante**: `filteredAscents` es una computed property (no `@Published` separado). En SwiftUI, como `LogbookViewModel` es `@Observable`, cualquier cambio en `allAscents` o `filters` propagará automáticamente al view.

---

#### LogbookView.swift — estructura

```
VStack {
    SearchAndFilterBar(search, isDirty, activeFilterCount)
    if chips not empty → ActiveChipsRow(chips)
    if isLoading       → LoadingView (✿ cycling)
    else if error      → ErrorView + retry button
    else               → PullToRefresh { LogbookList or EmptyState }
}
.sheet(isPresented: $filtersOpen) { LogbookFilterSheet(...) }
```

Pull-to-refresh: `.refreshable { await vm.refresh() }` en el `ScrollView`.

---

#### AscentFlipCard.swift

```swift
struct AscentFlipCard: View {
    let ascent: Ascent
    let onDetailTap: () -> Void
    @State private var isFlipped = false

    var body: some View {
        ZStack {
            if isFlipped {
                CardBack(ascent: ascent, rarity: rarity)
                    .rotation3DEffect(.degrees(180), axis: (0, 1, 0))
            } else {
                CardFront(ascent: ascent, rarity: rarity, onDetailTap: onDetailTap)
            }
        }
        .rotation3DEffect(.degrees(isFlipped ? 180 : 0), axis: (0, 1, 0))
        .animation(.easeInOut(duration: 0.7), value: isFlipped)
        .onTapGesture { isFlipped.toggle() }
    }
}
```

Ver DESIGN.md para la anatomía exacta de frente y dorso.

---

#### LogbookFilterSheet.swift — estructura de secciones

```
ModalSheet {
    Header ("Filtros" + "Limpiar todo" si isDirty)
    ScrollView {
        FilterSection("EXPLORAR") { ExplorarChips }
        FilterSection("RAREZA")   { RarityChips + MythicChip }
        FilterSection("CUÁNDO")   { TimeRangeChips }
        FilterSection("ORDENAR POR") { SortChips }
    }
    FooterCTA("Ver {n} resultado{s}")
}
```

**Rarity chips — regla crítica de color**: ver DESIGN.md sección "RAREZA". Nunca usar gris para ✿ sin seleccionar.

---

#### AscentDetailView (pantalla separada, sin bottom nav)

- Navegación: `NavigationLink` con `.navigationBarHidden(true)` o hero transition
- Hero photo 4:5 ratio (o full-width si landscape) con gradiente inferior
- `PeakInfoCard`: nombre pico, altitud badge (rarity color), montaña, fecha, ruta
- `PersonsRow`: avatares de personas etiquetadas
- `ExtraPhotosSection`: grid de fotos adicionales (si las hay)
- Botón borrar: `confirmationDialog` (nunca `Alert` para destructivas)
- Botón editar: abre `EditAscentSheet` — misma lógica que Android

---

#### Best practices iOS a aplicar

- `.task` para cargar datos (se cancela al salir) — nunca `onAppear`
- `withAnimation(.easeInOut(duration: 0.7))` para el flip de la card
- `presentationDetents([.large])` para el filter sheet
- `ScrollView` + `LazyVStack` para la lista
- Infinite scroll: `.onAppear` en el último elemento → `vm.loadMore()` (si se implementa paginación)
- `confirmationDialog` para confirmar borrado
- `RelativeDateTimeFormatter` para fechas relativas en cards

---

**✅ Criterio de salida fase 3:**
- Lista muestra ascensiones propias + amigos con el sort correcto del servidor
- Default view = Friends (no mías)
- Filter sheet funciona: EXPLORAR / RAREZA / CUÁNDO / ORDENAR POR
- Rarity chips muestran su color aunque no estén seleccionados
- Green dot aparece en ascensiones no vistas de amigos
- mark-as-seen se dispara 3s después de cargar
- Tap en card abre detalle; tap en card (en lista) hace flip

---

### FASE 4 — Nueva Ascensión
**Duración estimada: 6-7 días**
**Entregable: flujo completo crear ascensión con foto**

#### Flujo (sheet modal)
```
Paso 1: PickPhoto    → PHPickerViewController (nativo iOS)
Paso 2: CropPhoto    → crop 1:1 o 4:5 con gestos nativos
Paso 3: FormAscent   → peak picker + fecha + ruta + notas + personas
```

#### Pantallas / componentes
- `NewAscentSheet` — contenedor del flujo (3 pasos)
- `PhotoPickerStep` — selección de foto desde galería / cámara
- `PhotoCropStep` — crop con pinch-zoom + rotation
- `AscentFormStep` — formulario completo
- `PeakSearchSheet` — búsqueda de pico (sheet separado)

#### NewAscentViewModel
```swift
@Observable class NewAscentViewModel {
  // Paso 1
  var selectedImage: UIImage?

  // Paso 2
  var croppedImage: UIImage?
  var cropAspect: CropAspect = .fourFive
  var rotation: Int = 0  // 0, 90, 180, 270

  // Paso 3
  var selectedPeak: Peak?
  var date: Date = .now
  var route: String = ""
  var notes: String = ""
  var taggedPersons: [Person] = []

  var currentStep: AscentStep = .pickPhoto
  var isSubmitting = false
  var error: String?

  func submit() async throws {
    // 1. POST /api/v1/ascents
    // 2. POST /api/v1/photos/upload (multipart)
    // 3. POST /api/v1/photos/:id/persons (si hay personas)
  }
}
```

#### Crop nativo iOS
- `UIViewRepresentable` wrapping `UIScrollView` con `UIImageView`
- Pinch = zoom, pan = mover, botón = rotar 90° CW
- Output: `UIImage` recortada al aspect ratio seleccionado
- Sin librerías externas — UIKit scroll view es más fluido que cualquier implementación custom en SwiftUI

#### PeakSearchSheet
- Input de búsqueda con debounce (0.3s)
- `GET /api/v1/peaks?q=texto`
- Lista de resultados con nombre + altitud + país
- Si viene de mapa: pico preseleccionado

#### Best practices iOS a aplicar
- `PHPickerViewController` (no `UIImagePickerController` — deprecated)
- Permisos de cámara declarados en Info.plist con descripción
- `multipart/form-data` para upload de foto
- Progreso de upload con `URLSession.upload(for:from:delegate:)`
- Validación de tamaño antes de crop (max 10MB)
- Teclado: `KeyboardAdaptive` para que el formulario suba con el teclado

**✅ Criterio de salida fase 4:** crear ascensión completa desde simulador/dispositivo, foto visible en la web después de crear.

---

### FASE 5 — Atlas (Mapa)
**Duración estimada: 5-6 días**
**Entregable: mapa interactivo con picos, filtros y panel de detalle**

#### Pantallas
- `MapView` — mapa nativo con markers
- `PeakDetailPanel` — panel inferior al tocar un pico

#### MapViewModel
```swift
@Observable class MapViewModel {
  var peaks: [Peak] = []
  var climbedPeakIds: Set<String> = []
  var selectedPeak: Peak?
  var filter: MapFilter = .all  // all / climbed / notYet
  var isLoading = false

  func loadPeaks() async { ... }        // GET /api/v1/peaks
  func selectPeak(_ peak: Peak) { ... }
}
```

#### Markers
- Pico escalado: marker circular con foto (Kingfisher) + anillo verde
- Pico no escalado: punto azul con clustering nativo MapKit
- `MKAnnotationView` custom para ambos tipos
- `UIViewRepresentable` wrapping `MKMapView` (SwiftUI MapKit tiene limitaciones para markers custom)

#### PeakDetailPanel
- Sheet con `presentationDetents([.medium, .large])`
- Foto hero (si escalado) o estado "Aún sin subir"
- Nombre + altitud + rango montañoso
- Botón "+ Registrar ascensión" → abre NewAscentSheet con pico preseleccionado
- Si escalado: fecha más reciente + botón ver detalle

#### Best practices iOS a aplicar
- `MKMapView` via `UIViewRepresentable` (no SwiftUI `Map` — limitado para annotation views custom)
- Clustering nativo: `MKClusterAnnotation`
- `CLLocationManager` para geolocalización con permiso `whenInUse`
- Región inicial: última posición conocida o España por defecto
- `MKTileOverlay` para hillshade (opcional, igual que la web)

**✅ Criterio de salida fase 5:** mapa muestra picos reales, tap en pico abre panel, botón registrar abre NewAscent con pico preseleccionado.

---

### FASE 6 — Social
**Duración estimada: 3-4 días**
**Entregable: feed de amigos + gestión de amistades**

#### Pantallas
- `SocialFeedView` — feed de actividad de amigos
- `FriendsView` — lista amigos + requests + invitar

#### SocialFeedViewModel
```swift
@Observable class SocialFeedViewModel {
  var items: [FeedItem] = []
  var isLoadingMore = false
  var cursor: String?

  func load() async { ... }        // GET /api/v1/feed
  func markSeen(_ ids: [String]) async { ... }  // POST /api/v1/feed/seen
  func loadMore() async { ... }
}
```

#### FeedItem card
- Avatar + nombre amigo + fecha relativa
- Foto de la ascensión (Kingfisher)
- Pico + altitud
- Personas etiquetadas

#### FriendsView
- Sección: amigos aceptados (con botón eliminar)
- Sección: requests recibidos (aceptar / rechazar)
- Sección: invitar por email
- Search bar para buscar usuarios: `GET /api/v1/users/search?q=`

#### Best practices iOS a aplicar
- Fecha relativa con `RelativeDateTimeFormatter` (nativo iOS)
- `markSeen` se dispara automáticamente al hacer scroll (IntersectionObserver equivalent: `.onAppear` en cada item)
- Empty state con ilustración cuando no hay amigos aún

**✅ Criterio de salida fase 6:** feed muestra ascensiones de amigos reales, se pueden enviar y aceptar solicitudes.

---

### FASE 7 — Perfil y Ajustes
**Duración estimada: 3-4 días**
**Entregable: perfil propio + configuración de cuenta**

#### Pantallas
- `ProfileView` — estadísticas + fotos + logros
- `SettingsView` — configuración de cuenta
- `EditProfileSheet` — editar nombre, username, avatar

#### ProfileViewModel
```swift
@Observable class ProfileViewModel {
  var profileData: ProfileData?

  func load() async { ... }        // GET /api/v1/me + stats
  func updateAvatar(_ image: UIImage) async { ... }  // POST /api/v1/settings/avatar
}
```

#### SettingsView secciones
- Cuenta: nombre, email, username, cambiar password
- Privacidad: aparecer en búsqueda, permitir etiquetado
- Idioma: selector (ca, es, en, fr, de)
- Sesión: cerrar sesión (con confirmación)
- Versión de la app

#### Avatar crop
- Reutiliza `PhotoCropStep` de Fase 4 (crop 1:1 para avatar)
- Upload a `/api/v1/settings/avatar`

**✅ Criterio de salida fase 7:** editar perfil funciona, cambio de avatar visible inmediatamente, cerrar sesión limpia Keychain.

---

### FASE 8 — Polish y entrega App Store
**Duración estimada: 4-5 días**
**Entregable: app lista para TestFlight**

#### 8.1 Pulido de UX
- Haptics: `UIImpactFeedbackGenerator` en acciones primarias (crear ascensión, aceptar amigo)
- Transiciones: `.navigationTransition(.zoom)` en iOS 18 donde aplique
- Loading states consistentes en toda la app
- Error states con retry button en todas las vistas
- Offline banner cuando no hay conexión (`NWPathMonitor`)

#### 8.2 Localización
- Extraer todos los strings a `Localizable.xcstrings`
- 5 idiomas: ca, es, en, fr, de
- Fechas y números siempre con `Locale` explícito

#### 8.3 Accesibilidad
- `.accessibilityLabel` en imágenes y botones sin texto
- VoiceOver en flows críticos (login, nueva ascensión)
- Dynamic Type en textos principales

#### 8.4 App Store
- App icon 1024×1024 (del brand mark `public/logo-icon.svg`)
- Splash screen
- Screenshots para App Store (6.9", 6.5", iPad si aplica)
- Privacy manifest (`PrivacyInfo.xcprivacy`) — requerido por Apple desde 2024
- App Store Connect: descripción, keywords, categoría (Sports / Travel)

#### 8.5 TestFlight
- EAS o Xcode Cloud para builds automáticos
- Grupo de testers internos primero

---

## Resumen de fases

| Fase | Contenido | Días |
|---|---|---|
| 0 | Cimientos: proyecto, APIClient, AuthSession, modelos | 3-4 |
| 1 | Autenticación: login, register, forgot password | 3-4 |
| 2 | Home: dashboard, niveles, leaderboard, logros | 5-6 |
| 3 | Logbook: lista ascensiones + detalle | 4-5 |
| 4 | Nueva ascensión: foto, crop, formulario | 6-7 |
| 5 | Atlas: mapa MapKit con markers y panel | 5-6 |
| 6 | Social: feed amigos + gestión amistades | 3-4 |
| 7 | Perfil y ajustes | 3-4 |
| 8 | Polish, localización, App Store | 4-5 |
| **Total** | | **~36-45 días** |

---

## Reglas que no se pueden romper

1. **Nunca lógica de negocio en una View** — si necesita un if complejo, va al ViewModel
2. **Nunca almacenar el JWT en UserDefaults** — siempre Keychain
3. **Nunca duplicar lógica que ya hace la API** — cálculo de niveles, rankings, etc. los devuelve `/api/v1/home`
4. **Nunca un ViewModel masivo** — si supera ~150 líneas, extraer en sub-ViewModels o Services
5. **Nunca hardcodear strings visibles** — desde el inicio en `Localizable.xcstrings`
6. **Nunca `onAppear` para cargar datos** — usar `.task` (se cancela automáticamente al salir de la vista)
7. **Nunca `@EnvironmentObject`** — usar `@Environment` con tipos concretos (Swift 5.9+)
