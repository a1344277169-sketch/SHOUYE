/* labagound · 每日目标 的进度同步接口
   POST /api/sync/<同步码>  发送本机进度 → 和服务器上的合并 → 存下并返回合并结果
   GET  /api/sync/<同步码>  只读取
   每个同步码对应一个 Durable Object（免费套餐可用，不需要在后台手动建数据库）。
   其余请求交给静态页面。 */
import { DurableObject } from 'cloudflare:workers';

const CODE_RE = /^[0-9A-Za-z_-]{6,40}$/;
const MAX_BYTES = 1024 * 1024;
const ORIGINS = ['https://labagound.cc', 'https://www.labagound.cc', 'https://jlpt.labagound.cc'];

function cors(req) {
  const o = req.headers.get('Origin') || '';
  const ok = ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return ok ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {};
}
function json(body, status, extra) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra || {}) });
}

/* ---------- 合并规则 ----------
   cards（语法复习记录）：每条取答题次数多的那一边，次数相同取复习日期更晚的
   days（每日统计）：每天取做题数多的那一边
   tb.lv（重点表掌握程度）：每个词取最后改动的那一边（tb.lt 记录改动时间）
   其它（设置、今日练习、单词卡位置等）：取最后保存的那台设备
   清空记录（rs）之后，比清空更早的记录不再合并回来 */
function obj(x) { return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; }
function score(c) { return (+c.r || 0) + (+c.w || 0); }
function mergeCards(a, b) {
  const out = Object.assign({}, a);
  for (const k of Object.keys(b)) {
    const x = a[k], y = b[k];
    if (!x) { out[k] = y; continue; }
    const sx = score(x), sy = score(y);
    if (sy > sx || (sy === sx && String(y.due || '') >= String(x.due || ''))) out[k] = y;
  }
  return out;
}
function mergeDays(a, b) {
  const out = Object.assign({}, a);
  for (const k of Object.keys(b)) if (!a[k] || (+b[k].n || 0) > (+a[k].n || 0)) out[k] = b[k];
  return out;
}
function mergeTb(a, b, bNewer) {
  a = obj(a); b = obj(b);
  const out = bNewer ? Object.assign({}, a, b) : Object.assign({}, b, a);
  const la = obj(a.lv), lb = obj(b.lv), ta = obj(a.lt), tb = obj(b.lt);
  const lv = {}, lt = {};
  const keys = new Set([...Object.keys(la), ...Object.keys(lb), ...Object.keys(ta), ...Object.keys(tb)]);
  for (const k of keys) {
    const xa = +ta[k] || 0, xb = +tb[k] || 0;
    let src;
    if (xb !== xa) src = xb > xa ? lb : la;
    else src = k in la && k in lb ? (bNewer ? lb : la) : (k in lb ? lb : la); // 旧数据没有改动时间：两边合起来
    if (src[k]) lv[k] = src[k];
    if (Math.max(xa, xb)) lt[k] = Math.max(xa, xb);
  }
  out.lv = lv; out.lt = lt;
  return out;
}
function merge(a, b) {
  if (!a) return b;
  const ta = +a.t || 0, tb = +b.t || 0;
  const bNewer = tb >= ta;
  const out = bNewer ? Object.assign({}, a, b) : Object.assign({}, b, a);
  out.t = Math.max(ta, tb);
  out.rs = Math.max(+a.rs || 0, +b.rs || 0);
  if ((+a.rs || 0) > tb) { out.cards = obj(a.cards); out.days = obj(a.days); out.tb = a.tb; return out; }
  if ((+b.rs || 0) > ta) { out.cards = obj(b.cards); out.days = obj(b.days); out.tb = b.tb; return out; }
  out.cards = mergeCards(obj(a.cards), obj(b.cards));
  out.days = mergeDays(obj(a.days), obj(b.days));
  if (a.tb || b.tb) out.tb = mergeTb(a.tb, b.tb, bNewer);
  return out;
}

export class SyncStore extends DurableObject {
  async fetch(req) {
    const cur = (await this.ctx.storage.get('s')) || null;
    if (req.method === 'GET') return json({ data: cur });
    const incoming = await req.json();
    const merged = merge(cur, incoming);
    await this.ctx.storage.put('s', merged);
    return json({ data: merged });
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/api\/sync\/([^/]+)\/?$/);
    if (!m) return env.ASSETS.fetch(req);
    const h = cors(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    let code;
    try { code = decodeURIComponent(m[1]); } catch (e) { code = ''; }
    if (!CODE_RE.test(code)) return json({ error: 'bad-code' }, 400, h);
    if (req.method !== 'GET' && req.method !== 'POST') return json({ error: 'method' }, 405, h);
    let body = null;
    if (req.method === 'POST') {
      const text = await req.text();
      if (text.length > MAX_BYTES) return json({ error: 'too-large' }, 413, h);
      try { body = JSON.parse(text); } catch (e) { body = null; }
      if (!body || typeof body !== 'object' || typeof body.cards !== 'object') return json({ error: 'bad-data' }, 400, h);
    }
    const stub = env.SYNC.get(env.SYNC.idFromName(code));
    const res = await stub.fetch('https://sync/', { method: req.method, body: body ? JSON.stringify(body) : undefined, headers: body ? { 'Content-Type': 'application/json' } : {} });
    const out = new Response(res.body, res);
    for (const k of Object.keys(h)) out.headers.set(k, h[k]);
    return out;
  }
};
