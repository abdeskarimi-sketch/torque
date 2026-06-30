# Crypto Cycle Engine — self-updating

A single-page dashboard (cycle projection + confirmation signals + sizing + kill criteria)
that refreshes itself **daily, hands-off**, via a GitHub Action + GitHub Pages.

## How it stays current

```
 cron (06:00 UTC daily)
        │
        ▼
 scripts/fetch-data.mjs ──► writes data.json ──► commit ──► deploy to Pages
        │                                                        │
        ├─ FREE  (no key): prices, BTC dominance, Fear&Greed, funding
        └─ KEYED (secrets): MVRV + MVRV-Z (Glassnode), ETF flows (your provider)
```

`index.html` loads `./data.json` on open (always current as of the last cron run),
then optionally live-overrides the four free metrics for intra-day freshness.
If everything is unreachable it falls back to the baked-in snapshot.

## Deploy (5 minutes)

1. **Create a repo** and add these files (keep the paths):
   `index.html`, `data.json`, `scripts/fetch-data.mjs`, `.github/workflows/daily.yml`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Run it once:** Actions tab → *Update & Deploy Cycle Engine* → *Run workflow*.
4. Your dashboard is live at `https://<you>.github.io/<repo>/`.

That's it — the free metrics now update every day with **zero keys**.

## Optional: turn on MVRV and ETF flows

Add repo **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Purpose | Notes |
|---|---|---|
| `GLASSNODE_API_KEY` | MVRV + MVRV-Z | Any tier exposing `market/mvrv` + `mvrv_z_score`. |
| `ETF_API_URL` | spot-BTC-ETF net flows | Your provider's JSON endpoint. |
| `ETF_API_KEY` | (if the provider needs auth) | Sent as `Authorization: Bearer …`. |

Then edit the one mapping line in `scripts/fetch-data.mjs` (marked `<-- adjust`)
to match your ETF provider's field name. Without these secrets, those two
metrics simply keep their last value — nothing breaks.

## Change the cadence

Edit the `cron:` line in `.github/workflows/daily.yml` (e.g. `0 */6 * * *` = every 6h).

---
Mechanical extrapolation off n=3 cycles + live readings. Dates firmer than prices.
Educational — **not investment advice.**
