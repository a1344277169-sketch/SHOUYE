# labagound 网站

纯静态网站，不需要服务器程序，也不需要构建。把整个文件夹上传到任何静态空间（Cloudflare Pages、Vercel、Netlify、GitHub Pages、或者你现在的空间）即可。

```
index.html          网站本体（首页、影视、策划、树屋等页面都在这里，用 #网址 切换）
admin.html          内容编辑器（只在你自己的电脑上用）
content/content.js  全部文字和图片路径（中 / 日 / EN 三种语言）
assets/             样式和脚本
media/              图片；编辑器新加的图片会放进 media/uploads/
```

## 添加或修改内容

1. 用 Chrome 或 Edge 打开 `admin.html`（双击即可）。
2. 点右上角“打开网站文件夹”，选择这个文件夹（index.html 所在的那一层）。
3. 在左边选“作品 / 随笔 / 网站”，修改内容。每段文字都有中、日、EN 三栏，某种语言留空时，网站会自动显示其他语言的版本。
4. 图片用“选择图片”添加，会自动压缩成 webp 存进 `media/uploads/`。
5. 点“预览”看效果，点“保存”（或 Ctrl/⌘ + S）写回 `content/content.js`。
6. 把文件夹重新上传，网站就更新了。

用 Safari / Firefox 时不能直接打开文件夹：点“保存”会下载新的 `content.js`，用它替换 `content/content.js`；新加的图片也会被下载，请放进 `media/uploads/`。

正文支持简单的 Markdown：`## 小标题`、`**粗体**`、`[链接](https://...)`、`![图片说明](media/xxx.webp)`。同一行写两三张图片，会并排显示。

## 网址

- 首页：`/`
- 全部作品：`/#works`，按类别：`/#works-film`、`/#works-commercial`、`/#works-photo`、`/#works-writing`
- 单个作品：`/#w-作品网址名`，例如 `/#w-kochira`
- 随笔：`/#journal`，单篇：`/#p-随笔网址名`
- 策划：`/#plans`，单份：`/#pl-策划网址名`，例如 `/#pl-rio`
- 工具：`/#tools`
- 指定语言打开：在网址后加 `?lang=zh`、`?lang=ja` 或 `?lang=en`

访客第一次打开时按浏览器语言自动选择，之后记住他们的选择。

## 上线前

- 如果不想公开编辑器，上传时可以不传 `admin.html` 和 `assets/admin.js`（编辑器本身不能改动线上网站，留着也没有风险）。

## 工具页

工具列表写在 `content/content.js` 的 `site.tools` 里（编辑器暂时不能改这一项，直接改文件即可，编辑器保存时会原样保留）。每个工具：

```js
{
  "id": "jlpt",
  "url": "https://jlpt.labagound.cc",
  "mark": "文",                       // 图标里的一个字
  "tag":   { "zh": "日语学习", "ja": "日本語学習", "en": "Japanese" },
  "title": { "zh": "JLPT 每日目标", "ja": "JLPT デイリー学習", "en": "JLPT Daily Practice" },
  "text":  { "zh": "一句话介绍", "ja": "", "en": "" }
}
```

## JLPT 每日目标（jlpt/ 文件夹）

`jlpt/` 是独立的学习页面（N3・N2 语法 297 条 + N2 单词 1439 个），对应 jlpt.labagound.cc，也可以从 labagound.cc/jlpt/ 打开。

- `data.js`：全部语法、例句、辨析组和假名注音
- `words.js`：N2 单词 1439 个，以及易错读音、近义同音、构词法（来自 JLPT_N2_Vocabulary_Kanji.xlsx）。“单词”页只用来翻卡片混眼熟，不计分、不安排复习
- `app.js` / `grammar.css` / `index.html`：页面本体，学习进度存在访客浏览器里
- `sync-worker.js`：多设备同步接口（`/api/sync/<同步码>`）。设置里输入同一个同步码，各设备的语法进度和重点表掌握程度会自动合并；数据存在 Cloudflare Durable Object 里，`wrangler.jsonc` 已配置好，部署时自动创建，不用在后台建数据库。只有 Workers 部署（jlpt.labagound.cc）带这个接口，labagound.cc/jlpt/ 打开时会请求 jlpt.labagound.cc 的接口

让 jlpt.labagound.cc 指向这个文件夹：在 Cloudflare 新建一个 Pages 项目，连接同一个仓库，构建设置里把“根目录（Root directory）”设为 `jlpt`，构建命令留空、输出目录留空，然后在“自定义域”里添加 `jlpt.labagound.cc`。之后这个文件夹有改动，两个站点都会自动更新。

## 策划页

策划案写在 `content/content.js` 的 `plans` 里（编辑器暂时不能改这一项，直接改文件即可，编辑器保存时会原样保留）。每一页是一张图片，放在 `media/plans/网址名/`，命名为 `01.webp`、`02.webp`……，卡片封面是同一文件夹里的 `cover.webp`。

```js
{
  "id": "rio",                         // 网址名：/#pl-rio
  "folder": "media/plans/rio",         // 页面图片所在文件夹
  "cover": "media/plans/rio/cover.webp",
  "pages": 24, "w": 1200, "h": 1733,   // 页数，以及每页图片的宽高（竖版会自动用窄一些的版面）
  "brand": { "zh": "RIO 强爽", "ja": "", "en": "" },
  "field": { "zh": "酒饮", "ja": "", "en": "" },
  "title": { "zh": "强爽不设限，性格AB面", "ja": "", "en": "" },
  "subtitle": { "zh": "RIO 强爽营销策划专案", "ja": "", "en": "" },
  "summary": { "zh": "一段简介", "ja": "", "en": "" },
  "teaser": { "zh": "首页用的短简介（可不填，不填就用 summary）", "ja": "", "en": "" },
  "notes": { "zh": ["第 1 页的说明", "第 2 页的说明"], "ja": [], "en": [] }
}
```

`notes` 是每一页下面显示的一句说明，按页码顺序排列，每种语言一个列表；某种语言没写时会显示其他语言的版本。

列表里的先后顺序就是页面上的顺序。PDF 转图片时请先去掉比赛名称、奖项和真实姓名。

