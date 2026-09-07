# Peakadex — Ficha Google Play Store

Estado: **borrador para revisión**. Copia estos textos en Play Console → Store listing.
Paquete: `com.peakadex.app` · versión 1.1 (versionCode 2) · categoría sugerida: **Salud y bienestar** o **Deportes**.

---

## 1. Español (idioma por defecto)

### Nombre de la app (máx 30)
```
Peakadex: cimas y colección
```
*(28 car. — alternativa corta: `Peakadex`)*

### Descripción breve (máx 80)
```
Captura tus cimas, colecciona cartas de montaña y compite con tu cordada.
```
*(76 caracteres)*

### Descripción completa (máx 4000)
```
Peakadex convierte cada ascensión real en una carta coleccionable. Tu historia de montaña, convertida en leyenda.

Captura cimas. Colecciona rarezas. Conviértete en legendario.

⛰️ CAPTURA TUS CIMAS
Registra cada cumbre con tus fotos, la fecha, la ruta y tus compañeros de cordada. Peakadex genera una carta de coleccionista única de esa cima: nombre, altitud, rareza y tu foto. Es tu trofeo digital de cada ascensión.

✿ COLECCIONA RAREZAS
No todas las cimas son iguales. Según su altitud, cada cumbre recibe una rareza —de Daisy a Snow Lotus— y las cimas más míticas desbloquean cartas especiales. Cuanto más alto subes, más rara es tu colección.

🗺️ EXPLORA EL ATLAS
Un mapa interactivo con miles de cimas. Busca tu próxima montaña, filtra por rareza o región, descubre cumbres cercanas y márcalas como objetivo. Terreno 3D, relieve y capas de senderos.

📊 SIGUE TU PROGRESO
Estadísticas, niveles y logros que crecen contigo. Sube de Scout a Zenith a medida que acumulas cimas únicas y metros de desnivel. Gráficas por mes y por rareza.

🧗 COMPITE CON TU CORDADA
Añade a tus amigos, crea cordadas y ve sus ascensiones en tu feed. Ellos ven tus cartas, tú ves las suyas. Sin algoritmos, sin extraños — solo tu círculo de montaña. Ranking interno para picarte con quien de verdad sube contigo.

📸 REGISTRA CIMAS PASADAS
Tu historia no empieza hoy. Añade ascensiones de cualquier fecha con foto y datos de la expedición. Recupera toda tu vida montañera.

Para senderistas, montañeros y alpinistas de cualquier nivel. La rareza Daisy cubre cimas desde muy baja altitud: cualquiera puede empezar su colección desde el primer día.

¿Tu próxima cima te espera? Empieza tu colección.
```

### Palabras clave / ASO (no hay campo dedicado en Play, pero úsalas en la descripción)
registrar cimas · diario de montaña · logbook montañismo · colección de picos · cartas coleccionables · senderismo · montañismo · alpinismo · rutas de montaña · bagging peaks · gamificación senderismo

---

## 2. English (añadir como segundo idioma)

### App name (max 30)
```
Peakadex: peak collector
```

### Short description (max 80)
```
Capture your summits, collect mountain cards and compete with your rope team.
```
*(77 characters)*

