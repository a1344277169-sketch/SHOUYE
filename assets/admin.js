/* labagound editor — edits content/content.js. Works offline; with Chrome/Edge it can save straight into the site folder. */
(function () {
  "use strict";

  var LANGS = [["zh", "中"], ["ja", "日"], ["en", "EN"]];
  var CATS = [["film", "短片"], ["commercial", "品牌影像"], ["photo", "摄影"], ["writing", "剧本企划"]];
  var DRAFT_KEY = "labagound-draft";
  var HEADER = "/*\n  labagound 网站内容 / サイトの内容 / Site content\n  ------------------------------------------------\n  这个文件由 admin.html（编辑器）生成。也可以手动修改：每段文字都有 zh / ja / en 三个版本，\n  留空的语言会自动显示其他语言的版本。\n\n  works[].category:  \"film\" 短片 | \"commercial\" 品牌影像 | \"photo\" 摄影 | \"writing\" 剧本企划\n  正文 body 支持 Markdown：## 小标题、**粗体**、[链接](https://...)、![说明](media/xxx.webp)\n  同一行写两张图片，会并排显示。\n*/\n";

  var data = clone(window.SITE_CONTENT || { site: {}, works: [], posts: [] });
  var saved = JSON.stringify(data);
  var dir = null;               // FileSystemDirectoryHandle when a folder is open
  var blobUrls = {};            // path -> object URL for images added this session
  var state = { tab: "works", index: 0, mdLang: {}, mdPreview: {} };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function i18n(v) { if (v && typeof v === "object") return v; return { zh: v || "", ja: "", en: "" }; }
  function first(v) { v = i18n(v); return v.zh || v.ja || v.en || ""; }
  function imgSrc(p) { return blobUrls[p] || p; }
  function dirty() { return JSON.stringify(data) !== saved; }

  /* ---------- status + toast ---------- */
  function status(msg, kind) { var s = $("#status"); s.textContent = msg; s.className = "status" + (kind ? " " + kind : ""); }
  function refreshStatus() {
    if (dirty()) status(dir ? "有未保存的修改" : "有未保存的修改（草稿已自动存在浏览器里）", "warn");
    else status(dir ? "已连接文件夹：" + dir.name : "未连接文件夹", dir ? "ok" : "");
  }
  var toastT;
  function toast(msg) {
    var t = $(".toast") || document.body.appendChild(Object.assign(document.createElement("div"), { className: "toast" }));
    t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ---------- draft autosave ---------- */
  var draftT;
  function changed() {
    clearTimeout(draftT);
    draftT = setTimeout(function () { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) {} }, 300);
    refreshStatus();
  }
  window.addEventListener("beforeunload", function (e) { if (dirty()) { e.preventDefault(); e.returnValue = ""; } });

  function draftBanner() {
    var d; try { d = localStorage.getItem(DRAFT_KEY); } catch (e) { return; }
    if (!d || d === saved) return;
    var b = document.createElement("div");
    b.className = "banner";
    b.innerHTML = "<p>浏览器里有一份上次没保存的草稿。</p>";
    var r = mkBtn("恢复草稿", "b b--primary b--sm", function () { try { data = JSON.parse(d); } catch (e) { toast("草稿读取失败"); return; } b.remove(); renderAll(); changed(); toast("已恢复草稿"); });
    var x = mkBtn("丢弃", "b b--sm", function () { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} b.remove(); });
    b.appendChild(r); b.appendChild(x);
    $("#banners").appendChild(b);
  }
  function mkBtn(text, cls, fn, title) { var b = document.createElement("button"); b.type = "button"; b.className = cls; b.textContent = text; if (title) b.title = title; b.addEventListener("click", fn); return b; }

  /* ---------- folder access ---------- */
  var canFS = "showDirectoryPicker" in window;
  async function openFolder() {
    if (!canFS) { toast("这个浏览器不支持直接打开文件夹。请用 Chrome 或 Edge，或者用“保存”下载 content.js"); return; }
    try {
      var h = await window.showDirectoryPicker({ mode: "readwrite", id: "labagound-site" });
      var contentDir = await h.getDirectoryHandle("content");
      var fh = await contentDir.getFileHandle("content.js");
      var text = await (await fh.getFile()).text();
      var win = {};
      new Function("window", text)(win);
      if (!win.SITE_CONTENT) throw new Error("content.js 里没有 SITE_CONTENT");
      dir = h; data = win.SITE_CONTENT; saved = JSON.stringify(data);
      renderAll(); refreshStatus(); toast("已打开 " + h.name);
    } catch (e) {
      if (e && e.name === "AbortError") return;
      if (e && e.name === "NotFoundError") toast("这个文件夹里没有 content/content.js。请选择网站根目录（index.html 所在的文件夹）");
      else toast("打开失败：" + (e && e.message ? e.message : e));
    }
  }
  function serialize() { return HEADER + "window.SITE_CONTENT = " + JSON.stringify(data, null, 2) + ";\n"; }
  async function save() {
    var problems = validate();
    if (problems.length) { toast(problems[0]); return; }
    if (dir) {
      try {
        var c = await dir.getDirectoryHandle("content", { create: true });
        var fh = await c.getFileHandle("content.js", { create: true });
        var w = await fh.createWritable(); await w.write(serialize()); await w.close();
        saved = JSON.stringify(data);
        try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
        refreshStatus(); toast("已保存到 " + dir.name + "/content/content.js");
      } catch (e) { toast("保存失败：" + (e && e.message ? e.message : e)); }
      return;
    }
    download("content.js", new Blob([serialize()], { type: "text/javascript" }));
    saved = JSON.stringify(data); refreshStatus();
    toast("已下载 content.js，请用它替换网站的 content/content.js");
  }
  function download(name, blob) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function validate() {
    var out = [], seen = {};
    (data.works || []).forEach(function (w) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(w.id || "")) out.push("作品“" + first(w.title) + "”的网址名只能用小写字母、数字和 -");
      if (seen["w" + w.id]) out.push("有两个作品用了同一个网址名：" + w.id);
      seen["w" + w.id] = 1;
    });
    (data.posts || []).forEach(function (p) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(p.id || "")) out.push("文章“" + first(p.title) + "”的网址名只能用小写字母、数字和 -");
      if (seen["p" + p.id]) out.push("有两篇文章用了同一个网址名：" + p.id);
      seen["p" + p.id] = 1;
    });
    return out;
  }
  function preview() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) { toast("浏览器禁止了本地存储，无法预览草稿"); return; }
    var hash = "";
    if (state.tab === "works" && data.works[state.index]) hash = "#w-" + data.works[state.index].id;
    if (state.tab === "posts" && sortedPosts()[state.index]) hash = "#p-" + sortedPosts()[state.index].id;
    window.open("index.html?draft=1" + hash, "_blank");
  }

  /* ---------- images: compress to webp, write into media/uploads ---------- */
  function slug(name) {
    var base = name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return (base || "img") + "-" + Date.now().toString(36).slice(-5);
  }
  function compress(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return resolve({ blob: file, ext: (file.name.split(".").pop() || "img").toLowerCase() });
      var im = new Image(), url = URL.createObjectURL(file);
      im.onload = function () {
        var max = 2400, w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { resolve(b ? { blob: b, ext: "webp" } : { blob: file, ext: file.name.split(".").pop() }); }, "image/webp", 0.84);
      };
      im.onerror = function () { URL.revokeObjectURL(url); resolve({ blob: file, ext: file.name.split(".").pop() }); };
      im.src = url;
    });
  }
  function pickImages(multiple) {
    return new Promise(function (resolve) {
      var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.multiple = !!multiple;
      inp.addEventListener("change", function () { resolve(Array.prototype.slice.call(inp.files || [])); });
      inp.click();
    });
  }
  async function addImages(multiple) {
    var files = await pickImages(multiple), paths = [];
    for (var i = 0; i < files.length; i++) {
      var r = await compress(files[i]);
      var name = slug(files[i].name) + "." + r.ext, path = "media/uploads/" + name;
      if (dir) {
        try {
          var m = await dir.getDirectoryHandle("media", { create: true });
          var up = await m.getDirectoryHandle("uploads", { create: true });
          var fh = await up.getFileHandle(name, { create: true });
          var w = await fh.createWritable(); await w.write(r.blob); await w.close();
        } catch (e) { toast("图片写入失败：" + e.message); continue; }
      } else {
        download(name, r.blob);
      }
      blobUrls[path] = URL.createObjectURL(r.blob);
      paths.push(path);
    }
    if (paths.length && !dir) toast("图片已下载。请把它放进网站的 media/uploads/ 文件夹");
    return paths;
  }

  /* ---------- field builders ---------- */
  function field(label, control, hint) {
    var f = document.createElement("div"); f.className = "f";
    var l = document.createElement("div"); l.className = "lbl"; l.textContent = label;
    var c = document.createElement("div"); c.appendChild(control);
    if (hint) { var h = document.createElement("p"); h.className = "hint"; h.textContent = hint; c.appendChild(h); }
    f.appendChild(l); f.appendChild(c); return f;
  }
  var uid = 0;
  function textInput(obj, key, opts) {
    opts = opts || {};
    var i = document.createElement("input"); i.type = opts.type || "text"; i.id = "f" + (++uid);
    i.value = obj[key] || ""; if (opts.placeholder) i.placeholder = opts.placeholder;
    i.addEventListener("input", function () { obj[key] = i.value; changed(); if (opts.onInput) opts.onInput(i.value); });
    return i;
  }
  function selectInput(obj, key, options, onChange) {
    var s = document.createElement("select"); s.id = "f" + (++uid);
    options.forEach(function (o) { var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; s.appendChild(op); });
    s.value = obj[key] || options[0][0];
    s.addEventListener("change", function () { obj[key] = s.value; changed(); if (onChange) onChange(); });
    return s;
  }
  function i18nInput(obj, key, opts) {
    opts = opts || {};
    obj[key] = i18n(obj[key]);
    var wrap = document.createElement("div"); wrap.className = "i18n";
    LANGS.forEach(function (l) {
      var row = document.createElement("div"); row.className = "i18n__row" + (opts.area ? " i18n__row--top" : "");
      var b = document.createElement("b"); b.textContent = l[1];
      var inp = document.createElement(opts.area ? "textarea" : "input");
      if (!opts.area) inp.type = "text"; else inp.rows = opts.rows || 3;
      inp.id = "f" + (++uid); inp.lang = l[0] === "zh" ? "zh-CN" : l[0];
      inp.value = obj[key][l[0]] || "";
      inp.setAttribute("aria-label", l[1]);
      inp.addEventListener("input", function () { obj[key][l[0]] = inp.value; changed(); if (opts.onInput) opts.onInput(); });
      row.appendChild(b); row.appendChild(inp); wrap.appendChild(row);
    });
    return wrap;
  }
  function mdInput(obj, key, stateKey) {
    obj[key] = i18n(obj[key]);
    var wrap = document.createElement("div");
    var lang = state.mdLang[stateKey] || "zh", pv = !!state.mdPreview[stateKey];
    var tabs = document.createElement("div"); tabs.className = "mdtabs";
    var seg = document.createElement("div"); seg.className = "seg";
    LANGS.forEach(function (l) {
      var b = mkBtn(l[1], "", function () { state.mdLang[stateKey] = l[0]; redraw(); });
      b.setAttribute("aria-pressed", l[0] === lang);
      if (!obj[key][l[0]]) { var s = document.createElement("span"); s.className = "empty-flag"; s.textContent = "空"; b.appendChild(s); }
      seg.appendChild(b);
    });
    var seg2 = document.createElement("div"); seg2.className = "seg";
    var e = mkBtn("编辑", "", function () { state.mdPreview[stateKey] = false; redraw(); }); e.setAttribute("aria-pressed", !pv);
    var p = mkBtn("预览", "", function () { state.mdPreview[stateKey] = true; redraw(); }); p.setAttribute("aria-pressed", pv);
    seg2.appendChild(e); seg2.appendChild(p);
    tabs.appendChild(seg); tabs.appendChild(seg2);
    var ins = mkBtn("插入图片", "b b--sm", async function () {
      var paths = await addImages(true); if (!paths.length) return;
      var ta = wrap.querySelector("textarea"); var snippet = "\n\n" + paths.map(function (p) { return "![](" + p + ")"; }).join(" ") + "\n\n";
      if (ta) { var at = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, at) + snippet + ta.value.slice(at); obj[key][lang] = ta.value; changed(); }
      else { obj[key][lang] = (obj[key][lang] || "") + snippet; changed(); redraw(); }
    }, "图片会插在光标的位置；同一行放两张图会并排显示");
    if (!pv) tabs.appendChild(ins);
    wrap.appendChild(tabs);
    if (pv) {
      var box = document.createElement("div"); box.className = "md-preview";
      var html = window.labagoundMD ? window.labagoundMD(obj[key][lang] || "") : esc(obj[key][lang] || "");
      box.innerHTML = '<div class="prose">' + (html || '<p style="color:var(--ink-3)">（这个语言还没有内容）</p>') + "</div>";
      Array.prototype.forEach.call(box.querySelectorAll("img"), function (im) { var src = im.getAttribute("src"); if (blobUrls[src]) im.src = blobUrls[src]; });
      wrap.appendChild(box);
    } else {
      var ta = document.createElement("textarea"); ta.rows = 16; ta.id = "f" + (++uid); ta.lang = lang === "zh" ? "zh-CN" : lang;
      ta.value = obj[key][lang] || "";
      ta.placeholder = "## 小标题\n\n正文段落……\n\n![图片说明](media/uploads/xxx.webp)";
      ta.addEventListener("input", function () { obj[key][lang] = ta.value; changed(); });
      wrap.appendChild(ta);
    }
    return wrap;
  }
  function imageInput(obj, key, onChange) {
    var wrap = document.createElement("div"); wrap.className = "imgf";
    var th = document.createElement("div"); th.className = "imgf__th";
    var ctl = document.createElement("div"); ctl.className = "imgf__ctl";
    var path = textInput(obj, key, { placeholder: "media/uploads/xxx.webp", onInput: function () { draw(); if (onChange) onChange(); } });
    var btns = document.createElement("div"); btns.className = "imgf__btns";
    btns.appendChild(mkBtn("选择图片…", "b b--sm", async function () {
      var p = await addImages(false); if (!p.length) return; obj[key] = p[0]; path.value = p[0]; changed(); draw(); if (onChange) onChange();
    }));
    btns.appendChild(mkBtn("清除", "b b--sm", function () { obj[key] = ""; path.value = ""; changed(); draw(); if (onChange) onChange(); }));
    function draw() { th.innerHTML = obj[key] ? '<img alt="" src="' + esc(imgSrc(obj[key])) + '">' : "无图片"; }
    draw();
    ctl.appendChild(path); ctl.appendChild(btns);
    wrap.appendChild(th); wrap.appendChild(ctl);
    return wrap;
  }
  function galleryInput(obj, key) {
    obj[key] = obj[key] || [];
    var g = document.createElement("div"); g.className = "gal";
    function draw() {
      g.innerHTML = "";
      obj[key].forEach(function (p, i) {
        var it = document.createElement("div"); it.className = "gal__it";
        it.innerHTML = '<img alt="" src="' + esc(imgSrc(p)) + '" title="' + esc(p) + '">';
        var c = document.createElement("div"); c.className = "ctl";
        var l = mkBtn("‹", "", function () { if (i > 0) { obj[key].splice(i - 1, 0, obj[key].splice(i, 1)[0]); changed(); draw(); } }); l.setAttribute("aria-label", "前移");
        var r = mkBtn("›", "", function () { if (i < obj[key].length - 1) { obj[key].splice(i + 1, 0, obj[key].splice(i, 1)[0]); changed(); draw(); } }); r.setAttribute("aria-label", "后移");
        var x = mkBtn("×", "", function () { obj[key].splice(i, 1); changed(); draw(); }); x.setAttribute("aria-label", "移除");
        c.appendChild(l); c.appendChild(r); c.appendChild(x); it.appendChild(c); g.appendChild(it);
      });
      var add = mkBtn("+ 添加图片", "gal__add", async function () { var ps = await addImages(true); if (ps.length) { obj[key] = obj[key].concat(ps); changed(); draw(); } });
      g.appendChild(add);
    }
    draw();
    return g;
  }
  function linksInput(obj, key, withHandle) {
    obj[key] = obj[key] || [];
    var box = document.createElement("div"); box.className = "rows";
    function draw() {
      box.innerHTML = "";
      obj[key].forEach(function (l, i) {
        var r = document.createElement("div"); r.className = "row";
        var h = document.createElement("div"); h.className = "row__head"; h.innerHTML = "<span>链接 " + (i + 1) + "</span>";
        h.appendChild(mkBtn("移除", "b b--sm b--danger", function () { obj[key].splice(i, 1); changed(); draw(); }));
        r.appendChild(h);
        r.appendChild(textInput(l, "url", { type: "url", placeholder: "https://…" }));
        r.appendChild(i18nInput(l, "label"));
        if (withHandle) { var hd = textInput(l, "handle", { placeholder: "账号名，比如：杂念树屋" }); r.appendChild(hd); }
        box.appendChild(r);
      });
      box.appendChild(mkBtn("+ 添加链接", "b b--sm", function () { obj[key].push({ label: { zh: "", ja: "", en: "" }, url: "" }); changed(); draw(); }));
    }
    draw();
    return box;
  }
  function section(title, nodes) {
    var s = document.createElement("section"); s.className = "sec";
    if (title) { var h = document.createElement("h3"); h.textContent = title; s.appendChild(h); }
    nodes.forEach(function (n) { if (n) s.appendChild(n); });
    return s;
  }

  /* ---------- sidebar ---------- */
  function sortedPosts() { return (data.posts || []).slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }); }
  function renderList() {
    var box = $("#list"); box.innerHTML = "";
    Array.prototype.forEach.call(document.querySelectorAll("[data-tab]"), function (b) { b.setAttribute("aria-selected", b.getAttribute("data-tab") === state.tab); });
    if (state.tab === "site") {
      var it = mkBtn("", "item", function () {}); it.setAttribute("aria-current", "true");
      it.innerHTML = "<span><strong>网站信息</strong><small>首页文字、关于、联系方式</small></span>";
      box.appendChild(it);
      var help = document.createElement("div"); help.className = "help"; help.style.cssText = "padding:16px 8px";
      help.innerHTML = "<p><b>怎么用</b></p><p>1. 点右上角“打开网站文件夹”，选择放着 <code>index.html</code> 的文件夹（Chrome / Edge）。</p><p>2. 修改内容，图片会自动压缩并存进 <code>media/uploads/</code>。</p><p>3. 点“预览”看效果，满意后点“保存”。</p><p>4. 把整个文件夹重新上传到你的网站空间。</p><p style=\"margin-top:10px\">不能打开文件夹时，“保存”会下载一个 <code>content.js</code>，用它替换网站里的 <code>content/content.js</code>。</p>";
      box.appendChild(help);
      return;
    }
    if (state.tab === "works") {
      CATS.forEach(function (c) {
        var items = data.works.map(function (w, i) { return [w, i]; }).filter(function (x) { return x[0].category === c[0]; });
        if (!items.length) return;
        var g = document.createElement("div"); g.className = "group-label"; g.textContent = c[1]; box.appendChild(g);
        items.forEach(function (x) { box.appendChild(listItem(x[0], x[1], c[1])); });
      });
      box.appendChild(mkBtn("+ 新建作品", "b", function () {
        var n = 1; while (data.works.some(function (w) { return w.id === "new-work-" + n; })) n++;
        data.works.unshift({ id: "new-work-" + n, category: "film", year: "", title: { zh: "新作品", ja: "", en: "" }, subtitle: { zh: "", ja: "", en: "" }, roles: { zh: "", ja: "", en: "" }, place: { zh: "", ja: "", en: "" }, summary: { zh: "", ja: "", en: "" }, video: "", cover: "", poster: "", gallery: [], body: { zh: "", ja: "", en: "" }, links: [] });
        state.index = 0; changed(); renderAll();
      }));
    } else {
      var list = sortedPosts();
      list.forEach(function (p, i) { box.appendChild(listItem(p, i, p.date)); });
      box.appendChild(mkBtn("+ 新建文章", "b", function () {
        var today = new Date(); var d = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
        var n = 1; while (data.posts.some(function (p) { return p.id === "post-" + n; })) n++;
        var p = { id: "post-" + n, date: d, tag: { zh: "", ja: "", en: "" }, title: { zh: "新文章", ja: "", en: "" }, excerpt: { zh: "", ja: "", en: "" }, cover: "", body: { zh: "", ja: "", en: "" } };
        data.posts.push(p); state.index = sortedPosts().indexOf(p); changed(); renderAll();
      }));
    }
  }
  function listItem(obj, i, sub) {
    var b = mkBtn("", "item", function () { state.index = i; renderAll(); });
    b.setAttribute("aria-current", i === state.index);
    b.innerHTML = '<div class="item__img">' + (obj.cover ? '<img alt="" src="' + esc(imgSrc(obj.cover)) + '">' : "") + "</div><span><strong>" + esc(first(obj.title) || "（无标题）") + "</strong><small>" + esc(sub || "") + "</small></span>";
    return b;
  }

  /* ---------- forms ---------- */
  function renderForm() {
    var f = $("#form"); f.innerHTML = "";
    if (state.tab === "site") return siteForm(f);
    if (state.tab === "works") { var w = data.works[state.index]; if (!w) { f.innerHTML = '<p class="sub">还没有作品。点左边“新建作品”。</p>'; return; } return workForm(f, w); }
    var p = sortedPosts()[state.index]; if (!p) { f.innerHTML = '<p class="sub">还没有文章。点左边“新建文章”。</p>'; return; }
    postForm(f, p);
  }
  function header(f, title, sub, tools) {
    var h = document.createElement("h2"); h.textContent = title; f.appendChild(h);
    var s = document.createElement("p"); s.className = "sub"; s.textContent = sub; f.appendChild(s);
    var t = document.createElement("div"); t.className = "tools"; tools.forEach(function (x) { t.appendChild(x); }); f.appendChild(t);
  }
  function deleteBtn(onConfirm) {
    var armed = false, timer;
    var b = mkBtn("删除", "b b--danger", function () {
      if (!armed) { armed = true; b.textContent = "再点一次确认删除"; timer = setTimeout(function () { armed = false; b.textContent = "删除"; }, 3000); return; }
      clearTimeout(timer); onConfirm();
    });
    return b;
  }
  function workForm(f, w) {
    var idx = data.works.indexOf(w);
    header(f, first(w.title) || "（无标题）", "网址：#w-" + w.id, [
      mkBtn("上移", "b b--sm", function () { if (idx > 0) { data.works.splice(idx - 1, 0, data.works.splice(idx, 1)[0]); state.index = idx - 1; changed(); renderAll(); } }, "在同一类里往前排"),
      mkBtn("下移", "b b--sm", function () { if (idx < data.works.length - 1) { data.works.splice(idx + 1, 0, data.works.splice(idx, 1)[0]); state.index = idx + 1; changed(); renderAll(); } }),
      mkBtn("复制一份", "b b--sm", function () { var c = clone(w); c.id = w.id + "-copy"; data.works.splice(idx + 1, 0, c); state.index = idx + 1; changed(); renderAll(); }),
      deleteBtn(function () { data.works.splice(idx, 1); state.index = Math.max(0, idx - 1); changed(); renderAll(); toast("已删除"); })
    ]);
    var isCom = w.category === "commercial", isWriting = w.category === "writing";
    if (w.category === "photo") {
      f.appendChild(section("照片", [
        field("类别", selectInput(w, "category", CATS, function () { renderAll(); })),
        field("照片", imageInput(w, "cover", renderList), "每张照片单独一条，按原比例显示"),
        field("标题", i18nInput(w, "title", { onInput: renderList }), "显示在照片下方，可不填"),
        field("年份", textInput(w, "year", { placeholder: "2025" })),
        field("网址名", textInput(w, "id"), "只用小写字母、数字和 -")
      ]));
      return;
    }
    f.appendChild(section("基本信息", [
      field("类别", selectInput(w, "category", CATS, function () { renderAll(); })),
      field("标题", i18nInput(w, "title", { onInput: renderList })),
      isCom ? field("客户 / 品牌", i18nInput(w, "client")) : field("副标题", i18nInput(w, "subtitle"), "比如原名，或剧本的类型"),
      field("担任", i18nInput(w, "roles"), "比如：导演 · 编剧 · 剪辑"),
      w.category === "film" ? field("拍摄地", i18nInput(w, "place")) : null,
      field("年份", textInput(w, "year", { placeholder: "2025" })),
      field("网址名", textInput(w, "id", { placeholder: "my-film", onInput: function () { $(".sub", f).textContent = "网址：#w-" + w.id; } }), "只用小写字母、数字和 -")
    ]));
    if (isCom) {
      f.appendChild(section("图片", [field("图片", imageInput(w, "cover", renderList), "品牌影像只显示这一张图、标题、品牌名和担任。竖图会自动裁成横图显示")]));
      return;
    }
    f.appendChild(section("介绍", [
      field("一句话简介", i18nInput(w, "summary", { area: true, rows: 3 }), isWriting ? "显示在剧本卡片上（剧本卡片不能点开）" : "显示在作品卡片和作品页顶部"),
      isWriting ? null : field("影片链接", textInput(w, "video", { type: "url", placeholder: "https://youtu.be/…" }), "填了就会出现“观看影片”按钮"),
      isWriting ? null : field("其他链接", linksInput(w, "links"))
    ]));
    if (isWriting) return;
    f.appendChild(section("图片", [
      field("封面", imageInput(w, "cover", renderList), "横图最好，作品页顶部会裁成电影宽银幕比例"),
      w.category === "film" ? field("海报", imageInput(w, "poster"), "竖图，可不填") : null,
      field("剧照 / 画面", galleryInput(w, "gallery"), "点图片上的 ‹ › 调整顺序")
    ]));
    f.appendChild(section("正文", [mdInput(w, "body", "w-" + idx)]));
  }
  function postForm(f, p) {
    header(f, first(p.title) || "（无标题）", "网址：#p-" + p.id, [
      deleteBtn(function () { data.posts.splice(data.posts.indexOf(p), 1); state.index = 0; changed(); renderAll(); toast("已删除"); })
    ]);
    f.appendChild(section("基本信息", [
      field("标题", i18nInput(p, "title", { onInput: renderList })),
      field("分类", i18nInput(p, "tag"), "比如：制作手记"),
      field("日期", textInput(p, "date", { type: "date", onInput: function () { state.index = sortedPosts().indexOf(p); renderList(); } })),
      field("摘要", i18nInput(p, "excerpt", { area: true, rows: 2 })),
      field("封面", imageInput(p, "cover", renderList)),
      field("原文链接", textInput(p, "source", { type: "url", placeholder: "https://mp.weixin.qq.com/s?…" }), "填了会在文章末尾显示“在公众号阅读原文”"),
      field("网址名", textInput(p, "id", { onInput: function () { $(".sub", f).textContent = "网址：#p-" + p.id; } }), "只用小写字母、数字和 -")
    ]));
    f.appendChild(section("正文", [mdInput(p, "body", "p-" + p.id)]));
  }
  function siteForm(f) {
    var s = data.site = data.site || {};
    header(f, "网站信息", "首页上方的标题、关于和联系方式", []);
    var featured = selectInput(s, "featuredWork", data.works.filter(function (w) { return w.category === "film"; }).map(function (w) { return [w.id, first(w.title)]; }));
    f.appendChild(section("首页", [
      field("网站名", textInput(s, "name")),
      field("大标题", i18nInput(s, "heroTitle")),
      field("介绍", i18nInput(s, "heroText", { area: true, rows: 2 })),
      field("主打作品", featured, "显示在大图下面的黑色区域")
    ]));
    s.brandStats = s.brandStats || [];
    var stats = document.createElement("div"); stats.className = "rows";
    (function drawStats() {
      stats.innerHTML = "";
      s.brandStats.forEach(function (st, i) {
        var r = document.createElement("div"); r.className = "row";
        var h = document.createElement("div"); h.className = "row__head"; h.innerHTML = "<span>数字 " + (i + 1) + "</span>";
        h.appendChild(mkBtn("移除", "b b--sm b--danger", function () { s.brandStats.splice(i, 1); changed(); drawStats(); }));
        r.appendChild(h); r.appendChild(i18nInput(st, "value")); r.appendChild(i18nInput(st, "label"));
        stats.appendChild(r);
      });
      stats.appendChild(mkBtn("+ 添加数字", "b b--sm", function () { s.brandStats.push({ value: { zh: "", ja: "", en: "" }, label: { zh: "", ja: "", en: "" } }); changed(); drawStats(); }));
    })();
    f.appendChild(section("品牌影像区", [
      field("说明", i18nInput(s, "brandsText", { area: true, rows: 2 })),
      field("数据", stats, "上面一行显示数字，下面一行显示说明"),
      field("合作品牌", textInput(s, "brands"))
    ]));
    f.appendChild(section("树屋", [field("说明", i18nInput(s, "journalText", { area: true, rows: 2 }))]));
    s.profile = s.profile || { name: { zh: "", ja: "", en: "" }, reading: { zh: "", ja: "", en: "" }, facts: [] };
    s.profile.facts = s.profile.facts || [];
    var facts = document.createElement("div"); facts.className = "rows";
    (function drawFacts() {
      facts.innerHTML = "";
      s.profile.facts.forEach(function (fa, i) {
        var r = document.createElement("div"); r.className = "row";
        var h = document.createElement("div"); h.className = "row__head"; h.innerHTML = "<span>第 " + (i + 1) + " 项</span>";
        h.appendChild(mkBtn("移除", "b b--sm b--danger", function () { s.profile.facts.splice(i, 1); changed(); drawFacts(); }));
        r.appendChild(h); r.appendChild(i18nInput(fa, "label")); r.appendChild(i18nInput(fa, "value"));
        facts.appendChild(r);
      });
      facts.appendChild(mkBtn("+ 添加一项", "b b--sm", function () { s.profile.facts.push({ label: { zh: "", ja: "", en: "" }, value: { zh: "", ja: "", en: "" } }); changed(); drawFacts(); }));
    })();
    f.appendChild(section("关于", [
      field("名字", i18nInput(s.profile, "name")),
      field("名字读音", i18nInput(s.profile, "reading"), "显示在名字下面，可不填"),
      field("照片", imageInput(s.profile, "photo"), "显示在“关于”页和首页底部，竖图最好"),
      field("自我介绍", i18nInput(s, "about", { area: true, rows: 8 }), "空一行就是新段落"),
      field("资料", facts, "学历、专业、获奖等，第一栏是项目名，第二栏是内容"),
      field("擅长", i18nInput(s, "skills")),
      field("邮箱", textInput(s, "email", { type: "email", placeholder: "可不填" }), "填了会显示在“关于”里，带复制按钮"),
      field("链接", linksInput(s, "links", true), "公众号、bilibili、Instagram……第一栏是平台名，最后一栏是账号名")
    ]));
  }

  function heroSlides(s) {
    s.heroSlides = s.heroSlides || [];
    var box = document.createElement("div"); box.className = "rows";
    var works = [["", "（不对应作品）"]].concat(data.works.filter(function (w) { return w.category === "film"; }).map(function (w) { return [w.id, first(w.title)]; }));
    (function draw() {
      box.innerHTML = "";
      s.heroSlides.forEach(function (sl, i) {
        var r = document.createElement("div"); r.className = "row";
        var h = document.createElement("div"); h.className = "row__head"; h.innerHTML = "<span>第 " + (i + 1) + " 张</span>";
        var bt = document.createElement("div"); bt.style.cssText = "display:flex;gap:6px";
        bt.appendChild(mkBtn("上移", "b b--sm", function () { if (i > 0) { s.heroSlides.splice(i - 1, 0, s.heroSlides.splice(i, 1)[0]); changed(); draw(); } }));
        bt.appendChild(mkBtn("移除", "b b--sm b--danger", function () { s.heroSlides.splice(i, 1); changed(); draw(); }));
        h.appendChild(bt); r.appendChild(h);
        r.appendChild(imageInput(sl, "image"));
        r.appendChild(selectInput(sl, "work", works));
        box.appendChild(r);
      });
      box.appendChild(mkBtn("+ 添加一张", "b b--sm", function () { s.heroSlides.push({ image: "", work: "" }); changed(); draw(); }));
    })();
    return box;
  }

  function renderAll() { renderList(); renderForm(); refreshStatus(); }
  function redraw() { var y = window.scrollY; renderForm(); window.scrollTo(0, y); }

  /* ---------- boot ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-tab]"), function (b) {
    b.addEventListener("click", function () { state.tab = b.getAttribute("data-tab"); state.index = 0; renderAll(); });
  });
  $("#btnOpen").addEventListener("click", openFolder);
  $("#btnSave").addEventListener("click", save);
  $("#btnPreview").addEventListener("click", preview);
  document.addEventListener("keydown", function (e) { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); } });
  if (!canFS) $("#btnOpen").title = "需要 Chrome 或 Edge 浏览器";
  if (!data.works) data.works = []; if (!data.posts) data.posts = [];
  draftBanner();
  renderAll();
})();
