# Peakadex Mobile

## Estructura

```
mobile/
├── ios/        Swift + SwiftUI (activo)
├── android/    Kotlin + Jetpack Compose (futuro)
└── shared/     Assets y specs comunes a ambas plataformas
    ├── api-contract.md       Referencia de endpoints /api/v1
    ├── design-tokens.json    Colores, tipografías, espaciados
    └── icons/                SVG/PNG fuente para ambas plataformas
```

## iOS

Ver `ios/README.md` para instrucciones de setup.

Requisitos:
- Xcode 16+
- iOS 17+ target
- Swift 6

## API

La app consume `/api/v1/*` en `https://www.peakadex.com`.
Documentación completa en `shared/api-contract.md`.

## Android

Pendiente. Cuando se inicie, seguirá la misma arquitectura por features
que iOS (Features/ + Core/) pero en Kotlin + Jetpack Compose.
