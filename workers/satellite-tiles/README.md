# peakadex-satellite-tiles

Cloudflare Worker that proxies satellite imagery for the Atlas map.

    https://tiles.peakadex.com/satellite/{z}/{x}/{y}

## Why it exists

The Atlas used to hit Esri's legacy imagery endpoint directly from the app. That
worked, but it had three problems, and this Worker fixes all three at once:

| Problem | Fix |
|---|---|
| An API key in the APK is extractable | The key lives in a Worker secret; the app only knows the proxy URL |
| Esri's free tier is per-month | Cached tiles never reach Esri, so the tier stretches a long way |
| Swapping provider needs an app release | The upstream is a Worker var; clients keep the same URL |

It is **not** hosted on Railway on purpose: at ~35 KB per tile, a couple of
million tiles a month is tens of GB of egress, and a Railway usage hard limit
takes down production, staging and Postgres together.

## Tile coordinates

The public URL is conventional XYZ — `{z}/{x}/{y}`, same as every other tile URL
in the codebase.

⚠️ Esri's own path is level/**row**/**col**, i.e. `{z}/{y}/{x}`. The Worker does
that swap internally so no client has to. If you ever bypass the Worker, expect
the axes to be transposed.

## Deploy

```bash
cd workers/satellite-tiles
npm install
npx wrangler login
npx wrangler deploy
```

The `routes` block claims `tiles.peakadex.com` as a custom domain — Cloudflare
provisions DNS and the certificate. `peakadex.com` must already be a zone in the
same Cloudflare account. To try it without touching DNS, comment the block out
and deploy to `*.workers.dev`.

## Configuration

| Name | Kind | Required | Purpose |
|---|---|---|---|
| `ARCGIS_API_KEY` | secret | no | ArcGIS Location Platform key, sent as `?token=` |
| `UPSTREAM_TEMPLATE` | var | no | Upstream tile URL in Esri's `{z}/{y}/{x}` order |
| `KEY_EXPIRES_AT` | var | no | `YYYY-MM-DD` the key expires, for the /health countdown |

Current upstream: the licensed `ibasemaps-api.arcgis.com` World_Imagery endpoint, set as
`UPSTREAM_TEMPLATE` in `wrangler.jsonc`. It was read from the Basemap Styles
service (`styles/v2/styles/arcgis/imagery` → `sources` → `tiles`), which is the
only place Esri publishes it — it is not in the Static Basemap Tiles docs, whose
`arcgis/imagery` path 404s.

With neither set, the Worker falls back to Esri's unauthenticated legacy endpoint —
working imagery, but outside Esri's licence terms. Treat that as the starting
point, not the destination.

## Rotating the key

The key in use expires 2027-09-21. To replace it:

1. In <https://location.arcgis.com> → **Developer credentials**, create an API key
   credential: type *API key*, **Aplicación pública** (Location Services only — the
   private variants mint tokens that act on your whole account), no item access,
   and only the **Basemaps** privileges.
2. **Leave the referrer list empty.** The Worker is server-side and sends no
   `Referer`, so any entry there makes Esri reject every request.
3. **Leave pay-as-you-go off** in Billing: the account then stops serving once the
   free tier is spent, which makes an unexpected bill impossible.
4. Install it and update the countdown:

```bash
npx wrangler secret put ARCGIS_API_KEY
# set "KEY_EXPIRES_AT" in wrangler.jsonc to the new date
npx wrangler deploy
```

No app release is involved — the clients keep calling `tiles.peakadex.com`.

### Finding the tile URL again

If the endpoint ever changes, it is **not** in the dashboard and **not** in the
Static Basemap Tiles docs (whose `arcgis/imagery` path 404s). It is published
inside the imagery *style*, which you read with the key:

```bash
curl -s "https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/arcgis/imagery?token=$KEY&echoToken=false" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['sources'])"
```

⚠️ `echoToken=false` matters: without it Esri embeds your token in every returned
tile URL, so the output is a secret you must not paste anywhere.

## Key expiry — the failure worth monitoring

ArcGIS caps API keys at one year. An expired key fails silently: tiles stop
arriving, the app logs nothing, and the Atlas simply shows no imagery under the
Satélite layer. Nobody connects that to a credential nobody remembers creating.

So `/health` carries a countdown:

```json
{ "ok": true, "keyed": true,
  "key": { "status": "ok", "expiresAt": "2027-09-21", "daysLeft": 361 } }
```

- `status: "ok"` → more than 30 days left, HTTP 200
- `status: "expiring"` → within 30 days: **`ok` flips to false** while the map
  still works, which is the whole point — a check that only goes red after the
  breakage is worthless
- `status: "expired"` → HTTP **503**, and `daysLeft` goes negative so a late
  alert still says how late

Point any uptime monitor at `/health` and have it assert `ok === true`.

After rotating the key, update `KEY_EXPIRES_AT` in `wrangler.jsonc` and deploy —
otherwise the countdown keeps describing the old key.

## Attribution

Esri's imagery requires visible credit, exactly as the Basemap Styles service
reports it for `World_Imagery`:

    Source: Esri, Vantor, GeoEye, Earthstar Geographics, CNES/Airbus DS,
    USDA, USGS, AeroGRID, IGN, and the GIS User Community

The Worker returns it on every tile as `X-Attribution` and on `/health`, and the
Android Atlas renders MapLibre's (i) button (bottom-left), which lists every
source on tap. `SatelliteTiles.ATTRIBUTION` must stay in sync with the string
above.

The web map does not use this Worker yet; when it does, it needs the same credit.

## Checking it works

```bash
curl -sI https://tiles.peakadex.com/satellite/12/2048/1536 | grep -i 'x-tile-cache\|content-type'
```

The first call reports `X-Tile-Cache: MISS`, the second `HIT`. `X-Tile-Cache` is
also the quickest way to sanity-check the hit rate in `wrangler tail`.

## Cost

Workers free tier is **100,000 requests/day** — roughly 1,000 Atlas sessions a
day at ~100 tiles each. Note it is a *daily* cap, so a spike can hit it while the
month is nowhere near spent. Beyond that, Workers Paid is $5/month with 10M
requests included, then $0.30/M.
