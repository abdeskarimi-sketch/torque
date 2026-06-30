// scripts/fetch-data.mjs
// Runs in the GitHub Action (Node 20+, global fetch). Writes data.json.
// Free sources need no key. MVRV (Glassnode) and ETF flows need secrets;
// if a secret is absent, that metric keeps its previous value.

import { readFile, writeFile } from 'node:fs/promises';

const prev = JSON.parse(await readFile('data.json', 'utf8').catch(() => '{}'));
const out = { ...prev, generated: new Date().toISOString() };

async function j(url, opt) {
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}
const warn = (label, e) => console.warn(`! ${label}:`, e.message || e);
function fmtUsd(v) {
  const a = Math.abs(v), s = v < 0 ? '\u2212' : '+';
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(0)}M`;
  return `${s}$${a}`;
}

/* ---- FREE: prices ---- */
try {
  const p = await j('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple&vs_currencies=usd');
  out.prices = { BTC: p.bitcoin.usd, ETH: p.ethereum.usd, BNB: p.binancecoin.usd, SOL: p.solana.usd, XRP: p.ripple.usd };
} catch (e) { warn('prices', e); }

/* ---- FREE: BTC dominance ---- */
try {
  const g = await j('https://api.coingecko.com/api/v3/global');
  out.dominance = g.data.market_cap_percentage.btc;
} catch (e) { warn('dominance', e); }

/* ---- FREE: Fear & Greed ---- */
try {
  const f = await j('https://api.alternative.me/fng/?limit=1');
  out.fng = +f.data[0].value;
  out.fngLabel = f.data[0].value_classification;
} catch (e) { warn('fng', e); }

/* ---- FREE: BTC funding (8h) ---- */
try {
  const fu = await j('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT');
  out.funding = parseFloat(fu.lastFundingRate);
} catch (e) { warn('funding', e); }

/* ---- KEYED (optional): MVRV + MVRV-Z via Glassnode ---- */
if (process.env.GLASSNODE_API_KEY) {
  const k = process.env.GLASSNODE_API_KEY;
  const last = (arr) => arr[arr.length - 1].v;
  try {
    const mv = await j(`https://api.glassnode.com/v1/metrics/market/mvrv?a=BTC&i=24h&api_key=${k}`);
    out.mvrv = +last(mv).toFixed(2);
  } catch (e) { warn('mvrv', e); }
  try {
    const mz = await j(`https://api.glassnode.com/v1/metrics/market/mvrv_z_score?a=BTC&i=24h&api_key=${k}`);
    out.mvrvZ = +last(mz).toFixed(2);
  } catch (e) { warn('mvrvZ', e); }
} else {
  console.log('· GLASSNODE_API_KEY not set — keeping previous MVRV values');
}

/* ---- KEYED (optional): spot-BTC-ETF net flows ----
   Adapt the mapping to your provider (SoSoValue, Farside API, etc.).
   Expose ETF_API_URL (+ ETF_API_KEY) as repo secrets. The block below
   assumes a JSON response with a numeric `dailyNetUsd`; edit to match. */
if (process.env.ETF_API_URL) {
  try {
    const headers = process.env.ETF_API_KEY ? { Authorization: `Bearer ${process.env.ETF_API_KEY}` } : {};
    const e = await j(process.env.ETF_API_URL, { headers });
    const v = e.dailyNetUsd ?? e.total ?? e.netFlow; // <-- adjust to your provider's field
    if (v != null) { out.etfFlowDay = v; out.etfFlowLabel = `${fmtUsd(v)} today`; }
  } catch (e) { warn('etf', e); }
} else {
  console.log('· ETF_API_URL not set — keeping previous ETF flow value');
}

await writeFile('data.json', JSON.stringify(out, null, 2) + '\n');
console.log('\u2713 wrote data.json @', out.generated);
