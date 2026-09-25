# Fuentes autoalojadas

Las familias que el proyecto usa de verdad, en su versión **variable** y subconjunto
**latin**, descargadas de Google Fonts y servidas desde aquí con `next/font/local`.

| Fichero | Familia | Eje de peso | Usada en |
|---|---|---|---|
| `Inter-Variable.woff2` | Inter | 400–700 | `app/layout.tsx` |
| `SpaceGrotesk-Variable.woff2` | Space Grotesk | 300–700 | `app/layout.tsx` |
| `Manrope-Variable.woff2` | Manrope | 200–800 | landing |
| `JetBrainsMono-Variable.woff2` | JetBrains Mono | 100–800 | landing |

140 KB en total.

**Eran seis.** Baloo 2 y Nunito se cayeron de la lista al comprobar que
`--font-baloo2` y `--font-nunito` no tenían ni una referencia en el repositorio:
se descargaban en cada build y no pintaban un píxel. Antes de añadir una familia
nueva aquí, comprueba que su variable se use de verdad.

## Por qué no `next/font/google`

Ese helper descarga las fuentes **durante el build**. Con seis familias, un
despliegue dependía de que seis peticiones a Google salieran bien. El 25/09/2026
falló la de Nunito y tumbó el despliegue de producción; el error era un
`module-not-found` sobre `[next]/internal/font/google/nunito_*.module.css`, que no
se parece en nada a la causa real. El mismo commit había construido sin problema en
staging y en local, que es lo que delató que no era el código.

Autoalojarlas elimina la dependencia de red del build por completo.

## Variables, no estáticas

Un fichero variable por familia cubre todos los pesos y pesa menos que los
estáticos sueltos que sustituye (eran 15 combinaciones de familia y peso). Por eso
cada declaración lleva un **rango** en `weight`, no un número: `"400 700"`, no
`"400"`.

## Actualizarlas

No hay script. Se piden a la API css2 con un User-Agent de navegador (si no,
devuelve TTF en vez de woff2), se coge la URL del bloque marcado `/* latin */` —
la respuesta trae también cirílico, griego y vietnamita — y se guarda aquí con el
mismo nombre.

## Licencia

Las seis son SIL Open Font License 1.1, que permite el uso autoalojado y la
redistribución. Los textos de licencia están en el repositorio de cada familia en
[github.com/google/fonts](https://github.com/google/fonts).