### Full description (max 4000)
```
Peakadex turns every real ascent into a collectible card. Your mountain story, turned into legend.

Capture summits. Collect rarities. Become legendary.

⛰️ CAPTURE YOUR SUMMITS
Log every peak with your photos, the date, the route and your rope-team partners. Peakadex generates a unique collector card for that summit: name, altitude, rarity and your photo. Your digital trophy for every ascent.

✿ COLLECT RARITIES
Not all summits are equal. Based on its altitude, each peak gets a rarity —from Daisy to Snow Lotus— and the most mythic summits unlock special cards. The higher you climb, the rarer your collection.

🗺️ EXPLORE THE ATLAS
An interactive map with thousands of peaks. Find your next mountain, filter by rarity or region, discover nearby summits and mark them as goals. 3D terrain, hillshade and trail layers.

📊 TRACK YOUR PROGRESS
Stats, levels and achievements that grow with you. Climb from Scout to Zenith as you rack up unique peaks and vertical meters. Monthly and rarity charts.

🧗 COMPETE WITH YOUR ROPE TEAM
Add friends, create rope teams and see their ascents in your feed. They see your cards, you see theirs. No algorithms, no strangers — just your mountain circle. Internal leaderboard to compete with the people who actually climb with you.

📸 LOG PAST SUMMITS
Your story doesn't start today. Add ascents from any date with photos and expedition data. Reclaim your whole mountain life.

For hikers, mountaineers and alpinists of every level. The Daisy rarity covers summits from very low altitude: anyone can start their collection from day one.

Is your next summit waiting? Start your collection.
```

---

## 3. Imágenes (assets gráficos)

| Asset | Tamaño exacto | Estado | Archivo / Notas |
|---|---|---|---|
| **Icono de la app** | 512×512 px, PNG 32-bit con alpha | ✅ generado | `play-assets/play-icon-512.png` — icono de marca sobre fondo blanco (mismo que el launcher). Algo suave por upscale de raster 295px; si hay master de alta-res, regenerar |
| **Feature graphic** | 1024×500 px, PNG (sin alpha) | ✅ generado | `play-assets/play-feature-graphic-1024x500.png` — logo web (peak + montaña + adex, Manrope) + tagline con acento dorado |
| **Capturas teléfono** | mín. 2, máx. 8. Ratio 9:16, lado 1080–1920 px típico | ⚠️ pendiente capturar | Del emulador/dispositivo en release. Ver set recomendado abajo |
| Capturas tablet 7"/10" | opcional | — | Solo si se declara soporte tablet |
| Vídeo (YouTube) | opcional | — | — |

### Set de capturas recomendado (orden narrativo, 5-6 pantallas)
1. **Stats / Mi Progreso** — hero + nivel + gráficas (muestra gamificación)
2. **Una carta** (front) — la carta coleccionable de una cima mítica (el gancho visual)
3. **Atlas** — mapa 3D con marcadores de cimas
4. **Bitácora / Cimas** — la colección de cimas con fotos y rarezas
5. **Cordada** — feed/ranking de amigos
6. **Captura** — el momento de crear una ascensión (reveal de la carta)

> Consejo ASO: añade un rótulo de texto grande sobre cada captura (p.ej. "Colecciona cada cima", "Compite con tu cordada") — mejora conversión frente a screenshots "crudos".

---

## 4. Compliance (Play Console)

| Ítem | Valor |
|---|---|
| Política de privacidad | https://www.peakadex.com/privacy |
| Términos | https://www.peakadex.com/terms |
| Email de contacto | *(definir — sugerido: hola@peakadex.com o el tuyo)* |
| Content rating | Cuestionario IARC → previsiblemente PEGI 3 / Everyone (red social ligera, sin contenido sensible) |
| Data safety | Declarar: email (cuenta), fotos subidas por el usuario, nombre; ubicación aproximada opcional (geolocalización del mapa). Todo para funcionalidad de la app, no venta a terceros. |
| App access | Requiere login → dar **credenciales de prueba** a Google (usuario/contraseña de una cuenta demo con datos) |
| Ads | No |
| Público objetivo | Mayores de 13 (o el rango que decidas) |
| Categoría | Salud y bienestar / Deportes |

---

## 5. Pendientes antes de publicar
- [x] Icono 512×512 exportado → `play-assets/play-icon-512.png`
- [x] Feature graphic 1024×500 diseñado → `play-assets/play-feature-graphic-1024x500.png`
- [ ] 5-6 capturas de teléfono (release, con rótulos)
- [ ] Email de contacto del desarrollador
- [ ] Crear cuenta demo para revisión de Google
- [ ] Rellenar Data safety + Content rating en Console
- [ ] Subir `app-release.aab` a Producción (o Testing interno primero)
