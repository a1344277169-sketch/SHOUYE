# labagound 网站

纯静态网站，不需要服务器程序，也不需要构建。把整个文件夹上传到任何静态空间（Cloudflare Pages、Vercel、Netlify、GitHub Pages、或者你现在的空间）即可。

```
index.html          网站本体（首页、作品页、随笔页都在这里，用 #网址 切换）
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
- 指定语言打开：在网址后加 `?lang=zh`、`?lang=ja` 或 `?lang=en`

访客第一次打开时按浏览器语言自动选择，之后记住他们的选择。

## 上线前

- 如果不想公开编辑器，上传时可以不传 `admin.html` 和 `assets/admin.js`（编辑器本身不能改动线上网站，留着也没有风险）。
