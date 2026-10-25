/* labagound — site renderer. Content comes from content/content.js (window.SITE_CONTENT). */
(function () {
  "use strict";

  /* ---------- content ---------- */
  var DATA = window.SITE_CONTENT || { site: {}, works: [], posts: [] };
  var isDraft = /[?&]draft\b/.test(location.search);
  if (isDraft) {
    try {
      var d = localStorage.getItem("labagound-draft");
      if (d) DATA = JSON.parse(d);
    } catch (e) { /* storage blocked: use published content */ }
  }
  var SITE = DATA.site || {};
  var WORKS = DATA.works || [];
  var POSTS = (DATA.posts || []).slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });

  /* ---------- language ---------- */
  var LANGS = ["zh", "ja", "en"];
  var HTML_LANG = { zh: "zh-CN", ja: "ja", en: "en" };
  var LANG_LABEL = { zh: "中", ja: "日", en: "EN" };
  var LANG_NAME = { zh: "中文", ja: "日本語", en: "English" };
  function detectLang() {
    var q = (location.search.match(/[?&]lang=(zh|ja|en)\b/) || [])[1];
    if (q) return q;
    try { var s = localStorage.getItem("labagound-lang"); if (LANGS.indexOf(s) > -1) return s; } catch (e) {}
    var nav = (navigator.languages || [navigator.language || ""]);
    for (var i = 0; i < nav.length; i++) {
      var l = String(nav[i]).toLowerCase();
      if (l.indexOf("zh") === 0) return "zh";
      if (l.indexOf("ja") === 0) return "ja";
      if (l.indexOf("en") === 0) return "en";
    }
    return "ja";
  }
  var LANG = detectLang();

  var UI = {
    skip: { zh: "跳到正文", ja: "本文へ移動", en: "Skip to content" },
    works: { zh: "作品", ja: "作品", en: "Work" },
    journal: { zh: "随笔", ja: "ジャーナル", en: "Journal" },
    about: { zh: "关于", ja: "About", en: "About" },
    menu: { zh: "菜单", ja: "メニュー", en: "Menu" },
    language: { zh: "语言", ja: "言語", en: "Language" },
    watchFilm: { zh: "观看影片", ja: "本編を見る", en: "Watch the film" },
    learnMore: { zh: "了解更多", ja: "詳しく見る", en: "Learn more" },
    seeWork: { zh: "浏览作品", ja: "作品を見る", en: "See the work" },
    allWorks: { zh: "全部作品", ja: "すべての作品", en: "All work" },
    moreFilms: { zh: "更多短片", ja: "そのほかの短編", en: "More short films" },
    brandsTitle: { zh: "为品牌而做", ja: "ブランドのための映像", en: "Made for brands" },
    photosTitle: { zh: "摄影", ja: "写真", en: "Photographs" },
    writingTitle: { zh: "剧本与企划", ja: "脚本と企画", en: "Scripts in development" },
    writingText: { zh: "正在写的故事。", ja: "いま書いている物語。", en: "Stories I'm writing now." },
    journalTitle: { zh: "随笔", ja: "ジャーナル", en: "Journal" },
    journalText: { zh: "拍摄现场、剪辑台和片子之外的笔记。", ja: "撮影現場や編集室、作品の外側のノート。", en: "Notes from the set, the edit, and everything around the films." },
    allPosts: { zh: "全部随笔", ja: "すべての記事", en: "All entries" },
    readSynopsis: { zh: "阅读梗概", ja: "あらすじを読む", en: "Read the synopsis" },
    stillFrom: { zh: "《{t}》剧照", ja: "『{t}』より", en: "Still from {t}" },
    all: { zh: "全部", ja: "すべて", en: "All" },
    film: { zh: "短片", ja: "短編映画", en: "Short films" },
    commercial: { zh: "品牌影像", ja: "ブランド映像", en: "Brand work" },
    photo: { zh: "摄影", ja: "写真", en: "Photographs" },
    writing: { zh: "剧本企划", ja: "脚本企画", en: "Scripts" },
    worksText: { zh: "短片、品牌影像、摄影与剧本。", ja: "短編映画、ブランド映像、写真、脚本。", en: "Short films, brand work, photographs and scripts." },
    stills: { zh: "剧照", ja: "スチル", en: "Stills" },
    frames: { zh: "画面", ja: "画面", en: "Frames" },
    images: { zh: "作品", ja: "作品", en: "Images" },
    prev: { zh: "上一部", ja: "前の作品", en: "Previous" },
    next: { zh: "下一部", ja: "次の作品", en: "Next" },
    morePosts: { zh: "更多随笔", ja: "ほかの記事", en: "More from the journal" },
    contact: { zh: "联系", ja: "連絡先", en: "Contact" },
    copy: { zh: "复制", ja: "コピー", en: "Copy" },
    copied: { zh: "已复制", ja: "コピーしました", en: "Copied" },
    notFound: { zh: "找不到这一页", ja: "ページが見つかりません", en: "Page not found" },
    notFoundText: { zh: "它可能已被移动或删除。", ja: "移動または削除された可能性があります。", en: "It may have been moved or removed." },
    home: { zh: "回到首页", ja: "トップへ戻る", en: "Back to home" },
    close: { zh: "关闭", ja: "閉じる", en: "Close" },
    prevImg: { zh: "上一张", ja: "前の画像", en: "Previous image" },
    nextImg: { zh: "下一张", ja: "次の画像", en: "Next image" },
    draft: { zh: "正在预览编辑器里的草稿", ja: "エディタの下書きをプレビュー中", en: "Previewing a draft from the editor" },
    rights: { zh: "保留所有权利。", ja: "無断転載を禁じます。", en: "All rights reserved." },
    pause: { zh: "暂停播放", ja: "一時停止", en: "Pause" },
    play: { zh: "继续播放", ja: "再生", en: "Play" },
    slide: { zh: "第 {n} 张", ja: "{n} 枚目", en: "Slide {n}" },
    navHome: { zh: "首页", ja: "ホーム", en: "Home" },
    aboutMore: { zh: "了解更多", ja: "プロフィールを見る", en: "More about me" },
    findMe: { zh: "在这些地方找到我", ja: "ほかの場所でも", en: "Elsewhere" },
    translated: { zh: "", ja: "中国語の原文から翻訳しています。", en: "Translated from the Chinese original." },
    readOriginal: { zh: "在公众号阅读原文", ja: "WeChat で原文を読む", en: "Read the original on WeChat" },
    scrollHint: { zh: "向下浏览", ja: "スクロール", en: "Scroll" }
  };
  function u(key, vars) {
    var s = (UI[key] && UI[key][LANG]) || key;
    if (vars) for (var k in vars) s = s.replace("{" + k + "}", vars[k]);
    return s;
  }
  /* pick the current language, falling back to the others */
  function t(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    var order = [LANG].concat(LANGS.filter(function (l) { return l !== LANG; }));
    for (var i = 0; i < order.length; i++) if (v[order[i]]) return v[order[i]];
    return "";
  }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function safeUrl(s) { s = String(s || "").trim(); return /^(https?:|mailto:|#|media\/|\.{0,2}\/|[\w-]+\/)/i.test(s) || /^[\w.-]+\.(webp|jpe?g|png|gif|avif|svg)$/i.test(s) ? s : "#"; }
  function isExternal(s) { return /^https?:/i.test(s); }
  var ICON = {
    chev: '<svg viewBox="0 0 10 16" aria-hidden="true"><path d="M2 1.5 8.5 8 2 14.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    left: '<svg viewBox="0 0 10 16" aria-hidden="true"><path d="M8 1.5 1.5 8 8 14.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    ext: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3h8v8M13 3 3 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 14 16" aria-hidden="true"><path d="M2 1.6v12.8c0 .6.7 1 1.2.7l10.1-6.4a.8.8 0 0 0 0-1.4L3.2.9C2.7.6 2 1 2 1.6Z" fill="currentColor"/></svg>',
    menu: '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M2 6h14M2 12h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 3.5l11 11M14.5 3.5l-11 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };
  function more(href, label, sm) {
    var ext = isExternal(href);
    return '<a class="more' + (sm ? " more--sm" : "") + '" href="' + esc(safeUrl(href)) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + esc(label) + (ext ? ICON.ext : ICON.chev) + "</a>";
  }
  function img(src, alt, cls, eager) {
    if (!src) return "";
    return '<img src="' + esc(safeUrl(src)) + '" alt="' + esc(alt || "") + '"' + (cls ? ' class="' + cls + '"' : "") + (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async">';
  }
  function fmtDate(s) {
    var m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return esc(s || "");
    var y = +m[1], mo = +m[2], d = +m[3];
    if (LANG === "en") return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][mo - 1] + " " + d + ", " + y;
    return y + "年" + mo + "月" + d + "日";
  }
  function byId(id) { for (var i = 0; i < WORKS.length; i++) if (WORKS[i].id === id) return WORKS[i]; return null; }
  function postById(id) { for (var i = 0; i < POSTS.length; i++) if (POSTS[i].id === id) return POSTS[i]; return null; }
  function workHref(w) { return "#w-" + w.id; }
  function postHref(p) { return "#p-" + p.id; }
  function cats() { return ["film", "commercial", "photo", "writing"]; }
  function linkable(w) { return w && w.category === "film"; }
  function photoItem(w) {
    return '<figure class="photo">' + img(w.cover, t(w.title)) + (t(w.title) ? "<figcaption>" + esc(t(w.title)) + (w.year ? "<span>" + esc(w.year) + "</span>" : "") + "</figcaption>" : "") + "</figure>";
  }
  function mark(cls) { return '<span class="' + (cls || "mark") + '">' + esc(SITE.name || "labagound") + '<i class="dot" aria-hidden="true"></i></span>'; }

  /* ---------- markdown (small, safe subset) ---------- */
  function inline(s) {
    s = esc(s);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, txt, href) {
      var h = safeUrl(href.replace(/&amp;/g, "&"));
      return '<a href="' + esc(h) + '"' + (isExternal(h) ? ' target="_blank" rel="noopener"' : "") + ">" + txt + "</a>";
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    return s.replace(/\n/g, "<br>");
  }
  var IMG_RE = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
  function md(src) {
    if (!src) return "";
    var blocks = String(src).replace(/\r/g, "").split(/\n{2,}/);
    var out = [];
    blocks.forEach(function (b) {
      b = b.trim();
      if (!b) return;
      if (/^###\s/.test(b)) return out.push("<h3>" + inline(b.replace(/^###\s+/, "")) + "</h3>");
      if (/^##\s/.test(b)) return out.push("<h2>" + inline(b.replace(/^##\s+/, "")) + "</h2>");
      if (/^#\s/.test(b)) return out.push("<h2>" + inline(b.replace(/^#\s+/, "")) + "</h2>");
      var stripped = b.replace(IMG_RE, "").trim();
      if (!stripped) {
        var figs = [];
        b.replace(IMG_RE, function (_, alt, href) {
          figs.push('<figure><img src="' + esc(safeUrl(href)) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async">' + (alt ? "<figcaption>" + esc(alt) + "</figcaption>" : "") + "</figure>");
        });
        return out.push(figs.length > 1 ? '<div class="fig-row" style="--n:' + Math.min(figs.length, 3) + '">' + figs.join("") + "</div>" : figs[0]);
      }
      var lines = b.split("\n");
      if (lines.every(function (l) { return /^[-*]\s/.test(l); })) return out.push("<ul>" + lines.map(function (l) { return "<li>" + inline(l.replace(/^[-*]\s+/, "")) + "</li>"; }).join("") + "</ul>");
      if (lines.every(function (l) { return /^\d+[.)]\s/.test(l); })) return out.push("<ol>" + lines.map(function (l) { return "<li>" + inline(l.replace(/^\d+[.)]\s+/, "")) + "</li>"; }).join("") + "</ol>");
      if (lines.every(function (l) { return /^>\s?/.test(l); })) return out.push("<blockquote><p>" + inline(lines.map(function (l) { return l.replace(/^>\s?/, ""); }).join("\n")) + "</p></blockquote>");
      out.push("<p>" + inline(b) + "</p>");
    });
    return out.join("\n");
  }

  /* ---------- chrome: nav + footer ---------- */
  function langSwitch(id) {
    return '<div class="lang" role="group" aria-label="' + esc(u("language")) + '"' + (id ? ' id="' + id + '"' : "") + ">" + LANGS.map(function (l) {
      return '<button type="button" data-lang="' + l + '" aria-pressed="' + (l === LANG) + '" lang="' + HTML_LANG[l] + '" title="' + LANG_NAME[l] + '"><span aria-hidden="true">' + LANG_LABEL[l] + '</span><span class="sr">' + LANG_NAME[l] + "</span></button>";
    }).join("") + "</div>";
  }
  function renderChrome(route) {
    var name = esc(SITE.name || "labagound");
    var cur = route.type;
    var links = [
      ["#works", u("works"), cur === "works" || cur === "work"],
      ["#journal", u("journal"), cur === "journal" || cur === "post"],
      ["#about", u("about"), cur === "about"]
    ];
    var linkHtml = links.map(function (l) { return '<a href="' + l[0] + '"' + (l[2] ? ' aria-current="page"' : "") + ">" + esc(l[1]) + "</a>"; }).join("");
    document.getElementById("nav").innerHTML =
      '<a class="skip" href="#main" data-skip>' + esc(u("skip")) + "</a>" +
      '<div class="wrap nav__in"><a class="nav__mark" href="#" aria-label="' + name + '">' + mark() + "</a>" +
      '<nav class="nav__links" aria-label="' + esc(u("menu")) + '">' + linkHtml + "</nav>" + langSwitch() +
      '<button class="nav__menu" type="button" aria-expanded="false" aria-controls="sheet" aria-label="' + esc(u("menu")) + '">' + ICON.menu + "</button></div>";
    // the phone menu lives outside the blurred nav bar, so it can cover the whole screen
    var feat = byId(SITE.featuredWork) || WORKS[0];
    var prof = SITE.profile || {};
    var items = [
      ["#", u("navHome"), (WORKS.filter(function (w) { return w.category === "photo"; })[0] || {}).cover, t(SITE.heroTitle), cur === "home"],
      ["#works", u("works"), feat && feat.cover, u("worksText"), cur === "works" || cur === "work"],
      ["#journal", u("journal"), (POSTS[0] || {}).cover, t(SITE.journalText) || u("journalText"), cur === "journal" || cur === "post"],
      ["#about", u("about"), prof.photo, t(SITE.skills), cur === "about"]
    ];
    var sheet = document.getElementById("sheet");
    if (!sheet) { sheet = document.createElement("div"); sheet.id = "sheet"; sheet.className = "sheet"; document.body.appendChild(sheet); }
    sheet.setAttribute("data-open", "false");
    document.body.style.overflow = "";
    sheet.innerHTML = '<nav class="wrap sheet__in" aria-label="' + esc(u("menu")) + '">' + items.map(function (it, i) {
        return '<a class="sheet__link" href="' + it[0] + '" style="--i:' + i + '"' + (it[4] ? ' aria-current="page"' : "") + ">" + esc(it[1]) + "</a>";
      }).join("") + "</nav>";
    var year = new Date().getFullYear();
    document.getElementById("foot").innerHTML =
      '<div class="wrap"><div class="foot__mark" aria-hidden="true">' + mark() + "</div>" +
      '<div class="foot__row"><nav class="foot__links" aria-label="footer">' + linkHtml +
      (SITE.links || []).filter(function (l) { return l.url; }).map(function (l) { return '<a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener">' + esc(t(l.label)) + (l.handle ? " · " + esc(l.handle) : "") + "</a>"; }).join("") +
      "</nav>" + langSwitch() + "</div>" +
      '<p class="foot__copy">© ' + year + " " + name + ". " + esc(u("rights")) + "</p></div>";
  }

  /* ---------- pieces ---------- */
  function tile(w, wide) {
    var alt = t(w.subtitle);
    var go = linkable(w), tag = go ? "a" : "div", href = go ? ' href="' + workHref(w) + '"' : "";
    if (w.category === "writing" || !w.cover) {
      return "<" + tag + ' class="tile tile--text rise' + (go ? "" : " tile--static") + '"' + href + '><div class="tile__body">' +
        '<div><h3 class="tile__title">' + esc(t(w.title)) + "</h3>" + (alt ? '<p class="tile__alt">' + esc(alt) + "</p>" : "") + "</div>" +
        (t(w.summary) ? '<p class="tile__sum">' + esc(t(w.summary)) + "</p>" : "") +
        '<p class="tile__roles">' + esc(t(w.roles)) + "</p></div></" + tag + ">";
    }
    var sub = w.category === "commercial" ? t(w.client) : (alt && alt !== t(w.title) ? alt : "");
    return "<" + tag + ' class="tile rise' + (wide ? " tile--wide" : "") + (go ? "" : " tile--static") + '"' + href + '>' +
      '<div class="tile__img">' + img(w.cover, t(w.title)) + "</div>" +
      '<div class="tile__body"><h3 class="tile__title">' + esc(t(w.title)) + "</h3>" +
      (sub ? '<p class="tile__alt">' + esc(sub) + "</p>" : "") +
      '<p class="tile__roles">' + esc(t(w.roles)) + "</p></div></" + tag + ">";
  }
  function card(w) {
    return '<div class="card">' +
      '<div class="card__img">' + img(w.cover, t(w.title)) + "</div>" +
      '<div class="card__body"><h3 class="card__title">' + esc(t(w.title)) + "</h3>" +
      '<p class="card__client">' + esc(t(w.client)) + "</p>" +
      '<p class="card__role">' + esc(t(w.roles)) + "</p></div></div>";
  }
  function postCard(p, list) {
    var inner = '<div class="post__img">' + img(p.cover, "") + "</div>";
    var txt = '<p class="post__tag">' + esc(t(p.tag)) + "</p>" +
      '<h3 class="post__title">' + esc(t(p.title)) + "</h3>" +
      (list ? '<p class="post__ex">' + esc(t(p.excerpt)) + "</p>" : "");
    return '<a class="post rise" href="' + postHref(p) + '">' + inner + (list ? '<div class="post__txt">' + txt + "</div>" : txt) + "</a>";
  }
  function gallery(list, label) {
    if (!list || !list.length) return "";
    return '<div class="just" data-just data-label="' + esc(label || "") + '">' + list.map(function (s, i) {
      return '<div class="ph" data-src="' + esc(safeUrl(s)) + '" data-i="' + i + '">' + img(s, "") + "</div>";
    }).join("") + "</div>";
  }
  function workActions(w, cinema) {
    var a = [];
    if (w.video) a.push('<a class="btn" href="' + esc(safeUrl(w.video)) + '" target="_blank" rel="noopener">' + ICON.play + esc(u("watchFilm")) + "</a>");
    (w.links || []).forEach(function (l, i) {
      if (!l.url) return;
      if (!w.video && i === 0) a.push('<a class="btn" href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener">' + esc(t(l.label) || l.url) + ICON.ext + "</a>");
      else a.push(more(l.url, t(l.label) || l.url, true));
    });
    return a.length ? '<div class="actions">' + a.join("") + "</div>" : "";
  }

  /* ---------- pages ---------- */
  function pageHome() {
    var feat = byId(SITE.featuredWork) || WORKS.filter(function (w) { return w.featured; })[0] || WORKS[0];
    var films = WORKS.filter(function (w) { return w.category === "film" && w !== feat; });
    var brands = WORKS.filter(function (w) { return w.category === "commercial"; });
    var photoWorks = WORKS.filter(function (w) { return w.category === "photo"; });
    var photos = [];
    photoWorks.forEach(function (w) { if (w.cover) photos.push(w.cover); });
    var scripts = WORKS.filter(function (w) { return w.category === "writing"; });
    var h = [];

    // hero: a full white page, the title, and slow light drifting behind it
    var title = t(SITE.heroTitle) || SITE.name || "";
    var ci = 0;
    var chars = title.split(/(\n|[ \t]+)/).map(function (word) {
      if (word === "\n") return "<br>";
      if (/^\s+$/.test(word)) return " ";
      return '<span class="w">' + Array.from(word).map(function (ch) { return '<span class="ch" style="--i:' + (ci++) + '">' + esc(ch) + "</span>"; }).join("") + "</span>";
    }).join("");
    h.push('<section class="lead" id="lead" aria-labelledby="hero-title">' +
      '<div class="lead__bg" aria-hidden="true"><i class="orb orb--1"></i><i class="orb orb--2"></i><i class="orb orb--3"></i><i class="lead__grain"></i></div>' +
      '<div class="lead__in wrap"><h1 id="hero-title" class="lead__title" aria-label="' + esc(title.replace(/\n/g, "")) + '"><span aria-hidden="true">' + chars + "</span></h1>" +
      (t(SITE.heroText) ? '<p class="lead__text">' + esc(t(SITE.heroText)) + "</p>" : "") +
      '<div class="actions lead__actions">' + (feat && feat.video ? '<a class="btn" href="' + esc(safeUrl(feat.video)) + '" target="_blank" rel="noopener">' + ICON.play + esc(u("watchFilm")) + "</a>" : "") + more("#works", u("seeWork"), true) + "</div></div>" +
      '<div class="lead__foot wrap">' + (t(SITE.skills) ? '<p class="lead__skills">' + esc(t(SITE.skills)) + "</p>" : "<span></span>") +
      '<a class="lead__cue" href="#featured"><span>' + esc(u("scrollHint")) + '</span><i aria-hidden="true"></i></a></div>' +
      "</section>");

    // featured film
    if (feat) {
      var alt = t(feat.subtitle);
      h.push('<section class="band band--cinema" id="featured" aria-labelledby="feat-title"><div class="wrap feature">' +
        (feat.poster || feat.cover ? '<a class="feature__poster rise" href="' + workHref(feat) + '" tabindex="-1" aria-hidden="true">' + img(feat.poster || feat.cover, "") + "</a>" : "") +
        '<div class="rise-2"><h2 class="feature__title" id="feat-title">' + esc(t(feat.title)) + "</h2>" +
        (alt && alt !== t(feat.title) ? '<p class="feature__alt">' + esc(alt) + "</p>" : "") +
        '<p class="feature__roles">' + esc([t(feat.roles), t(feat.place), feat.year].filter(Boolean).join("　·　")) + "</p>" +
        '<p class="feature__sum">' + esc(t(feat.summary)) + "</p>" +
        '<div class="actions">' + (feat.video ? '<a class="btn" href="' + esc(safeUrl(feat.video)) + '" target="_blank" rel="noopener">' + ICON.play + esc(u("watchFilm")) + "</a>" : "") + more(workHref(feat), u("learnMore"), true) + "</div>" +
        "</div></div>" +
        (feat.gallery && feat.gallery.length ? '<div class="strip-wrap"><div class="strip" id="strip" data-label="' + esc(t(feat.title)) + '">' + feat.gallery.map(function (s, i) {
          return '<div class="ph" data-src="' + esc(safeUrl(s)) + '" data-i="' + i + '">' + img(s, "") + "</div>";
        }).join("") + '</div><div class="wide paddles"><button class="paddle" type="button" data-dir="-1" aria-label="' + esc(u("prevImg")) + '">' + ICON.left + '</button><button class="paddle" type="button" data-dir="1" aria-label="' + esc(u("nextImg")) + '">' + ICON.chev + "</button></div></div>" : "") +
        "</section>");
    }

    // more films
    if (films.length) {
      h.push('<section class="band band--alt" id="films" aria-labelledby="films-title"><div class="wrap">' +
        '<div class="head"><h2 id="films-title" class="rise">' + esc(u("moreFilms")) + "</h2>" + more("#works-film", u("allWorks")) + "</div>" +
        '<div class="tiles">' + films.map(function (w) { return tile(w); }).join("") + "</div></div></section>");
    }

    // brand work
    if (brands.length) {
      var stats = (SITE.brandStats || []).map(function (s) { return '<div class="stat rise"><div class="stat__v num">' + esc(t(s.value)) + '</div><div class="stat__l">' + esc(t(s.label)) + "</div></div>"; }).join("");
      h.push('<section class="band" id="brands" aria-labelledby="brands-title"><div class="wrap">' +
        '<div class="head"><div><h2 id="brands-title" class="rise">' + esc(u("brandsTitle")) + "</h2>" + (t(SITE.brandsText) ? "<p>" + esc(t(SITE.brandsText)) + "</p>" : "") + "</div>" + more("#works-commercial", u("allWorks")) + "</div>" +
        (stats ? '<div class="stats">' + stats + "</div>" : "") + "</div>" +
        '<div class="cards" id="cards">' + brands.map(card).join("") + "</div>" +
        '<div class="wrap">' + '<div class="paddles"><button class="paddle" type="button" data-for="cards" data-dir="-1" aria-label="' + esc(u("prev")) + '">' + ICON.left + '</button><button class="paddle" type="button" data-for="cards" data-dir="1" aria-label="' + esc(u("next")) + '">' + ICON.chev + "</button></div>" +
        (SITE.brands ? '<p class="brands">' + esc(t(SITE.brands)) + "</p>" : "") + "</div></section>");
    }

    // photographs
    if (photos.length) {
      h.push('<section class="band band--alt" id="photos" aria-labelledby="photos-title"><div class="wrap"><div class="head"><h2 id="photos-title" class="rise">' + esc(u("photosTitle")) + "</h2>" +
        more("#works-photo", u("learnMore")) + '</div></div><div class="wide">' + gallery(photos, u("photosTitle")) + "</div></section>");
    }

    // scripts
    if (scripts.length) {
      h.push('<section class="band" id="writing" aria-labelledby="writing-title"><div class="wrap"><div class="head"><div><h2 id="writing-title" class="rise">' + esc(u("writingTitle")) + "</h2><p>" + esc(u("writingText")) + "</p></div></div>" +
        '<div class="tiles">' + scripts.map(function (w) { return tile(w); }).join("") + "</div></div></section>");
    }

    // journal
    if (POSTS.length) {
      h.push('<section class="band band--alt" id="latest" aria-labelledby="latest-title"><div class="wrap"><div class="head"><div><h2 id="latest-title" class="rise">' + esc(u("journalTitle")) + "</h2><p>" + esc(t(SITE.journalText) || u("journalText")) + "</p></div>" + more("#journal", u("allPosts")) + "</div>" +
        '<div class="posts">' + POSTS.slice(0, 3).map(function (p) { return postCard(p); }).join("") + "</div></div></section>");
    }

    // about teaser
    h.push(aboutTeaser());
    return h.join("");
  }

  function socials() {
    var links = (SITE.links || []).filter(function (l) { return l.url; });
    var email = SITE.email ? String(SITE.email).trim() : "";
    return (links.length ? '<ul class="socials">' + links.map(function (l) {
        return '<li><a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener"><span class="socials__k">' + esc(t(l.label)) + '</span><span class="socials__v">' + esc(l.handle || t(l.label)) + "</span>" + ICON.ext + "</a></li>";
      }).join("") + "</ul>" : "") +
      (email ? '<div class="copy"><span class="socials__k">' + esc(u("contact")) + '</span><code id="email">' + esc(email) + '</code><button type="button" data-copy="email">' + esc(u("copy")) + "</button></div>" : "");
  }
  function aboutTeaser() {
    var prof = SITE.profile || {};
    var first = (t(SITE.about) || "").split(/\n{2,}/).pop();
    return '<section class="band band--cinema" id="about-teaser" aria-labelledby="about-t"><div class="wrap teaser">' +
      (prof.photo ? '<a class="teaser__photo rise" href="#about" tabindex="-1" aria-hidden="true">' + img(prof.photo, "") + "</a>" : "") +
      '<div class="rise-2"><h2 id="about-t" class="teaser__name">' + esc(t(prof.name) || u("about")) + "</h2>" +
      (t(SITE.skills) ? '<p class="teaser__skills">' + esc(t(SITE.skills)) + "</p>" : "") +
      (first ? '<p class="teaser__text">' + esc(first) + "</p>" : "") +
      '<div class="actions">' + more("#about", u("aboutMore")) + "</div></div></div></section>";
  }
  function pageAbout() {
    var prof = SITE.profile || {};
    var paras = (t(SITE.about) || "").split(/\n{2,}/).filter(Boolean);
    var facts = (prof.facts || []).filter(function (f) { return t(f.value); });
    return '<section class="wrap me-head">' +
      '<div class="me-head__txt fade-in"><h1>' + esc(t(prof.name) || u("about")) + "</h1>" +
      (t(prof.reading) ? '<p class="me-head__reading">' + esc(t(prof.reading)) + "</p>" : "") +
      (t(SITE.skills) ? '<p class="me-head__skills">' + esc(t(SITE.skills)) + "</p>" : "") + "</div>" +
      (prof.photo ? '<figure class="me-photo fade-in">' + img(prof.photo, t(prof.name), "", true) + "</figure>" : "") +
      "</section>" +
      '<section class="wrap me-body"><div class="me-text">' + paras.map(function (p, i) { return '<p class="rise' + (i === 0 ? " me-text__lead" : "") + '">' + esc(p) + "</p>"; }).join("") + "</div>" +
      '<aside class="me-side">' +
      (facts.length ? '<dl class="facts">' + facts.map(function (f) { return "<div><dt>" + esc(t(f.label)) + "</dt><dd>" + esc(t(f.value)) + "</dd></div>"; }).join("") + "</dl>" : "") +
      '<h2 class="me-side__h">' + esc(u("findMe")) + "</h2>" + socials() + "</aside></section>";
  }

  function pageWorks(filter) {
    if (cats().indexOf(filter) < 0) filter = "all";
    var list = WORKS.filter(function (w) { return filter === "all" || w.category === filter; });
    var count = function (c) { return WORKS.filter(function (w) { return c === "all" || w.category === c; }).length; };
    var chips = ["all"].concat(cats()).filter(function (c) { return count(c) > 0; }).map(function (c) {
      return '<a class="chip" href="#' + (c === "all" ? "works" : "works-" + c) + '"' + (c === filter ? ' aria-current="true"' : "") + ">" + esc(u(c)) + " <span>" + count(c) + "</span></a>";
    }).join("");
    var groups = filter === "all" ? cats() : [filter];
    var body = groups.map(function (c) {
      var ws = list.filter(function (w) { return w.category === c; });
      if (!ws.length) return "";
      return (filter === "all" ? '<h2 class="w-section-title" style="margin-top:56px">' + esc(u(c)) + "</h2>" : "") +
        (c === "photo" ? '<div class="photos">' + ws.map(photoItem).join("") + "</div>" :
        '<div class="tiles">' + ws.map(function (w, i) { return tile(w, i === 0 && ws.length % 2 === 1 && c !== "writing"); }).join("") + "</div>");
    }).join("");
    return '<section class="wrap page-head fade-in"><h1>' + esc(u("works")) + "</h1><p>" + esc(u("worksText")) + '</p><nav class="chips" aria-label="' + esc(u("works")) + '">' + chips + "</nav></section>" +
      '<section class="wrap" style="padding-bottom:var(--band)">' + body + "</section>";
  }

  function pageWork(w) {
    if (!w) return pageMissing();
    var alt = t(w.subtitle);
    var meta = [t(w.roles), t(w.place), w.year].filter(Boolean);
    var label = w.category === "film" ? u("stills") : w.category === "commercial" ? u("frames") : u("images");
    var same = WORKS.filter(function (x) { return x.category === w.category; });
    var idx = same.indexOf(w);
    var prev = same[(idx - 1 + same.length) % same.length], next = same[(idx + 1) % same.length];
    var h = [];
    h.push('<header class="wrap w-head fade-in">' +
      (w.category === "commercial" && t(w.client) ? '<p class="w-head__client">' + esc(t(w.client)) + "</p>" : "") +
      "<h1>" + esc(t(w.title)) + "</h1>" +
      (alt && alt !== t(w.title) ? '<p class="w-head__alt">' + esc(alt) + "</p>" : "") +
      (meta.length ? '<p class="w-head__meta">' + meta.map(function (m) { return "<span>" + esc(m) + "</span>"; }).join("") + "</p>" : "") +
      "</header>");
    if (w.cover) h.push('<figure class="w-frame fade-in"><div class="w-frame__in">' + img(w.cover, t(w.title), "", true) + "</div></figure>");
    var sum = t(w.summary), acts = workActions(w);
    if (sum || acts || w.poster) {
      h.push('<section class="wrap"><div class="w-intro' + (w.poster ? " w-intro--poster" : "") + '">' +
        (w.poster ? '<div class="w-poster rise">' + img(w.poster, t(w.title)) + "</div>" : "") +
        (w.poster ? "<div>" + (sum ? '<p class="w-intro__sum">' + esc(sum) + "</p>" : "") + acts + "</div>" : (sum ? '<p class="w-intro__sum">' + esc(sum) + "</p>" : "<div></div>") + acts) +
        "</div></section>");
    }
    var body = md(t(w.body));
    if (body) h.push('<article class="wrap"><div class="prose" style="padding-top:clamp(48px,6vw,88px)">' + body + "</div></article>");
    var gal = (w.gallery || []).filter(function (s) { return s !== w.cover || (w.gallery || []).length > 1; });
    if (gal.length) h.push('<section class="w-gallery"><div class="wrap"><h2>' + esc(label) + '</h2></div><div class="wide">' + gallery(gal, t(w.title)) + "</div></section>");
    if (same.length > 1) {
      h.push('<nav class="wrap w-next" aria-label="' + esc(u("works")) + '" style="padding-block:var(--band)">' +
        navLink(prev, u("prev")) + navLink(next, u("next")) + "</nav>");
    } else h.push('<div style="height:var(--band)"></div>');
    return h.join("");
  }
  function navLink(w, label) {
    return '<a href="' + workHref(w) + '"><div class="w-next__img">' + (w.cover ? img(w.cover, "") : "") + "</div><div><small>" + esc(label) + "</small><strong>" + esc(t(w.title)) + "</strong></div></a>";
  }

  function pageJournal() {
    return '<section class="wrap page-head fade-in"><h1>' + esc(u("journalTitle")) + "</h1><p>" + esc(t(SITE.journalText) || u("journalText")) + "</p></section>" +
      '<section class="wrap" style="padding-bottom:var(--band)"><div class="posts posts--list">' + POSTS.map(function (p) { return postCard(p, true); }).join("") + "</div></section>";
  }

  function pagePost(p) {
    if (!p) return pageMissing();
    var others = POSTS.filter(function (x) { return x !== p; }).slice(0, 3);
    return '<article><header class="wrap"><div class="p-head fade-in"><p class="p-head__meta"><span>' + esc(t(p.tag)) + "</span></p>" +
      "<h1>" + esc(t(p.title)) + "</h1>" + (t(p.excerpt) ? "<p>" + esc(t(p.excerpt)) + "</p>" : "") + "</div></header>" +
      (p.cover ? '<figure class="p-cover fade-in">' + img(p.cover, "", "", true) + "</figure>" : '<div style="height:48px"></div>') +
      '<div class="wrap"><div class="prose' + (/\n(?!\n)/.test(t(p.body)) ? " prose--verse" : "") + '">' + md(t(p.body)) + "</div>" +
      (p.source ? '<p class="p-source">' + (LANG !== "zh" ? '<span class="p-source__note">' + esc(u("translated")) + "</span>" : "") + more(p.source, u("readOriginal"), true) + "</p>" : "") + "</div></article>" +
      (others.length ? '<section class="band band--alt" style="margin-top:var(--band)"><div class="wrap"><div class="head"><h2>' + esc(u("morePosts")) + "</h2>" + more("#journal", u("allPosts")) + '</div><div class="posts">' + others.map(function (x) { return postCard(x); }).join("") + "</div></div></section>" : '<div style="height:var(--band)"></div>');
  }

  function pageMissing() {
    return '<section class="wrap empty"><h1>' + esc(u("notFound")) + "</h1><p>" + esc(u("notFoundText")) + "</p>" + more("#", u("home")) + "</section>";
  }

  /* ---------- router ---------- */
  function parse() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (h.indexOf("w-") === 0) return { type: "work", id: h.slice(2) };
    if (h.indexOf("p-") === 0) return { type: "post", id: h.slice(2) };
    if (h === "works") return { type: "works", filter: "all" };
    if (h.indexOf("works-") === 0) return { type: "works", filter: h.slice(6) };
    if (h === "journal") return { type: "journal" };
    if (h === "about") return { type: "about" };
    return { type: "home", anchor: h };
  }
  var lastKey = null;
  function render(keepScroll) {
    var r = parse();
    var key = r.type + ":" + (r.id || r.filter || "");
    var y = window.scrollY;
    document.documentElement.lang = HTML_LANG[LANG];
    renderChrome(r);
    var main = document.getElementById("main");
    var html, title = SITE.name || "labagound";
    if (r.type === "work") { var w = byId(r.id); html = pageWork(w); if (w) title = t(w.title) + " · " + title; }
    else if (r.type === "post") { var p = postById(r.id); html = pagePost(p); if (p) title = t(p.title) + " · " + title; }
    else if (r.type === "works") { html = pageWorks(r.filter); title = u("works") + " · " + title; }
    else if (r.type === "journal") { html = pageJournal(); title = u("journalTitle") + " · " + title; }
    else if (r.type === "about") { html = pageAbout(); title = u("about") + " · " + title; }
    else html = pageHome();
    main.innerHTML = html;
    wire.instant = !!keepScroll;
    document.title = title;
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t(SITE.heroText));
    wire();
    if (keepScroll) window.scrollTo(0, y);
    else if (r.type === "home" && r.anchor) {
      var el = document.getElementById(r.anchor);
      if (el) requestAnimationFrame(function () { el.scrollIntoView(); });
      else window.scrollTo(0, 0);
    } else if (key !== lastKey) window.scrollTo(0, 0);
    lastKey = key;
    if (isDraft && !document.querySelector(".draft-bar")) {
      var bar = document.createElement("div"); bar.className = "draft-bar"; bar.textContent = u("draft"); document.body.appendChild(bar);
    }
  }

  /* ---------- behaviour ---------- */
  function wire() {
    // language buttons
    Array.prototype.forEach.call(document.querySelectorAll("[data-lang]"), function (b) {
      b.addEventListener("click", function () {
        LANG = b.getAttribute("data-lang");
        try { localStorage.setItem("labagound-lang", LANG); } catch (e) {}
        render(true);
        var again = document.querySelector('.nav [data-lang="' + LANG + '"]');
        if (again && b.closest(".nav")) again.focus();
      });
    });
    // mobile sheet
    var mb = document.querySelector(".nav__menu"), sheet = document.getElementById("sheet");
    if (mb && sheet) {
      mb.addEventListener("click", function () {
        var open = sheet.getAttribute("data-open") !== "true";
        sheet.setAttribute("data-open", open); mb.setAttribute("aria-expanded", open);
        mb.innerHTML = open ? ICON.close : ICON.menu;
        document.body.style.overflow = open ? "hidden" : "";
      });
      sheet.onclick = function (e) { if (e.target.closest("a")) { sheet.setAttribute("data-open", "false"); document.body.style.overflow = ""; } };
    }
    var skip = document.querySelector("[data-skip]");
    if (skip) skip.addEventListener("click", function (e) { e.preventDefault(); var m = document.getElementById("main"); m.setAttribute("tabindex", "-1"); m.focus(); });
    // galleries
    Array.prototype.forEach.call(document.querySelectorAll("[data-just]"), justify);
    // strip + cards paddles
    var strip = document.getElementById("strip");
    Array.prototype.forEach.call(document.querySelectorAll(".paddle"), function (p) {
      var target = p.getAttribute("data-for") ? document.getElementById(p.getAttribute("data-for")) : strip;
      if (!target) return;
      p.addEventListener("click", function () { target.scrollBy({ left: +p.getAttribute("data-dir") * target.clientWidth * 0.8, behavior: "smooth" }); });
      var upd = function () {
        var max = target.scrollWidth - target.clientWidth - 2;
        p.disabled = +p.getAttribute("data-dir") < 0 ? target.scrollLeft <= 2 : target.scrollLeft >= max;
      };
      target.addEventListener("scroll", upd, { passive: true }); upd();
    });
    // zoomable things
    
    var proseImgs = document.querySelectorAll(".prose img[data-zoom]");
    zoomGroup(proseImgs);
    // portrait covers sit inside the frame rather than being cropped
    Array.prototype.forEach.call(document.querySelectorAll(".card__img img, .w-frame__in img"), function (im) {
      var check = function () { if (im.naturalHeight > im.naturalWidth * 1.05) im.classList.add("is-tall"); };
      if (im.complete) check(); else im.addEventListener("load", check);
    });
    // copy email
    Array.prototype.forEach.call(document.querySelectorAll("[data-copy]"), function (b) {
      b.addEventListener("click", function () {
        var el = document.getElementById(b.getAttribute("data-copy")); if (!el) return;
        var done = function () { b.textContent = u("copied"); setTimeout(function () { b.textContent = u("copy"); }, 1600); };
        var fallback = function () { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); };
        try { navigator.clipboard.writeText(el.textContent).then(done, fallback); } catch (e) { fallback(); }
      });
    });
    // a picture that fails to load leaves its frame empty rather than showing a broken icon
    Array.prototype.forEach.call(document.querySelectorAll("#main img"), function (im) {
      var miss = function () { im.classList.add("is-missing"); var f = im.closest(".prose figure"); if (f) f.hidden = true; };
      if (im.complete && im.naturalWidth === 0 && im.getAttribute("src")) miss(); else im.addEventListener("error", miss);
    });
    hero();
    reveal(!!wire.instant);
  }

  /* ---------- scroll reveal ---------- */
  var io = null;
  // home page: the full set. Other pages: titles slide in, pictures and blocks only fade, running text stays still
  var REVEAL_RICH = [
    [".head h2, .feature__title, .teaser__name", "title"],
    [".head p, .head > .more, .feature__alt, .feature__roles, .feature__sum, .feature .actions, .teaser__skills, .teaser__text, .teaser .actions", "text"],
    [".tile, .post, .stat, .brands", "block"],
    [".feature__poster, .teaser__photo, .just__row .ph", "img"]
  ];
  var REVEAL_CALM = [
    [".head h2, .page-head h1, .w-head h1, .p-head h1, .me-head h1, .w-section-title, .w-gallery h2", "title"],
    [".head p, .page-head p, .chips, .w-head__client, .w-head__alt, .w-head__meta, .p-head__meta, .p-head p, .me-head__reading, .me-head__skills, .w-intro__sum, .w-intro .actions, .me-text p, .me-side__h, .socials li, .prose > p, .prose > h2, .prose > h3, .prose > blockquote, .prose > ul, .prose > ol, .p-source", "text"],
    [".tile, .post, .photo, .w-next a, .me-photo, .w-frame, .p-cover, .just__row .ph, .prose figure, .prose .fig-row", "fade"]
  ];
  var GROUPS = ".cards, .strip";
  function reveal(instant) {
    if (io) io.disconnect();
    var main = document.getElementById("main");
    if (!main || !("IntersectionObserver" in window)) return;
    var els = [];
    var rich = parse().type === "home";
    main.setAttribute("data-motion", rich ? "rich" : "calm");
    (rich ? REVEAL_RICH : REVEAL_CALM).forEach(function (r) {
      Array.prototype.forEach.call(main.querySelectorAll(r[0]), function (el) {
        if (el.closest(".lead") || el.hasAttribute("data-reveal")) return;
        el.setAttribute("data-reveal", r[1]);
        if (r[1] === "img" && !el.matches(".just__row .ph")) el.setAttribute("data-reveal-img", "");
        els.push(el);
      });
    });
    // horizontal rails (film stills, brand cards) stay still: they scroll sideways on their own
    // hover effects stay off until the entrance has fully finished
    var settle = function (t, wait) {
      clearTimeout(t.__settle);
      t.__settle = setTimeout(function () { if (t.classList.contains("is-in")) t.classList.add("is-settled"); }, wait);
    };
    var setIn = function (el, on, up) {
      var targets = el.hasAttribute("data-reveal-group") ? el.children : [el];
      Array.prototype.forEach.call(targets, function (t) {
        if (on) {
          if (t.classList.contains("is-in")) return;
          t.classList.add("is-in"); t.removeAttribute("data-out");
          settle(t, (parseInt(t.style.getPropertyValue("--rv-d"), 10) || 0) + 1100);
        } else {
          clearTimeout(t.__settle);
          t.classList.remove("is-in", "is-settled"); t.setAttribute("data-out", up ? "up" : "down");
        }
      });
    };
    io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left; });
      entries.forEach(function (e) {
        var el = e.target, grp = el.hasAttribute("data-reveal-group");
        // come in once a little of it shows; leave only when it is completely off screen
        if (e.isIntersecting && e.intersectionRatio >= 0.06) {
          if (!grp && !el.classList.contains("is-in")) el.style.setProperty("--rv-d", Math.min(n++, 4) * 60 + "ms");
          setIn(el, true);
        } else if (!e.isIntersecting) {
          setIn(el, false, e.boundingClientRect.top < 0);
        }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: [0, 0.06] });
    // each element comes in from the side of the screen it sits on; full-width pieces alternate
    var alt = 0, vw = document.documentElement.clientWidth || innerWidth;
    var sideOf = function (el) {
      var r = el.getBoundingClientRect(), mid = (r.left + r.right) / 2;
      if (r.width > vw * 0.62 || Math.abs(mid - vw / 2) < vw * 0.06) return (alt++ % 2) ? "right" : "left";
      return mid < vw / 2 ? "left" : "right";
    };
    els.forEach(function (el) {
      if (el.hasAttribute("data-reveal-group")) {
        Array.prototype.forEach.call(el.children, function (ch) { ch.setAttribute("data-side", "right"); });
      } else el.setAttribute("data-side", rich ? sideOf(el) : "left");
    });
    els.forEach(function (el) {
      if (instant) {
        var r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) {
          var ts = el.hasAttribute("data-reveal-group") ? Array.prototype.slice.call(el.children) : [el];
          ts.forEach(function (t) { t.classList.add("is-instant", "is-in", "is-settled"); });
          requestAnimationFrame(function () { requestAnimationFrame(function () { ts.forEach(function (t) { t.classList.remove("is-instant"); }); }); });
        }
      }
      io.observe(el);
    });
  }

  /* justified rows: each row fills the width at a shared height */
  function justify(box) {
    var buttons = Array.prototype.slice.call(box.querySelectorAll(".ph"));
    var label = box.getAttribute("data-label") || "";
    var ratios = buttons.map(function () { return 1.5; });
    var pending = buttons.length;
    var layout = function () {
      var W = box.clientWidth || 1000;
      var targetH = W < 600 ? 190 : W < 1000 ? 260 : 340;
      var rows = [], row = [], sum = 0;
      buttons.forEach(function (b, i) {
        row.push(i); sum += ratios[i];
        if (sum * targetH >= W) { rows.push({ items: row, last: false }); row = []; sum = 0; }
      });
      if (row.length) rows.push({ items: row, last: sum * targetH < W * 0.7 });
      box.innerHTML = "";
      rows.forEach(function (r) {
        var div = document.createElement("div");
        div.className = "just__row" + (r.last ? " just__row--last" : "");
        div.style.setProperty("--h", targetH + "px");
        r.items.forEach(function (i) { buttons[i].style.setProperty("--ar", ratios[i].toFixed(4)); div.appendChild(buttons[i]); });
        box.appendChild(div);
      });
    };
    buttons.forEach(function (b, i) {
      var im = b.querySelector("img");
      var got = function () { if (im.naturalWidth) ratios[i] = im.naturalWidth / im.naturalHeight; if (--pending === 0) layout(); };
      if (im.complete && im.naturalWidth) { ratios[i] = im.naturalWidth / im.naturalHeight; pending--; }
      else { im.loading = "eager"; im.addEventListener("load", got); im.addEventListener("error", function () { if (--pending === 0) layout(); }); }
    });
    layout();
    var lastW = box.clientWidth;
    if (window.ResizeObserver) new ResizeObserver(function () { if (Math.abs(box.clientWidth - lastW) > 30) { lastW = box.clientWidth; layout(); } }).observe(box);
    zoomGroup(buttons, label);
  }

  /* hero: light follows the pointer a little and the page lifts away on scroll */
  var leadBound = false;
  function hero() {
    var nav = document.getElementById("nav"); if (nav) nav.removeAttribute("data-tone");
    var root = document.getElementById("lead");
    if (!root) return;
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    var loop = function () {
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      var r = document.getElementById("lead");
      if (!r) { raf = 0; return; }
      r.style.setProperty("--mx", cx.toFixed(4)); r.style.setProperty("--my", cy.toFixed(4));
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(loop) : 0;
    };
    root.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      tx = (e.clientX / window.innerWidth) * 2 - 1; ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    var tick = function () {
      var r = document.getElementById("lead"); if (!r) return;
      r.style.setProperty("--sp", Math.min(1, Math.max(0, window.scrollY / (r.offsetHeight * 0.7))).toFixed(4));
    };
    tick();
    if (!leadBound) {
      leadBound = true;
      var sr = 0;
      window.addEventListener("scroll", function () { if (!sr) sr = requestAnimationFrame(function () { sr = 0; tick(); }); }, { passive: true });
    }
  }

  /* ---------- lightbox ---------- */
  var lb, lbList = [], lbIndex = 0, lbLabel = "";
  function ensureLb() {
    if (lb) return lb;
    lb = document.createElement("dialog");
    lb.className = "lb";
    lb.innerHTML = '<div class="lb__stage"><img alt=""></div><div class="lb__bar"><button type="button" data-lb="-1"></button><span class="num" aria-live="polite"></span><button type="button" data-lb="1"></button></div><button type="button" class="lb__close"></button>';
    document.body.appendChild(lb);
    lb.querySelector('[data-lb="-1"]').addEventListener("click", function () { lbGo(-1); });
    lb.querySelector('[data-lb="1"]').addEventListener("click", function () { lbGo(1); });
    lb.querySelector(".lb__close").addEventListener("click", function () { lb.close(); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb__stage")) lb.close(); });
    lb.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") lbGo(-1); if (e.key === "ArrowRight") lbGo(1); });
    var x0 = null;
    lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) lbGo(dx < 0 ? 1 : -1); x0 = null; });
    lb.addEventListener("close", function () { document.body.style.overflow = ""; });
    return lb;
  }
  function lbShow() {
    var im = lb.querySelector("img");
    im.src = lbList[lbIndex]; im.alt = lbLabel ? lbLabel + " " + (lbIndex + 1) : "";
    lb.querySelector(".num").textContent = (lbIndex + 1) + " / " + lbList.length;
    var one = lbList.length < 2;
    lb.querySelector('[data-lb="-1"]').hidden = one; lb.querySelector('[data-lb="1"]').hidden = one;
  }
  function lbGo(d) { lbIndex = (lbIndex + d + lbList.length) % lbList.length; lbShow(); }
  function zoomGroup() { /* pictures are shown as they are, without enlarging */ }


  window.labagoundMD = md;
  if (!document.getElementById("main")) return;

  var leaving = 0;
  window.addEventListener("hashchange", function () {
    var sheet = document.getElementById("sheet"); if (sheet) document.body.style.overflow = "";
    var r = parse();
    if (r.type === "home" && lastKey === "home:" && r.anchor) {
      var el = document.getElementById(r.anchor);
      if (el) { el.scrollIntoView({ behavior: "smooth" }); return; }
    }
    var main = document.getElementById("main");
    clearTimeout(leaving);
    main.classList.add("is-leaving");
    leaving = setTimeout(function () {
      main.classList.remove("is-leaving");
      main.classList.add("is-entering");
      render(false);
      requestAnimationFrame(function () { requestAnimationFrame(function () { main.classList.remove("is-entering"); }); });
    }, 220);
  });
  render(false);
})();
