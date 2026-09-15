# myBlog

zcy 的个人博客 —— 记录 Agent 开发过程中遇到的问题、试过的方案，以及最后留下的那一个。

纯前端项目，没有后端、没有数据库。文章是 `src/content/posts/` 下的 Markdown 文件，构建时读入；连载、作者信息等配置在 `src/mock/db.js`。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | React 19 + Vite 8 |
| 路由 | React Router 7（HashRouter，产物可直接静态托管） |
| 动效 | Framer Motion 13 + 纯 CSS 关键帧 |
| 3D | Three.js（首屏装饰层，懒加载 + 完整降级） |
| 图标 | lucide-react |
| 字体 | Space Grotesk / JetBrains Mono（`@fontsource-variable` 自托管，无 CDN 依赖） |

## 本地运行

```bash
npm install
npm run dev      # 开发服务器：http://localhost:5173
npm run build    # 产物输出到 dist/
npm run preview  # 预览构建产物
```

`dist/` 用的是相对路径 + HashRouter，可以直接双击 `dist/index.html` 打开，也可以托管在任意静态空间。

## 目录结构

```
src/
├─ api/            # 异步服务层（当前读 mock，签名与真实后端一致）
├─ content/posts/  # ★ 文章源文件：一个 .md 一篇，frontmatter + 正文
├─ mock/db.js      # 作者信息、连载系列；文章由 content/ 聚合而来
├─ config/site.js  # 站点名称、描述、导航、社交链接
├─ lib/            # markdown 解析、frontmatter 读写、草稿存储、格式化、hooks
├─ store/          # 主题、轻提示、命令面板等全局状态
├─ components/
│  ├─ layout/      # AppShell / 侧边栏 / 顶栏 / 页脚
│  ├─ ui/          # 按钮、卡片、表单、状态、代码块、终端等基础件
│  ├─ blog/        # 文章卡、系列卡、订阅表单、命令面板
│  ├─ studio/      # 写作台：元数据表单 + 正文编辑器
│  └─ fx/          # 氛围层、文字动效、卡片动效、滚动动效、指针动效、3D
├─ pages/          # 首页 / 文章归档 / 文章详情 / 连载 / 关于 / 写作台 / 404
└─ styles/         # tokens.css（设计令牌）→ app.css（基础）→ fx.css（动效）→ studio.css
```

## 写文章

写作台只在**开发模式**下存在。跑 `npm run dev`，打开 **`#/studio`**。

它没有加进导航栏，从站点首页也点不到，只有手输地址才会进入 —— 别人访问你的博客时看到的仍是原来的页面。

三个动作：

1. **写**：点「新建」，填标题正文。改动自动存进浏览器，刷新不丢。
2. **发布**：点「发布」，markdown 会由本地 dev server 直接写进 `src/content/posts/`，页面随即热更新，你立刻能在站点上看到成品。状态会自动置为「已发布」——否则文件虽然写进去了，也会被状态过滤掉、页面上什么也看不到。
3. **上线**：自己 `git add` / `commit` / `push`，托管平台自动构建，读者就能看到了。

「下载 .md」是不依赖 dev server 的兜底路径（比如你打开的是构建产物）。

### 为什么「发布」要经过 dev server

浏览器没法直接把文件写进项目目录，所以这一请求由 `vite.config.js` 里注册的 `/__studio/publish` 中间件代劳。它带 `apply: 'serve'`，**只存在于开发服务器**：生产构建里既没有这个接口，也没有调用它的代码。

### 线上为什么没有写作台

开关是构建期的。开发模式读 `.env.development`（`VITE_ENABLE_STUDIO=on`），生产构建不读这个文件，于是开关为 false，写作台的路由与代码会在打包时被整体剔除 —— 线上访问 `#/studio` 得到的是 404 页。

想在线上临时使用，在托管平台加环境变量 `VITE_ENABLE_STUDIO=on` 后重新部署即可。但要注意：**线上即使打开了写作台也发布不了**，写入接口只存在于本地 dev server。

### 草稿在哪，会不会丢

写作台的草稿存在浏览器 `localStorage`（键名 `agent-blog:studio:drafts:v1`），**按域名隔离**：`localhost:5173` 和线上域名是两套互不相通的存储。所以换设备、换浏览器、清缓存、换域名都会读不到。

写完及时点「发布」，让文件落进仓库，才算真的保住了。

### 也可以不用写作台

直接复制 `src/content/posts/_template.md` 改名后手写 —— 下划线开头的文件不会被当成文章，可以一直留着当模板。

标签云、全站统计、系列进度条都会自动跟着算，不需要改别的地方。正文支持 Markdown 子集：`##` / `###` 标题、段落、有序与无序列表、围栏代码块、引用、表格、`行内代码`、**粗体**、[链接](https://example.com)。

### frontmatter 字段

| 字段 | 说明 |
| --- | --- |
| `title` | 标题，必填 |
| `slug` | 网址 `/posts/<slug>`；留空则用文件名 |
| `dek` | 摘要，出现在列表页与详情页导语 |
| `tags` | 方括号加逗号，如 `[ReAct, 工具调用]`，中文逗号也识别 |
| `series` | 连载的 id 或 slug，不属于任何连载就留空 |
| `seriesOrder` | 系列内序号，决定阅读顺序 |
| `status` | `published` / `draft` / `planned` |
| `publishedAt` / `updatedAt` | `YYYY-MM-DD` |
| `featured` | `true` 时出现在首页「编辑精选」 |
| `coverFrom` / `coverTo` | 封面渐变的起止色 |
| `coverPattern` | `grid` / `dots` / `lines` / `cross` |

### 草稿存在哪

写作台的草稿存在浏览器 `localStorage`（键名 `agent-blog:studio:drafts:v1`）。这意味着两件事：**换设备或清缓存会丢**，所以写完记得导出；以及**它不会自动出现在站点上** —— 只有导出成文件、进了仓库，读者才看得到。

## 部署

构建产物是纯静态的，任选一种：

- **GitHub Pages**：把 `dist/` 内容推到 `gh-pages` 分支，或在仓库 Settings → Pages 里选择用 Actions 构建。因为用的是相对路径 + HashRouter，部署到 `https://<用户名>.github.io/myBlog/` 这类子路径下不需要额外配置。
- **任意静态托管**：Vercel / Netlify / Cloudflare Pages 直接指向 `npm run build` 与 `dist` 即可。

## 说明

- 项目当前是「空白博客」状态：没有文章、没有系列。各页面都做了对应的空状态处理。
- 线上**不存在写作台**：它只在开发模式构建，生产产物里连它的代码都没有。所以安全性来自「线上没有这个功能」，而不是口令或权限校验。
- `src/config/site.js` 里的社交链接、邮箱、以及 `src/mock/db.js` 里的作者信息都是占位值，记得替换成你自己的。
- 仓库还没有 LICENSE，如果要开源建议补一个。
