/* labagound · 每日目标（JLPT 语法 + 单词）
   纯静态，无需构建。进度保存在浏览器 localStorage（labagound-grammar-v1）；输入同步码后经 /api/sync 在多设备间合并。
   复习采用间隔重复：答对后间隔 1→3→7→14→30→60→120 天；答错回到第二天重来。连续答对到 30 天间隔算“已掌握”。 */
(function () {
  'use strict';

  var DATA = window.GRAMMAR || { items: [], groups: [] };
  var ITEMS = DATA.items.slice().sort(function (a, b) { return a.id - b.id; });
  var BY = {}; ITEMS.forEach(function (i) { BY[i.id] = i; });
  var GROUPS = DATA.groups;
  var FURI = DATA.furi || {};
  var GBY = {}; GROUPS.forEach(function (g) { g.items = []; GBY[g.id] = g; });
  ITEMS.forEach(function (i) { (i.g || []).forEach(function (gid) { if (GBY[gid]) GBY[gid].items.push(i.id); }); });

  var KEY = 'labagound-grammar-v1';
  var INTERVAL = [1, 1, 3, 7, 14, 30, 60, 120];
  var MASTER = 5;
  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];

  /* ---------- storage ---------- */
  function fresh() {
    return { v: 1, seed: Math.floor(Math.random() * 1e9), cards: {}, days: {}, set: { per: 8, scope: 'all', order: 'seq', tts: true, furi: 'tap' }, daily: null };
  }
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    return norm(s);
  }
  function norm(s) {
    var base = fresh();
    if (!s || typeof s !== 'object') return base;
    s.set = Object.assign(base.set, s.set || {});
    s.cards = s.cards || {}; s.days = s.days || {};
    if (typeof s.seed !== 'number') s.seed = base.seed;
    return s;
  }
  var S = load();
  function store() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 隐私模式等情况下忽略 */ } }
  function save() { S.t = Date.now(); store(); syncSoon(); }

  /* ---------- 多设备同步（同步码） ----------
     各设备输入同一个同步码；进度发到 /api/sync/<码>，服务器合并后返回（规则见 sync-worker.js）。 */
  var SYNC_KEY = 'labagound-sync-code';
  var HOST = location.hostname;
  var API = (/(^|\.)labagound\.cc$/.test(HOST) && HOST !== 'jlpt.labagound.cc') ? 'https://jlpt.labagound.cc' : '';
  var SY = { code: '', busy: false, again: false, last: 0, err: '', timer: null };
  try { SY.code = localStorage.getItem(SYNC_KEY) || ''; } catch (e) { /* ignore */ }
  function syncSoon() { if (!SY.code) return; clearTimeout(SY.timer); SY.timer = setTimeout(function () { syncNow(); }, 2500); }
  function syncNow(opt) {
    opt = opt || {};
    if (!SY.code) return Promise.resolve(false);
    if (SY.busy) { SY.again = true; return Promise.resolve(false); }
    clearTimeout(SY.timer);
    SY.busy = true; syncUI();
    var sent = JSON.stringify(S), code = SY.code;
    return fetch(API + '/api/sync/' + encodeURIComponent(code), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: sent, keepalive: !!opt.keep && sent.length < 60000 })
      .then(function (r) { if (!r.ok) throw new Error(r.status === 400 ? 'bad' : 'net'); return r.json(); })
      .then(function (res) {
        SY.err = ''; SY.last = Date.now();
        if (code !== SY.code) return false;
        var m = res && res.data; if (!m) return false;
        if (JSON.stringify(S) !== sent) { SY.again = true; return false; } // 同步途中本机又有改动：再同步一次
        if (JSON.stringify(m) === sent) return false;
        S = norm(m);
        // 今天还没开始做：按合并后的学习记录重新排今天的题（已经学过的不会再当新题出现）
        if (S.daily && S.daily.date === today() && !(S.daily.res || []).length && !EXTRA) buildDaily();
        store(); wordOrder = null; applyFuri();
        if (opt.render) render();
        return true;
      })
      .catch(function (e) { SY.err = e && e.message === 'bad' ? '同步码格式不对' : '同步失败，网络恢复后会自动重试'; return false; })
      .then(function (changed) {
        SY.busy = false; syncUI();
        if (SY.again) { SY.again = false; syncSoon(); }
        return changed;
      });
  }
  function hm(t) { var d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function syncUI() {
    var box = document.getElementById('syncBox'); if (!box) return;
    if (!SY.code) {
      box.innerHTML = '<p class="sheet__note">在每台设备上输入同一个同步码，语法进度和重点表的掌握程度会自动合并。同步码自己定（字母或数字，至少 6 位）；知道这个码的人也能看到和改动进度，别设得太简单。</p>' +
        '<div class="sync__row"><input class="sync__in" id="syncInput" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="40" placeholder="输入同步码"><button class="btn btn--sm" type="button" id="syncStart">开始同步</button></div>';
      return;
    }
    var st = SY.busy ? '正在同步…' : SY.err ? SY.err : SY.last ? '已同步 · ' + hm(SY.last) : '已开启';
    box.innerHTML = '<div class="sync__on"><span class="sync__dot' + (SY.err ? ' is-err' : '') + '" aria-hidden="true"></span><span>同步码 <b>' + esc(SY.code) + '</b></span><span class="sync__st">' + esc(st) + '</span></div>' +
      '<div class="btn-row"><button class="btn btn--ghost btn--sm" type="button" id="syncGo"' + (SY.busy ? ' disabled' : '') + '>立即同步</button><button class="btn btn--plain btn--sm" type="button" id="syncOff">停止同步</button></div>';
  }
  function syncStart() {
    var inp = document.getElementById('syncInput'); var v = (inp && inp.value || '').trim();
    if (!/^[0-9A-Za-z_-]{6,40}$/.test(v)) { toast('同步码要 6 位以上，只能用字母、数字、- 和 _'); if (inp) inp.focus(); return; }
    SY.code = v; SY.err = ''; SY.last = 0;
    try { localStorage.setItem(SYNC_KEY, v); } catch (e) { /* ignore */ }
    syncNow({ render: true }).then(function () { toast(SY.err ? SY.err : '已开启同步'); });
  }
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('#syncStart,#syncGo,#syncOff'); if (!t) return;
    if (t.id === 'syncStart') syncStart();
    else if (t.id === 'syncGo') syncNow({ render: true }).then(function (ch) { if (!SY.err) toast(ch ? '已同步，进度已更新' : '已同步'); });
    else { SY.code = ''; SY.err = ''; SY.last = 0; clearTimeout(SY.timer); try { localStorage.removeItem(SYNC_KEY); } catch (e) { /* ignore */ } syncUI(); toast('已停止同步，本机记录保留'); }
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && ev.target && ev.target.id === 'syncInput') { ev.preventDefault(); syncStart(); } });
  document.addEventListener('visibilitychange', function () {
    if (!SY.code) return;
    if (document.visibilityState === 'hidden') { if (SY.timer) syncNow({ keep: true }); }
    else syncNow({ render: true });
  });

  /* ---------- utils ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dstr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return dstr(new Date()); }
  function addDays(s, n) { var p = s.split('-'); return dstr(new Date(+p[0], +p[1] - 1, +p[2] + n)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // 汉字注音：{漢字|かな} → <ruby>，点击汉字显示假名
  function rb(s) { return esc(s).replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby class="fg">$1<rt>$2</rt></ruby>'); }
  function jp(s) { return rb(FURI[s] || s).replace(/【([^】]*)】/g, '<mark>$1</mark>'); }
  function hl(s) { return jp(s); }
  function strip(s) { return String(s).replace(/[【】]/g, ''); }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function lvTag(lv) { return '<span class="tag tag--' + lv.toLowerCase() + '">' + lv + '</span>'; }

  var ICON = {
    say: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6h2.2L8 3.3v9.4L4.7 10H2.5z" fill="currentColor"/><path d="M10.6 5.4a3.6 3.6 0 0 1 0 5.2M12.4 3.6a6.2 6.2 0 0 1 0 8.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    ok: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bad: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    back: '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2.5L4.5 7 9 11.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chev: '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5.2L7 9.2l4-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    shuf: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5h2.6c1.5 0 2.4.7 3.2 2l1.4 2.9c.7 1.4 1.7 2.1 3.2 2.1H14M2 11.5h2.6c1.1 0 1.9-.4 2.5-1.1M9.3 5.6c.6-.7 1.4-1.1 2.5-1.1H14M12.3 2.8 14 4.5l-1.7 1.7M12.3 9.8 14 11.5l-1.7 1.7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    share: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 10V2M5 4.8 8 1.8l3 3M4.5 7H3.5v7h9V7h-1" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    search: '<svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12.2 12.2L16 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toast.tm); toast.tm = setTimeout(function () { t.classList.remove('is-on'); }, 2200);
  }

  /* ---------- speech ---------- */
  var canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  var jaVoice = null;
  function pickVoice() {
    if (!canSpeak) return;
    var vs = speechSynthesis.getVoices();
    jaVoice = vs.filter(function (v) { return /^ja/i.test(v.lang); })[0] || null;
  }
  if (canSpeak) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text, btn) {
    if (!canSpeak) return;
    speechSynthesis.cancel();
    document.querySelectorAll('.say.is-on').forEach(function (b) { b.classList.remove('is-on'); });
    var u = new SpeechSynthesisUtterance(strip(text));
    u.lang = 'ja-JP'; u.rate = 0.92; if (jaVoice) u.voice = jaVoice;
    if (btn) { btn.classList.add('is-on'); u.onend = u.onerror = function () { btn.classList.remove('is-on'); }; }
    speechSynthesis.speak(u);
  }
  function sayBtn(text) {
    if (!canSpeak || !S.set.tts) return '';
    return '<button class="say" type="button" data-act="say" data-text="' + esc(strip(text)) + '" aria-label="朗读">' + ICON.say + '</button>';
  }

  /* ---------- progress model ---------- */
  function card(id) { return S.cards[id]; }
  function status(id) { var c = card(id); if (!c) return 'new'; return c.b >= MASTER ? 'mastered' : 'learning'; }
  function inScope(i) { return S.set.scope === 'all' || i.lv === S.set.scope; }
  function logDay(ok) {
    var d = today(); var x = S.days[d] || (S.days[d] = { n: 0, ok: 0 });
    x.n++; if (ok) x.ok++;
  }
  function grade(id, ok, mode) {
    var t = today();
    var c = S.cards[id];
    if (mode === 'daily') {
      if (!c) c = S.cards[id] = { b: 0, r: 0, w: 0, due: t };
      if (ok) { c.b = Math.min(c.b + 1, INTERVAL.length - 1); c.r++; c.due = addDays(t, INTERVAL[c.b]); }
      else { c.b = 0; c.w++; c.due = addDays(t, 1); }
      c.last = t;
    } else if (c) {
      if (ok) c.r++;
      else { c.w++; c.b = Math.min(c.b, 1); if (c.due > addDays(t, 1)) c.due = addDays(t, 1); }
    }
  }
  function streak() {
    var d = today(); var n = 0;
    if (!(S.days[d] && S.days[d].n)) d = addDays(d, -1);
    while (S.days[d] && S.days[d].n) { n++; d = addDays(d, -1); }
    return n;
  }
  function totals() {
    var learned = 0, mastered = 0, r = 0, w = 0;
    Object.keys(S.cards).forEach(function (k) { var c = S.cards[k]; learned++; if (c.b >= MASTER) mastered++; r += c.r; w += c.w; });
    return { learned: learned, mastered: mastered, acc: r + w ? Math.round(r / (r + w) * 100) : null };
  }
  function dueOn(date) {
    return ITEMS.filter(function (i) { var c = card(i.id); return c && inScope(i) && c.due <= date; }).length;
  }

  /* ---------- sessions ---------- */
  function newSession(mode, entries, title) {
    var s = { mode: mode, title: title || '', date: today(), q: entries, total: entries.length, pos: 0, phase: 'idle', opts: null, pick: null, res: [] };
    enter(s); return s;
  }
  function enter(s) {
    s.pick = null; s.opts = null;
    if (s.pos >= s.q.length) { s.phase = 'done'; return; }
    var e = s.q[s.pos];
    if (e.k === 'new') s.phase = 'learn'; else startQuiz(s);
  }
  function startQuiz(s) {
    var it = BY[s.q[s.pos].id];
    s.opts = shuffle([answerOf(it)].concat(it.d));
    s.phase = 'quiz';
  }
  function answerOf(it) { var m = it.ex[0][0].match(/【([^】]*)】/); return m ? m[1] : ''; }

  function buildDaily() {
    var t = today();
    var pool = ITEMS.filter(inScope);
    var due = pool.filter(function (i) { var c = card(i.id); return c && c.due <= t; })
      .sort(function (a, b) { var ca = card(a.id), cb = card(b.id); return ca.due < cb.due ? -1 : ca.due > cb.due ? 1 : ca.b - cb.b; })
      .slice(0, 50);
    var unseen = pool.filter(function (i) { return !card(i.id); });
    if (S.set.order === 'rand') unseen.sort(function (a, b) { return hash(S.seed + ':' + a.id) - hash(S.seed + ':' + b.id); });
    var neu = unseen.slice(0, +S.set.per || 8);
    var q = due.map(function (i) { return { id: i.id, k: 'review' }; }).concat(neu.map(function (i) { return { id: i.id, k: 'new' }; }));
    S.daily = newSession('daily', q, '今日练习');
    save();
  }
  function ensureDaily() {
    if (!S.daily || S.daily.date !== today()) buildDaily();
    return S.daily;
  }
  var EXTRA = null;
  function activeSession() { return EXTRA && EXTRA.phase !== 'gone' ? EXTRA : ensureDaily(); }

  function answer(s, pick) {
    if (s.phase !== 'quiz') return;
    var e = s.q[s.pos]; var it = BY[e.id];
    var ok = pick === answerOf(it);
    s.pick = pick; s.phase = 'answer';
    if (e.k !== 'retry') {
      grade(e.id, ok, s.mode); logDay(ok);
      s.res.push({ id: e.id, ok: ok, k: e.k });
      if (!ok) s.q.push({ id: e.id, k: 'retry' });
    }
    save();
  }
  function next(s) {
    if (s.phase === 'learn') { startQuiz(s); }
    else if (s.phase === 'answer') { s.pos++; enter(s); }
    if (s.mode === 'daily') save();
  }

  function startExtra(entries, title) {
    if (!entries.length) { toast('没有可以练习的语法'); return; }
    EXTRA = newSession('extra', entries, title);
    if (location.hash === '#/study') render(); else location.hash = '#/study';
  }
  function practiceLearned() {
    var learned = ITEMS.filter(function (i) { return card(i.id); });
    if (!learned.length) { toast('先完成一次今日练习，再来巩固吧'); return; }
    learned.sort(function (a, b) { return (card(a.id).b - card(b.id).b) || (Math.random() - 0.5); });
    var pickN = shuffle(learned.slice(0, Math.max(20, Math.ceil(learned.length / 3)))).slice(0, 10);
    startExtra(pickN.map(function (i) { return { id: i.id, k: 'review' }; }), '巩固练习');
  }
  function uniqByPattern(ids) {
    var seen = {}; return ids.filter(function (id) { var p = BY[id].p; if (seen[p]) return false; seen[p] = 1; return true; });
  }
  function practiceGroup(gid) {
    var g = GBY[gid]; if (!g) return;
    startExtra(shuffle(uniqByPattern(g.items)).map(function (id) { return { id: id, k: 'review' }; }), '辨析练习');
  }

  /* ---------- shared item blocks ---------- */
  function coreOf(p) { return p.replace(/^～/, '').replace(/（[^）]*）/g, '').trim(); }
  var CORE = {}; ITEMS.forEach(function (i) { coreOf(i.p).split('／').forEach(function (c) { c = c.replace(/^～/, ''); if (c && !CORE[c]) CORE[c] = i.id; }); });
  var CORE_KEYS = Object.keys(CORE);
  function lookupOpt(o) {
    var c = [o, o + 'に', o + 'だ', 'て' + o, o.replace(/だ$/, ''), o.replace(/た$/, 'る')];
    for (var i = 0; i < c.length; i++) if (CORE[c[i]]) return CORE[c[i]];
    if (o.length >= 2) for (var k = 0; k < CORE_KEYS.length; k++) if (CORE_KEYS[k].indexOf(o) === 0) return CORE[CORE_KEYS[k]];
    return null;
  }

  function exList(it, from) {
    return '<ul class="exs">' + it.ex.slice(from || 0).map(function (e) {
      return '<li class="ex"><span class="ex__ja" lang="ja">' + hl(e[0]) + '</span>' + sayBtn(e[0]) + '<span class="ex__zh">' + esc(e[1]) + '</span></li>';
    }).join('') + '</ul>';
  }
  function confuseBlock(it) {
    if (!it.g || !it.g.length) return '';
    return '<div class="block"><h4>易混淆</h4><div class="confuse">' + it.g.map(function (gid) {
      var g = GBY[gid]; if (!g) return '';
      var sibs = uniqByPattern(g.items).filter(function (id) { return BY[id].p !== it.p; }).slice(0, 8);
      return '<div><a class="confuse__g" href="#/compare/' + g.id + '"><b>' + esc(g.t) + '</b><span>' + esc(g.s) + '</span></a>' +
        (sibs.length ? '<div class="sibs">' + sibs.map(function (id) { return '<a class="chip chip--ja" href="#/item/' + id + '">' + esc(BY[id].p) + '</a>'; }).join('') + '</div>' : '') + '</div>';
    }).join('') + '</div></div>';
  }
  function itemBody(it, opts) {
    opts = opts || {};
    var st = status(it.id);
    var stText = { 'new': '未学', learning: '学习中', mastered: '已掌握' }[st];
    return '' +
      (opts.noHead ? '' : '<div class="kind">第 ' + it.id + ' 条</div><h1 class="pattern" lang="ja">' + jp(it.p) + '</h1>') +
      '<p class="meaning">' + esc(it.m) + '</p>' +
      '<div class="meta">' + lvTag(it.lv) + '<span class="tag">' + esc(it.cat) + '</span><span class="tag">' + stText + '</span></div>' +
      '<div class="block"><h4>接续</h4><div class="conn">' + esc(it.c) + '</div></div>' +
      '<div class="block"><h4>要点</h4><p class="note">' + esc(it.n) + '</p></div>' +
      '<div class="block"><h4>例句<span class="h4-hint">点汉字显示假名</span></h4>' + exList(it) + '</div>' +
      confuseBlock(it);
  }

  /* ---------- views ---------- */
  /* ---------- 添加到主屏幕（iPhone / iPad 的 Safari 里才提示） ---------- */
  var STANDALONE = window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  function installHint() {
    var ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var dismissed = false; try { dismissed = localStorage.getItem('labagound-a2hs') === '1'; } catch (e) {}
    if (!ios || STANDALONE || dismissed) return '';
    return '<div class="card a2hs"><img src="icons/icon-180.png" alt="" width="48" height="48"><div><b>装到主屏幕，当 App 用</b>' +
      '<p>点 Safari 的「分享」' + ICON.share + '（新版 iOS 在「···」菜单里），再选「添加到主屏幕」。之后从桌面图标打开，全屏、没网也能用。</p></div>' +
      '<button class="a2hs__x" type="button" data-act="a2hs" aria-label="不再提示">' + ICON.x + '</button></div>';
  }
  function viewToday() {
    var s = ensureDaily();
    var t = today(); var d = new Date();
    var doneN = s.res.length; var total = s.total;
    var reviewN = s.q.filter(function (e, i) { return i < s.total && e.k === 'review'; }).length;
    var newN = s.total - reviewN;
    var pct = total ? Math.min(1, doneN / total) : 1;
    var C = 2 * Math.PI * 54;
    var head, body, btns;
    if (!total) {
      head = '今天没有安排'; body = S.set.scope === 'all' && Object.keys(S.cards).length >= ITEMS.length ? '297 条都已经学过，今天也没有到期的复习。' : '当前范围内没有新语法，也没有到期的复习。';
      btns = '<button class="btn" data-act="practice">随便练 10 题</button>';
    } else if (s.phase === 'done') {
      var ok = s.res.filter(function (r) { return r.ok; }).length;
      head = '今天的练习完成了'; body = '答对 ' + ok + ' / ' + s.res.length + ' 题。明天还有 ' + dueOn(addDays(t, 1)) + ' 条到期复习。';
      btns = '<button class="btn" data-act="practice">再练一组</button><a class="btn btn--ghost" href="#/study" data-act="daily">查看结果</a>';
    } else if (doneN || s.pos || s.phase === 'quiz' && s.q[0] && s.q[0].k === 'new') {
      head = '已完成 ' + doneN + ' / ' + total; body = '复习 ' + reviewN + ' 条 · 新学 ' + newN + ' 条，进度会自动保存。';
      btns = '<a class="btn" href="#/study" data-act="daily">继续练习</a>';
    } else {
      head = '复习 ' + reviewN + ' 条 · 新学 ' + newN + ' 条'; body = reviewN ? '先把到期的复习做完，再学今天的新语法。' : '每条新语法先看讲解，再做一道选择题。';
      btns = '<a class="btn" href="#/study" data-act="daily">开始练习</a>';
    }
    btns += '<a class="btn btn--ghost" href="#/words">单词卡</a>';
    var T = totals();
    var days = ''; for (var k = 13; k >= 0; k--) {
      var ds = addDays(t, -k); var x = S.days[ds]; var n = x ? x.n : 0;
      var l = n === 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : 3;
      days += '<i data-l="' + l + '"' + (k === 0 ? ' class="today"' : '') + ' title="' + ds + '：' + n + ' 题"></i>';
    }
    var stars = GROUPS.filter(function (g) { return g.star; });
    var dayIdx = Math.floor(new Date(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10)).getTime() / 864e5);
    var gt = (dayIdx % 3 === 0 ? GROUPS : stars)[dayIdx % (dayIdx % 3 === 0 ? GROUPS.length : stars.length)];

    return '<div class="wrap page fade-in">' + installHint() +
      '<div class="eyebrow">' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · 星期' + WEEK[d.getDay()] + '</div>' +
      '<h1 class="h1">每日目标</h1>' +
      '<div class="hero"><div class="ring" role="img" aria-label="今日进度 ' + Math.round(pct * 100) + '%"><svg viewBox="0 0 120 120"><circle class="ring__track" cx="60" cy="60" r="54" fill="none" stroke-width="10"/><circle class="ring__bar" cx="60" cy="60" r="54" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - pct)).toFixed(1) + '"/></svg>' +
      '<div class="ring__label"><span class="ring__big num">' + (total ? doneN + '<span class="muted" style="font-size:18px">/' + total + '</span>' : '—') + '</span><span class="ring__small">今日</span></div></div>' +
      '<div class="hero__body"><h2>' + head + '</h2><p>' + body + '</p><div class="btn-row">' + btns + '</div></div></div>' +

      '<section class="section"><div class="section__head"><h2>学习记录</h2><a href="#/list">语法库</a></div>' +
      '<div class="stats">' +
      '<div class="stat"><b class="num">' + T.learned + '<span class="muted" style="font-size:15px"> / ' + ITEMS.length + '</span></b><span>已学</span></div>' +
      '<div class="stat"><b class="num">' + T.mastered + '</b><span>已掌握</span></div>' +
      '<div class="stat"><b class="num">' + streak() + '</b><span>连续天数</span></div>' +
      '<div class="stat"><b class="num">' + (T.acc === null ? '—' : T.acc + '%') + '</b><span>正确率</span></div>' +
      '</div><div class="days" aria-label="最近 14 天">' + days + '</div><div class="days__legend"><span>14 天前</span><span>今天</span></div></section>' +

      (gt ? '<section class="section"><div class="section__head"><h2>今日辨析</h2><a href="#/compare">全部 ' + GROUPS.length + ' 组</a></div>' +
        '<a class="card teaser" href="#/compare/' + gt.id + '"><div class="eyebrow">' + (gt.star ? '★ 重点辨析' : '辨析') + '</div><h3 lang="ja">' + esc(gt.t) + '</h3><p>' + esc(gt.s) + '</p></a></section>' : '') +

      '<section class="section"><div class="section__head"><h2>单词</h2><a href="#/words/list">词表</a></div>' +
        '<a class="card teaser wteaser" href="#/words"><div><div class="eyebrow">N2 词汇 1439 个 · 不考试</div><h3>翻几张单词卡，混个眼熟</h3>' +
        '<p>今天看了 ' + ((S.w && S.w.days && S.w.days[t]) || 0) + ' 个</p></div><span class="wteaser__go" aria-hidden="true">' + ICON.back + '</span></a></section>' +
      '<section class="section"><div class="card card--flat"><p class="small muted">每天先复习到期的语法，再学新的。答对后间隔会拉长（1 → 3 → 7 → 14 → 30 天……），答错的第二天会再出现，并且当场在最后再考一次。连续答对到 30 天间隔就算“已掌握”。右上角可以设置每天新学几条。</p></div></section>' +
      '</div>';
  }

  function viewStudy() {
    var s = activeSession();
    if (s.phase === 'done') return viewDone(s);
    var e = s.q[s.pos]; var it = BY[e.id];
    var kinds = { 'new': ['kind--new', '新语法'], review: ['kind--review', '复习'], retry: ['kind--retry', '错题重做'] };
    var kd = kinds[e.k];
    var bar = '<div class="study__bar"><a class="icon-btn" href="#/" aria-label="返回">' + ICON.back + '</a><div class="progress"><i style="width:' + Math.round(Math.min(s.pos, s.q.length) / s.q.length * 100) + '%"></i></div><span class="study__count num">' + (s.pos + 1) + ' / ' + s.q.length + '</span></div>';
    var inner;
    if (s.phase === 'learn') {
      inner = '<div class="card fade-in"><div class="kind ' + kd[0] + '">' + kd[1] + ' · 第 ' + it.id + ' 条</div><h1 class="pattern" lang="ja">' + jp(it.p) + '</h1>' + itemBody(it, { noHead: true }) + '</div>' +
        '<div class="sticky-next"><button class="btn btn--block" data-act="next">记住了，做一道题</button><p class="hint">按 Enter 继续</p></div>';
    } else {
      var ans = answerOf(it);
      var src = it.ex[0][0]; var m = (FURI[src] || src).match(/^(.*?)【([^】]*)】(.*)$/);
      var answered = s.phase === 'answer'; var ok = answered && s.pick === ans;
      var blank = answered ? '<span class="blank ok">' + rb(m[2]) + '</span>' : '<span class="blank" aria-label="空格">　</span>';
      var qhtml = rb(m[1]) + blank + rb(m[3]);
      var opts = s.opts.map(function (o, idx) {
        var cls = 'opt';
        if (answered) { if (o === ans) cls += ' is-right'; else if (o === s.pick) cls += ' is-wrong'; else cls += ' is-dim'; }
        return '<button class="' + cls + '" type="button" data-act="pick" data-opt="' + esc(o) + '"' + (answered ? ' disabled' : '') + '><kbd>' + (idx + 1) + '</kbd><span lang="ja">' + esc(o) + '</span></button>';
      }).join('');
      inner = '<div class="card fade-in"><div class="kind ' + kd[0] + '">' + kd[1] + (e.k === 'new' ? ' · 小测' : '') + '</div>' +
        '<p class="small muted" style="margin-top:6px">选出填入空格最合适的一项 · 点汉字看读音</p>' +
        '<p class="q" lang="ja">' + qhtml + '</p>' + (answered ? '<p class="q__zh">' + esc(it.ex[0][1]) + '</p>' : '') +
        '<div class="opts">' + opts + '</div>';
      if (answered) {
        var others = s.opts.filter(function (o) { return o !== ans; }).map(function (o) { var id = lookupOpt(o); return id ? [o, id] : null; }).filter(Boolean);
        inner += '<div class="verdict ' + (ok ? 'verdict--ok' : 'verdict--bad') + '">' + (ok ? ICON.ok + '答对了' : ICON.bad + '答错了，正确答案是「' + esc(ans) + '」') + (e.k === 'retry' ? '' : '<small>' + (ok ? nextText(e.id, s.mode) : '稍后再考一次') + '</small>') + '</div>' +
          '<div class="explain"><div class="kind">第 ' + it.id + ' 条</div><h2 class="pattern" lang="ja">' + jp(it.p) + '</h2>' + itemBody(it, { noHead: true }) +
          (others.length ? '<div class="block"><h4>其他选项是什么意思</h4><div class="sibs">' + others.map(function (x) { return '<a class="chip chip--ja" href="#/item/' + x[1] + '">' + esc(x[0]) + '<span class="muted">· ' + esc(BY[x[1]].m) + '</span></a>'; }).join('') + '</div></div>' : '') +
          '</div>';
      }
      inner += '</div>';
      if (answered) inner += '<div class="sticky-next"><button class="btn btn--block" data-act="next" id="nextBtn">' + (s.pos + 1 >= s.q.length ? '完成' : '下一题') + '</button><p class="hint">按 Enter 继续</p></div>';
      else inner += '<p class="hint" style="margin-top:14px">可以按 1–4 选择</p>';
    }
    return '<div class="wrap page"><div class="study">' + bar + inner + '</div></div>';
  }
  function nextText(id, mode) {
    if (mode !== 'daily') return '';
    var c = card(id); if (!c) return '';
    var days = INTERVAL[c.b];
    return c.b >= MASTER ? '已掌握 · ' + days + ' 天后复习' : days + ' 天后复习';
  }

  function viewDone(s) {
    var ok = s.res.filter(function (r) { return r.ok; }).length;
    var wrong = []; var seen = {};
    s.res.forEach(function (r) { if (!r.ok && !seen[r.id]) { seen[r.id] = 1; wrong.push(r.id); } });
    var isDaily = s.mode === 'daily';
    var newN = s.res.filter(function (r) { return r.k === 'new'; }).length;
    if (!s.res.length) {
      return '<div class="wrap page"><div class="study done fade-in"><div class="done__icon">' + ICON.ok + '</div><h2>今天没有要练的</h2><p class="muted" style="margin-top:8px">可以去语法库看看，或者随便练几题。</p><div class="btn-row"><button class="btn" data-act="practice">随便练 10 题</button><a class="btn btn--ghost" href="#/list">语法库</a></div></div></div>';
    }
    return '<div class="wrap page"><div class="study done fade-in">' +
      '<div class="done__icon">' + ICON.ok + '</div><h2>' + (isDaily ? '今天的练习完成了' : esc(s.title) + '完成') + '</h2>' +
      '<p class="muted" style="margin-top:8px">' + (isDaily ? '明天还有 ' + dueOn(addDays(today(), 1)) + ' 条到期复习。' : '这组练习不会打乱每日复习的安排。') + '</p>' +
      '<div class="stats"><div class="stat"><b class="num">' + ok + ' / ' + s.res.length + '</b><span>首次答对</span></div><div class="stat"><b class="num">' + Math.round(ok / s.res.length * 100) + '%</b><span>正确率</span></div>' +
      (isDaily ? '<div class="stat"><b class="num">' + newN + '</b><span>新学</span></div><div class="stat"><b class="num">' + streak() + '</b><span>连续天数</span></div>' : '<div class="stat"><b class="num">' + wrong.length + '</b><span>答错</span></div><div class="stat"><b class="num">' + streak() + '</b><span>连续天数</span></div>') + '</div>' +
      '<div class="btn-row">' + (wrong.length ? '<button class="btn" data-act="redo" data-ids="' + wrong.join(',') + '">错题再练</button>' : '') + '<button class="btn ' + (wrong.length ? 'btn--ghost' : '') + '" data-act="practice">再练一组</button><a class="btn btn--plain" href="#/">回到今日</a></div>' +
      (wrong.length ? '<div class="wrong-list"><h3>这次答错的</h3><ul class="rows">' + wrong.map(rowHtml).join('') + '</ul></div>' : '') +
      '</div></div>';
  }

  /* list */
  var LF = { q: '', lv: 'all', st: 'all' };
  function rowHtml(id) {
    var it = BY[id];
    return '<li><a class="row" href="#/item/' + id + '"><span class="row__id">' + id + '</span><span class="row__p" lang="ja">' + esc(it.p) + '</span><span class="row__m">' + esc(it.m) + '</span><span class="row__s">' + lvTag(it.lv) + '<i class="status" data-s="' + status(id) + '" title="' + { 'new': '未学', learning: '学习中', mastered: '已掌握' }[status(id)] + '"></i></span></a></li>';
  }
  function filterItems() {
    var q = LF.q.trim().toLowerCase().replace(/[～~]/g, '');
    return ITEMS.filter(function (i) {
      if (LF.lv !== 'all' && i.lv !== LF.lv) return false;
      if (LF.st !== 'all' && status(i.id) !== LF.st) return false;
      if (!q) return true;
      if (/^\d+$/.test(q)) return String(i.id) === q;
      var hay = (i.p + ' ' + i.m + ' ' + i.n + ' ' + i.ex.map(function (e) { return strip(e[0]) + ' ' + e[1]; }).join(' ')).toLowerCase().replace(/[～~]/g, '');
      return hay.indexOf(q) >= 0;
    });
  }
  function listResults() {
    var list = filterItems();
    if (!list.length) return '<div class="empty">没有找到符合条件的语法</div>';
    var out = ''; var cur = null; var buf = [];
    function flush() { if (buf.length) out += '<div class="cat"><h3>' + esc(cur) + '</h3><ul class="rows">' + buf.join('') + '</ul></div>'; buf = []; }
    list.forEach(function (i) { var key = i.lv + '｜' + i.cat; if (key !== cur) { flush(); cur = key; } buf.push(rowHtml(i.id)); });
    flush();
    return '<p class="small muted" style="margin-top:4px">' + list.length + ' 条</p>' + out;
  }
  function chip(group, val, label) { return '<button class="chip" type="button" data-act="filter" data-k="' + group + '" data-v="' + val + '" aria-pressed="' + (LF[group] === val) + '">' + label + '</button>'; }
  function viewList() {
    var T = totals();
    return '<div class="wrap page fade-in"><div class="eyebrow">共 ' + ITEMS.length + ' 条 · 已学 ' + T.learned + ' · 已掌握 ' + T.mastered + '</div><h1 class="h1">语法库</h1>' +
      '<div class="toolbar"><label class="search">' + ICON.search + '<input id="q" type="search" placeholder="搜索句型、意思、例句或编号" value="' + esc(LF.q) + '" autocomplete="off"></label>' +
      '<div class="chips">' + chip('lv', 'all', '全部') + chip('lv', 'N3', 'N3') + chip('lv', 'N2', 'N2') + '<span style="width:8px"></span>' + chip('st', 'all', '全部状态') + chip('st', 'new', '未学') + chip('st', 'learning', '学习中') + chip('st', 'mastered', '已掌握') + '</div></div>' +
      '<div id="results">' + listResults() + '</div></div>';
  }

  function viewItem(id) {
    var it = BY[id]; if (!it) return viewNotFound();
    var prev = BY[id - 1], nxt = BY[id + 1];
    return '<div class="wrap page fade-in"><a class="back" href="#/list">' + ICON.back + '语法库</a>' +
      '<div class="card" style="margin-top:16px">' + itemBody(it) +
      '<div class="block btn-row">' + (it.g.length ? '<button class="btn btn--sm" data-act="group" data-g="' + it.g[0] + '">练习这组易混淆</button>' : '') + '<button class="btn btn--ghost btn--sm" data-act="one" data-id="' + it.id + '">做一道题</button></div></div>' +
      '<nav class="pager">' + (prev ? '<a href="#/item/' + prev.id + '"><small>上一条 · ' + prev.id + '</small><span lang="ja">' + esc(prev.p) + '</span></a>' : '<span></span>') +
      (nxt ? '<a href="#/item/' + nxt.id + '"><small>下一条 · ' + nxt.id + '</small><span lang="ja">' + esc(nxt.p) + '</span></a>' : '<span></span>') + '</nav></div>';
  }

  function groupHtml(g, open) {
    var ids = uniqByPattern(g.items);
    return '<details class="card group" id="g-' + g.id + '"' + (open ? ' open' : '') + '><summary><h3 lang="ja">' + (g.star ? '<span class="star">★ 重点</span>' : '') + esc(g.t) + '</h3><p>' + esc(g.s) + '</p><span class="chev">' + ICON.chev + '</span></summary>' +
      '<div class="group__body"><table class="cmp"><tbody>' + g.pts.map(function (p) { return '<tr><th lang="ja">' + jp(p[0]) + '</th><td>' + esc(p[1]) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<div class="block"><h4>对比例句</h4><ul class="pairs">' + g.ex.map(function (e) {
        return '<li class="pair' + (e[2] ? '' : ' pair--bad') + '"><span class="pair__mk ' + (e[2] ? 'ok' : 'bad') + '">' + (e[2] ? '✓' : '✗') + '</span><span class="pair__ja" lang="ja">' + hl(e[0]) + '</span><span class="pair__zh">' + esc(e[1]) + '</span></li>';
      }).join('') + '</ul></div>' +
      '<div class="block"><h4>相关条目</h4><div class="sibs">' + ids.map(function (id) { return '<a class="chip chip--ja" href="#/item/' + id + '">' + esc(BY[id].p) + '</a>'; }).join('') + '</div></div>' +
      '<div class="block"><button class="btn btn--sm" data-act="group" data-g="' + g.id + '">练这组 · ' + ids.length + ' 题</button></div></div></details>';
  }
  function viewCompare(gid) {
    var list = GROUPS.filter(function (g) { return g.star; }).concat(GROUPS.filter(function (g) { return !g.star; }));
    return '<div class="wrap page fade-in"><div class="eyebrow">' + GROUPS.length + ' 组 · ★ 为原文档重点辨析索引</div><h1 class="h1">易混淆辨析</h1>' +
      '<p class="lead">每组列出区别要点和对比例句，✗ 是常见的错误用法。点“练这组”可以把这组句型放在一起做题。</p>' +
      '<div class="groups">' + list.map(function (g) { return groupHtml(g, g.id === gid); }).join('') + '</div></div>';
  }
  function viewNotFound() { return '<div class="wrap page"><div class="empty">没有这个页面。<a href="#/">回到今日</a></div></div>'; }

  /* ---------- words（单词：不考试，只为混个眼熟） ---------- */
  var W = null;
  function loadWords(cb) {
    if (window.WORDS) { W = window.WORDS; cb(); return; }
    var sc = document.createElement('script'); sc.src = 'words.js';
    sc.onload = function () { W = window.WORDS; cb(); };
    sc.onerror = function () { $('#main').innerHTML = '<div class="wrap page"><div class="empty">单词数据加载失败，请刷新重试。</div></div>'; };
    document.head.appendChild(sc);
  }
  function ws() {
    var w = S.w || (S.w = {});
    if (typeof w.seed !== 'number') w.seed = Math.floor(Math.random() * 1e9);
    w.pos = w.pos || {}; w.cat = w.cat == null ? -1 : w.cat; w.days = w.days || {};
    return w;
  }
  var wordOrder = null;
  function wordList(cat) {
    if (!wordOrder) { var st = ws(); wordOrder = W.words.slice().sort(function (a, b) { return hash(st.seed + ':' + a[0]) - hash(st.seed + ':' + b[0]); }); }
    return cat < 0 ? wordOrder : wordOrder.filter(function (x) { return x[1] === cat; });
  }
  var flashOpen = false;
  function wordsTabs(cur) {
    var tabs = [['', '刷单词'], ['list', '词表'], ['yomi', '易错读音'], ['pairs', '近义同音'], ['parts', '构词']];
    return '<nav class="chips chips--scroll wtabs" aria-label="单词">' + tabs.map(function (t) { return '<a class="chip" href="#/words' + (t[0] ? '/' + t[0] : '') + '" aria-pressed="' + (cur === t[0]) + '">' + t[1] + '</a>'; }).join('') + '</nav>';
  }
  function wordsHead(cur, sub) {
    return '<div class="eyebrow">N2 文字・词汇 · ' + W.words.length + ' 词</div><h1 class="h1 h1--sm">单词</h1>' +
      '<p class="lead lead--sm">' + sub + '</p>' + wordsTabs(cur);
  }
  function catChips(cur, act) {
    return '<div class="chips chips--scroll" style="margin-top:10px">' + [[-1, '全部']].concat(W.cats.map(function (c, i) { return [i, c]; })).map(function (c) {
      return '<button class="chip" type="button" data-act="' + act + '" data-v="' + c[0] + '" aria-pressed="' + (cur === c[0]) + '">' + esc(c[1]) + '</button>';
    }).join('') + '</div>';
  }
  function viewFlash() {
    var st = ws(); var list = wordList(st.cat); var key = String(st.cat);
    var i = ((st.pos[key] || 0) % list.length + list.length) % list.length;
    var w = list[i]; var kana = w[2] === w[3];
    var today = st.days[todayKey()] || 0;
    var open = flashOpen || st.reveal;
    return '<div class="wrap page fade-in">' + wordsHead('', '不打分、不重复出题：一个接一个往下翻，见得多了自然眼熟。') +
      catChips(st.cat, 'wcat') +
      '<div class="flash">' +
      '<div class="flash__meta"><span>' + esc(W.cats[w[1]]) + '</span><span class="num">本轮 ' + (i + 1) + ' / ' + list.length + ' · 今天看了 ' + today + ' 个</span></div>' +
      '<div class="card flash__card' + (open ? ' is-open' : '') + '" data-act="wflip" role="button" tabindex="0" aria-label="点一下看读音和意思">' +
      '<div class="flash__word" lang="ja">' + esc(w[2]) + '</div>' +
      '<div class="flash__back">' +
      (kana ? '' : '<div class="flash__yomi" lang="ja">' + esc(w[3]) + '</div>') +
      '<div class="flash__mean">' + esc(w[4]) + '</div>' +
      (w[5] ? '<div class="flash__ex" lang="ja">' + esc(w[5]) + '</div>' : '') + '</div>' +
      '<div class="flash__tap">点一下看读音和意思</div>' +
      (canSpeak && S.set.tts ? '<button class="say flash__say" type="button" data-act="say" data-text="' + esc(w[3]) + '" aria-label="朗读">' + ICON.say + '</button>' : '') +
      '</div>' +
      '<div class="flash__nav"><button class="btn btn--plain" type="button" data-act="wprev" aria-label="上一个">' + ICON.back + '</button>' +
      '<button class="btn flash__next" type="button" data-act="wnext">下一个</button></div>' +
      '<label class="flash__opt"><input type="checkbox" data-act="wreveal"' + (st.reveal ? ' checked' : '') + '> 直接显示读音和意思（快速过一遍）</label>' +
      '<p class="hint">左右滑动或按 ← → 翻页，空格翻面</p></div></div>';
  }
  function todayKey() { return today(); }
  function flashMove(d) {
    var st = ws(); var key = String(st.cat);
    st.pos[key] = (st.pos[key] || 0) + d;
    if (d > 0) { var t = todayKey(); st.days[t] = (st.days[t] || 0) + 1; }
    flashOpen = false; save();
    $('#main').innerHTML = viewFlash();
  }

  var WL = { q: '', cat: -1, hide: false, n: 80 };
  function wordRows() {
    var q = WL.q.trim().toLowerCase();
    var list = W.words.filter(function (w) {
      if (WL.cat >= 0 && w[1] !== WL.cat) return false;
      if (!q) return true;
      return (w[2] + ' ' + w[3] + ' ' + w[4] + ' ' + w[5]).toLowerCase().indexOf(q) >= 0;
    });
    if (!list.length) return '<div class="empty">没有找到</div>';
    return '<p class="small muted" style="margin-top:4px">' + list.length + ' 个</p><ul class="wrows' + (WL.hide ? ' is-hidden' : '') + '">' + list.slice(0, WL.n).map(function (w) {
      return '<li class="wrow"><span class="wrow__w" lang="ja">' + esc(w[2]) + '</span><span class="wrow__r" lang="ja">' + (w[2] === w[3] ? '' : esc(w[3])) + '</span>' +
        '<span class="wrow__m" data-act="wpeek">' + esc(w[4]) + '</span><span class="wrow__x" lang="ja">' + esc(w[5]) + '</span></li>';
    }).join('') + '</ul>' + (list.length > WL.n ? '<div style="text-align:center;margin-top:18px"><button class="btn btn--ghost btn--sm" data-act="wmore">再显示 ' + Math.min(80, list.length - WL.n) + ' 个</button></div>' : '');
  }
  function viewWordList() {
    return '<div class="wrap page fade-in">' + wordsHead('list', '整张表扫一遍。打开“遮住中文”可以先自己想意思，点一下再看。') +
      '<div class="toolbar"><label class="search">' + ICON.search + '<input id="wq" type="search" placeholder="搜索单词、读音或中文" value="' + esc(WL.q) + '" autocomplete="off"></label>' +
      '<div class="chips"><button class="chip" type="button" data-act="whide" aria-pressed="' + WL.hide + '">遮住中文</button></div></div>' +
      catChips(WL.cat, 'wlcat') + '<div id="wresults">' + wordRows() + '</div></div>';
  }
  function viewYomi() {
    var out = ''; var cur = null;
    W.yomi.forEach(function (y) {
      if (y[0] !== cur) { if (cur !== null) out += '</ul></div>'; cur = y[0]; out += '<div class="cat"><h3>' + esc(cur) + '</h3><ul class="wrows">'; }
      out += '<li class="wrow"><span class="wrow__w" lang="ja">' + esc(y[1]) + '</span><span class="wrow__r" lang="ja">' + esc(y[2]) + '</span><span class="wrow__m">' + esc(y[3]) + '</span></li>';
    });
    return '<div class="wrap page fade-in">' + wordsHead('yomi', '长音、促音、浊音和特殊读法，最容易在读音题里丢分。') + out + '</ul></div></div>';
  }
  function viewPairs() {
    return '<div class="wrap page fade-in">' + wordsHead('pairs', '同音或近义的词放在一起看：意思、写法和搭配的区别。') +
      '<div class="pairs-grid">' + W.pairs.map(function (p) {
        return '<div class="card wpair"><div class="wpair__w" lang="ja">' + esc(p[0]) + '</div><div class="wpair__r" lang="ja">' + esc(p[1]) + '</div><p class="wpair__n">' + esc(p[2]) + '</p><p class="wpair__x" lang="ja">' + esc(p[3]) + '</p></div>';
      }).join('') + '</div></div>';
  }
  function viewParts() {
    return '<div class="wrap page fade-in">' + wordsHead('parts', '常见前缀、后缀和复合动词后项。要连同现成的词一起记。') +
      '<ul class="wrows wrows--parts">' + W.parts.map(function (p) {
        return '<li class="wrow"><span class="wrow__w" lang="ja">' + esc(p[0]) + '</span><span class="wrow__r" lang="ja">' + esc(p[1]) + '</span><span class="wrow__m">' + esc(p[2]) + '</span><span class="wrow__x" lang="ja">' + esc(p[3]) + (p[4] ? '　<span class="muted">' + esc(p[4]) + '</span>' : '') + '</span></li>';
      }).join('') + '</ul></div>';
  }
  function viewWords(sub) {
    if (!W) { loadWords(render); return '<div class="wrap page"><div class="empty">正在加载单词……</div></div>'; }
    if (sub === 'list') return viewWordList();
    if (sub === 'yomi') return viewYomi();
    if (sub === 'pairs') return viewPairs();
    if (sub === 'parts') return viewParts();
    return viewFlash();
  }


  /* ---------- table（N2 文字・词汇重点表：原表照搬，6 张工作表） ---------- */
  var T = null;
  function loadTable(cb) {
    if (window.TABLE) { T = window.TABLE; cb(); return; }
    var sc = document.createElement('script'); sc.src = 'table.js';
    sc.onload = function () { T = window.TABLE; cb(); };
    sc.onerror = function () { $('#main').innerHTML = '<div class="wrap page"><div class="empty">表格数据加载失败，请刷新重试。</div></div>'; };
    document.head.appendChild(sc);
  }
  var LEVELS = ['', '未学', '复习中', '已掌握'];
  function tbs() { var t = S.tb || (S.tb = {}); t.lv = t.lv || {}; t.lt = t.lt || {}; return t; }
  var TL = { key: 'words', q: '', cat: '', lv: '', n: 150, shuf: 0 };
  var JA_COLS = { words: [2, 3, 5], kanji: [0, 2, 3, 4, 5, 6, 7], yomi: [1, 2], pairs: [0, 1, 3], parts: [0, 1, 3] };
  function sheetOf(key) { return T.sheets.filter(function (x) { return x.key === key; })[0] || T.sheets[0]; }
  function tableRowsFor(sh) {
    var q = TL.q.trim().toLowerCase(), st = tbs();
    var list = sh.rows.map(function (r, i) { return [r, i]; }).filter(function (x) {
      var r = x[0];
      if (sh.key === 'words') {
        if (TL.cat && r[1] !== TL.cat) return false;
        if (TL.lv !== '' && String(st.lv[r[0]] || 0) !== TL.lv) return false;
      }
      return !q || r.join(' ').toLowerCase().indexOf(q) >= 0;
    });
    if (TL.shuf) list.sort(function (a, b) { return TL.rank[a[1]] - TL.rank[b[1]]; });
    return list.map(function (x) { return x[0]; });
  }
  function cellHtml(sh, r, i) {
    var v = r[i];
    if (sh.key === 'words' && i === 6) {
      var cur = tbs().lv[r[0]] || 0;
      return '<td class="tb__lv"><select data-tblv="' + r[0] + '" aria-label="掌握程度" data-v="' + cur + '">' + LEVELS.map(function (l, k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + (l || '—') + '</option>'; }).join('') + '</select></td>';
    }
    var ja = (JA_COLS[sh.key] || []).indexOf(i) >= 0;
    var cls = (typeof v === 'number' ? 'num' : '') + (sh.key === 'about' && i === 1 ? ' tb__wide' : '');
    var txt = esc(v);
    if (sh.key === 'about') txt = txt.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    return '<td' + (cls.trim() ? ' class="' + cls.trim() + '"' : '') + (ja ? ' lang="ja"' : '') + '>' + txt + '</td>';
  }
  function tableBody() {
    var sh = sheetOf(TL.key); var list = tableRowsFor(sh);
    if (!list.length) return '<div class="empty">没有找到</div>';
    var more = list.length > TL.n;
    return '<p class="small muted tb__count">' + list.length + ' 行' + (list.length !== sh.rows.length ? ' / 共 ' + sh.rows.length + ' 行' : '') + '</p>' +
      '<div class="tb__scroll"><table class="tb tb--' + sh.key + '"><thead><tr>' + sh.head.map(function (h) { return '<th scope="col">' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      list.slice(0, TL.n).map(function (r) { return '<tr>' + r.map(function (v, i) { return cellHtml(sh, r, i); }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>' +
      (more ? '<div class="btn-row tb__more"><button class="btn btn--ghost btn--sm" data-act="tmore">再显示 ' + Math.min(150, list.length - TL.n) + ' 行</button><button class="btn btn--plain btn--sm" data-act="tall">全部显示</button></div>' : '');
  }
  function shufBar() {
    return '<div class="chips tb__shuf" id="tshuf"><button class="chip" type="button" data-act="tshuf" aria-pressed="' + !!TL.shuf + '">' + ICON.shuf + '打乱顺序</button>' +
      (TL.shuf ? '<button class="chip" type="button" data-act="treshuf">再打乱一次</button>' : '') + '</div>';
  }
  function viewTable(key) {
    if (!T) { loadTable(render); return '<div class="wrap page"><div class="empty">正在加载表格……</div></div>'; }
    if (key && key !== TL.key) { TL.key = key; TL.q = ''; TL.cat = ''; TL.lv = ''; TL.n = 150; TL.shuf = 0; }
    var sh = sheetOf(TL.key);
    var tabs = '<nav class="chips chips--scroll" aria-label="工作表">' + T.sheets.map(function (x) {
      return '<a class="chip" href="#/table/' + x.key + '" aria-pressed="' + (x.key === sh.key) + '">' + esc(x.name) + '</a>';
    }).join('') + '</nav>';
    var filters = '';
    if (sh.key === 'words') {
      var cats = []; sh.rows.forEach(function (r) { if (cats.indexOf(r[1]) < 0) cats.push(r[1]); });
      filters = '<div class="tb__filters"><label class="tb__sel"><span>类别</span><select data-tbf="cat"><option value="">全部</option>' + cats.map(function (c) { return '<option' + (TL.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></label>' +
        '<label class="tb__sel"><span>掌握程度</span><select data-tbf="lv"><option value="">全部</option>' + LEVELS.map(function (l, k) { return '<option value="' + k + '"' + (TL.lv === String(k) ? ' selected' : '') + '>' + (l || '未标记') + '</option>'; }).join('') + '</select></label></div>';
    }
    return '<div class="wrap wrap--wide page fade-in">' +
      '<div class="eyebrow">JLPT N2 · 原表</div><h1 class="h1 h1--sm">' + esc(T.sheets[0].title) + '</h1>' +
      '<p class="lead lead--sm">6 张工作表，内容和原 Excel 一样。<a href="JLPT_N2_Vocabulary_Kanji.xlsx" download>下载 Excel</a></p>' +
      '<div class="tb__tabs">' + tabs + '</div>' +
      '<div class="tb__head">' + (sh.title !== T.sheets[0].title ? '<h2>' + esc(sh.title) + '</h2>' : '') + sh.notes.map(function (n) { return '<p>' + esc(n) + '</p>'; }).join('') + '</div>' +
      (sh.key !== 'about' ? '<div class="toolbar tb__bar"><label class="search">' + ICON.search + '<input id="tq" type="search" placeholder="在「' + esc(sh.name) + '」里搜索" value="' + esc(TL.q) + '" autocomplete="off"></label>' + filters + '</div>' + shufBar() : '') +
      '<div id="tresults">' + tableBody() + '</div></div>';
  }
  /* ---------- router ---------- */
  function route() {
    var h = location.hash.replace(/^#/, '') || '/';
    var parts = h.split('/').filter(Boolean);
    return { name: parts[0] || 'today', arg: parts[1] };
  }
  function render() {
    var r = route(); var main = $('#main'); var html; var tab = r.name;
    if (r.name === 'today') html = viewToday();
    else if (r.name === 'study') { html = viewStudy(); tab = 'today'; }
    else if (r.name === 'list') html = viewList();
    else if (r.name === 'item') { html = viewItem(+r.arg); tab = 'list'; }
    else if (r.name === 'compare') html = viewCompare(r.arg);
    else if (r.name === 'words') html = viewWords(r.arg);
    else if (r.name === 'table') html = viewTable(r.arg);
    else html = viewNotFound();
    main.innerHTML = html;
    document.querySelectorAll('.nav__tabs a').forEach(function (a) { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var curA = document.querySelector('.nav__tabs a[data-tab="' + tab + '"]'); var nc = document.getElementById('navCur'); if (nc) nc.textContent = curA ? curA.textContent : '菜单';
    navMenu(false);
    var titles = { today: '每日目标', study: '练习', list: '语法库', item: '语法', compare: '易混淆辨析', words: '单词', table: '词汇重点表' };
    document.title = (r.name === 'item' && BY[+r.arg] ? BY[+r.arg].p + ' · ' : (titles[r.name] && r.name !== 'today' ? titles[r.name] + ' · ' : '')) + '每日目标 · labagound';
    if (r.name === 'compare' && r.arg) {
      var el = document.getElementById('g-' + r.arg);
      if (el) { setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.add('flash'); }, 30); }
    }
  }
  var lastRoute = '';
  function onHash() {
    var h = location.hash;
    if (h === '#/study' && !EXTRA) ensureDaily();
    render();
    if (h !== lastRoute) { if (!/^#\/compare\/./.test(h)) window.scrollTo(0, 0); lastRoute = h; }
  }
  window.addEventListener('hashchange', onHash);

  /* ---------- phone: the page tabs fold into one dropdown ---------- */
  function navMenu(open) {
    var pick = document.querySelector('.nav__pick'); if (!pick) return;
    pick.setAttribute('data-open', open ? 'true' : 'false');
    pick.querySelector('.nav__dd').setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  document.addEventListener('click', function (ev) {
    var dd = ev.target.closest('.nav__dd');
    if (dd) { navMenu(dd.getAttribute('aria-expanded') !== 'true'); return; }
    if (!ev.target.closest('.nav__tabs')) navMenu(false);
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && document.querySelector('.nav__pick[data-open="true"]')) { navMenu(false); document.querySelector('.nav__dd').focus(); } });

  /* ---------- events ---------- */
  document.addEventListener('click', function (ev) {
    var fg = ev.target.closest('ruby.fg');
    if (fg && !fg.closest('button, a, summary')) { fg.classList.toggle('on'); return; }
    var el = ev.target.closest('[data-act]'); if (!el) return;
    var act = el.dataset.act;
    if (act === 'say') { ev.preventDefault(); speak(el.dataset.text, el); return; }
    if (act === 'daily') { EXTRA = null; return; }
    if (act === 'pick') { var s = activeSession(); answer(s, el.dataset.opt); render(); var nb = $('#nextBtn'); if (nb) nb.focus({ preventScroll: true }); return; }
    if (act === 'next') {
      var s2 = activeSession(); var wasLearn = s2.phase === 'learn'; next(s2); render(); window.scrollTo({ top: 0, behavior: wasLearn ? 'auto' : 'smooth' }); return;
    }
    if (act === 'practice') { practiceLearned(); return; }
    if (act === 'group') { practiceGroup(el.dataset.g); return; }
    if (act === 'one') { startExtra([{ id: +el.dataset.id, k: 'review' }], '单题练习'); return; }
    if (act === 'redo') { startExtra(shuffle(el.dataset.ids.split(',').map(function (x) { return { id: +x, k: 'review' }; })), '错题练习'); return; }
    if (act === 'filter') { LF[el.dataset.k] = el.dataset.v; render(); return; }
    if (act === 'wflip') { if (ev.target.closest('.say')) return; flashOpen = !flashOpen; el.classList.toggle('is-open', flashOpen || ws().reveal); return; }
    if (act === 'wnext') { flashMove(1); return; }
    if (act === 'wprev') { flashMove(-1); return; }
    if (act === 'wcat') { ws().cat = +el.dataset.v; flashOpen = false; save(); render(); return; }
    if (act === 'wreveal') { ws().reveal = el.checked; save(); render(); return; }
    if (act === 'wlcat') { WL.cat = +el.dataset.v; WL.n = 80; render(); return; }
    if (act === 'whide') { WL.hide = !WL.hide; render(); return; }
    if (act === 'wpeek') { if (WL.hide) el.classList.toggle('is-peek'); return; }
    if (act === 'wmore') { WL.n += 80; $('#wresults').innerHTML = wordRows(); return; }
    if (act === 'tmore') { TL.n += 150; $('#tresults').innerHTML = tableBody(); return; }
    if (act === 'tshuf' || act === 'treshuf') {
      TL.shuf = act === 'tshuf' && TL.shuf ? 0 : 1; TL.n = 150;
      if (TL.shuf) { var nr = sheetOf(TL.key).rows.length, order = shuffle(Array.from({ length: nr }, function (_, i) { return i; })); TL.rank = []; order.forEach(function (ri, pos) { TL.rank[ri] = pos; }); }
      $('#tshuf').outerHTML = shufBar(); $('#tresults').innerHTML = tableBody(); return;
    }
    if (act === 'a2hs') { try { localStorage.setItem('labagound-a2hs', '1'); } catch (e) {} var box = el.closest('.a2hs'); if (box) box.remove(); return; }
    if (act === 'tall') { TL.n = 1e9; $('#tresults').innerHTML = tableBody(); return; }
  });
  document.addEventListener('input', function (ev) {
    if (ev.target.id === 'q') { LF.q = ev.target.value; $('#results').innerHTML = listResults(); }
    if (ev.target.id === 'wq') { WL.q = ev.target.value; WL.n = 80; $('#wresults').innerHTML = wordRows(); }
    if (ev.target.id === 'tq') { TL.q = ev.target.value; TL.n = 150; $('#tresults').innerHTML = tableBody(); }
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.dataset && t.dataset.tblv) { var v = +t.value, tb = tbs(); if (v) tb.lv[t.dataset.tblv] = v; else delete tb.lv[t.dataset.tblv]; tb.lt[t.dataset.tblv] = Date.now(); t.setAttribute('data-v', v); save(); return; }
    if (t.dataset && t.dataset.tbf) { TL[t.dataset.tbf] = t.value; TL.n = 150; $('#tresults').innerHTML = tableBody(); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var rn = route();
    if (rn.name === 'words' && !rn.arg && W && !(ev.target.closest && ev.target.closest('input, select, textarea'))) {
      if (ev.key === 'ArrowRight') { flashMove(1); ev.preventDefault(); }
      else if (ev.key === 'ArrowLeft') { flashMove(-1); ev.preventDefault(); }
      else if (ev.key === ' ' || ev.key === 'Enter') {
        if (ev.target.closest && ev.target.closest('button, a')) return;
        var fc = $('.flash__card'); if (fc && !fc.classList.contains('is-open')) { flashOpen = true; fc.classList.add('is-open'); } else flashMove(1);
        ev.preventDefault();
      }
      return;
    }
    if (rn.name !== 'study') return;
    if ($('#settings').open) return;
    var s = activeSession();
    if (s.phase === 'quiz' && /^[1-4]$/.test(ev.key)) { var o = s.opts[+ev.key - 1]; if (o) { answer(s, o); render(); var nb = $('#nextBtn'); if (nb) nb.focus({ preventScroll: true }); } ev.preventDefault(); }
    else if ((s.phase === 'answer' || s.phase === 'learn') && ev.key === 'Enter' && !(ev.target.closest && ev.target.closest('a,button,input,select,summary'))) { var wl = s.phase === 'learn'; next(s); render(); window.scrollTo({ top: 0, behavior: wl ? 'auto' : 'smooth' }); ev.preventDefault(); }
  });

  /* ---------- settings ---------- */
  var dlg = $('#settings'); var form = $('#settingsForm');
  $('#openSettings').addEventListener('click', function () {
    syncUI();
    form.per.value = String(S.set.per); form.scope.value = S.set.scope; form.order.value = S.set.order; form.tts.checked = !!S.set.tts; form.furi.value = S.set.furi || 'tap';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  });
  dlg.addEventListener('click', function (ev) { if (ev.target === dlg) dlg.close(); });
  form.addEventListener('change', function (ev) {
    if (ev.target && ev.target.id === 'syncInput') return;
    var before = S.set.per + S.set.scope + S.set.order;
    S.set.per = +form.per.value; S.set.scope = form.scope.value; S.set.order = form.order.value; S.set.tts = form.tts.checked; S.set.furi = form.furi.value; applyFuri();
    var d = S.daily;
    if (before !== S.set.per + S.set.scope + S.set.order && d && d.date === today() && !d.res.length) { buildDaily(); toast('已按新设置重新安排今天的练习'); }
    else toast('已保存');
    save(); render();
  });
  $('#exportBtn').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'grammar-progress-' + today() + '.json';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });
  $('#importInput').addEventListener('change', function (ev) {
    var f = ev.target.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var data = JSON.parse(rd.result);
        if (!data || typeof data.cards !== 'object') throw new Error('bad');
        localStorage.setItem(KEY, JSON.stringify(data)); S = load(); save(); EXTRA = null; dlg.close(); render(); toast('进度已导入');
      } catch (e) { toast('这个文件不是有效的进度文件'); }
      ev.target.value = '';
    };
    rd.readAsText(f);
  });
  $('#resetBtn').addEventListener('click', function () {
    if (!confirm(SY.code ? '确定清空所有学习记录吗？开着同步，其他设备上的记录也会一起清空。这一步不能撤销。' : '确定清空所有学习记录吗？这一步不能撤销。')) return;
    var keep = S.set; S = fresh(); S.set = keep; S.rs = Date.now(); EXTRA = null; save(); dlg.close(); render(); toast('记录已清空');
  });

  var tsx = null, tsy = 0;
  document.addEventListener('touchstart', function (ev) { if (ev.target.closest && ev.target.closest('.flash__card')) { tsx = ev.touches[0].clientX; tsy = ev.touches[0].clientY; } else tsx = null; }, { passive: true });
  document.addEventListener('touchend', function (ev) {
    if (tsx === null) return;
    var dx = ev.changedTouches[0].clientX - tsx, dy = ev.changedTouches[0].clientY - tsy; tsx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { flashMove(dx < 0 ? 1 : -1); }
  }, { passive: true });
  function applyFuri() { document.documentElement.classList.toggle('furi-all', S.set.furi === 'always'); }
  applyFuri();
  onHash();
  if (SY.code) syncNow({ render: true });
  // 离线支持：装到主屏幕后没网也能打开
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
  // 从主屏幕打开时，回到前台就同步一次
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && SY.code && STANDALONE) syncNow({ render: true }); });
})();
