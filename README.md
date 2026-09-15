# myBlog

zcy 的个人博客 —— 记录 Agent 开发过程中遇到的问题、试过的方案，以及最后留下的那一个。

纯前端项目，没有后端、没有数据库，所有内容目前来自 `src/mock/db.js`（当前是空的，还没开始写）。

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
├─ mock/db.js      # 全站唯一数据源：作者信息 / 系列 / 文章
├─ config/site.js  # 站点名称、描述、导航、社交链接
├─ lib/            # markdown 解析、格式化、hooks、动效配置
├─ store/          # 主题、轻提示、命令面板等全局状态
├─ components/
│  ├─ layout/      # AppShell / 侧边栏 / 顶栏 / 页脚
│  ├─ ui/          # 按钮、卡片、表单、状态、代码块、终端等基础件
│  ├─ blog/        # 文章卡、系列卡、订阅表单、命令面板
│  └─ fx/          # 氛围层、文字动效、卡片动效、滚动动效、指针动效、3D
├─ pages/          # 首页 / 文章归档 / 文章详情 / 连载 / 关于 / 404
└─ styles/         # tokens.css（设计令牌）→ app.css（基础）→ fx.css（动效）
```

## 开始写第一篇文章

1. 打开 `src/mock/db.js`；
2. 把文章对象追加进 `posts` 数组（字段模板在该文件末尾的注释里，复制即用）；
3. 如果要归入某个连载，先在 `seriesList` 里加一条系列，再用 `seriesId` 关联。

标签云、全站统计、系列进度条都会自动跟着算，不需要改别的地方。文章正文支持 Markdown 子集：`##` / `###` 标题、段落、有序与无序列表、围栏代码块、引用、表格、`行内代码`、**粗体**、[链接](https://example.com)。

## 部署

构建产物是纯静态的，任选一种：

- **GitHub Pages**：把 `dist/` 内容推到 `gh-pages` 分支，或在仓库 Settings → Pages 里选择用 Actions 构建。因为用的是相对路径 + HashRouter，部署到 `https://<用户名>.github.io/myBlog/` 这类子路径下不需要额外配置。
- **任意静态托管**：Vercel / Netlify / Cloudflare Pages 直接指向 `npm run build` 与 `dist` 即可。

## 说明

- 项目当前是「空白博客」状态：没有文章、没有系列。各页面都做了对应的空状态处理。
- `src/config/site.js` 里的社交链接、邮箱、以及 `src/mock/db.js` 里的作者信息都是占位值，记得替换成你自己的。
- 仓库还没有 LICENSE，如果要开源建议补一个。
