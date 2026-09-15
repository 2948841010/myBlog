import { estimateReadingMinutes } from '../lib/format.js';

/* ============================================================================
   mock/db.js —— 全站唯一数据源（当前为「全新博客」状态：没有任何文章）
   页面不得散落硬编码数据，一律通过 src/api 读取本文件。
   数据结构即未来真实后端的返回结构（见 src/api/index.js 的接口注释）。

   怎么开始写第一篇：
   1) 往下面的 posts 数组里追加一个对象（字段见文末的示例注释）；
   2) 如果属于某个连载，先在 seriesList 里加一条，再用 seriesId 关联；
   3) tags / stats / 各页面的进度条都会自动跟着算，不需要手改别的地方。
   ============================================================================ */

/** 把多行文本拼成 markdown 字符串（避免模板字符串里反引号的转义噪音） */
const C = (...lines) => lines.join('\n');

/* ------------------------------ 作者信息 ------------------------------ */
/* 注意：以下都是占位值，请按自己的情况替换 */
export const profile = {
  id: 'u_1',
  name: 'zcy',
  handle: '@zcy',
  role: 'Agent 开发者',
  location: '',
  email: 'hi@zcy.dev',
  since: '',
  bio: '博客刚开张。这里会陆续记录我在 Agent 开发里遇到的问题、试过的方案，以及最后留下的那一个。',
  now: [],
  stack: [],
  timeline: [],
};

/* ------------------------------ 连载系列 ------------------------------ */
/* 还没有开始写，所以这里是空的。加了系列之后，首页「正在连载」与 /series 会自动出现内容。 */
export const seriesList = [];

/* ------------------------------ 文章 ------------------------------ */
/* 目前为空。追加对象时请保持字段完整，否则页面上的部分信息会缺省。 */
export const posts = [];

/* ------------------------------ 派生数据（不需要手改） ------------------------------ */

/** 标签云：从 posts 聚合，带出现次数 */
export const tags = (() => {
  const map = new Map();
  posts.forEach((p) => {
    if (p.status !== 'published') return;
    p.tags.forEach((t) => map.set(t, (map.get(t) || 0) + 1));
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
})();

/** 每篇文章补齐派生字段：阅读时长、系列信息 */
export const postsWithMeta = posts.map((p) => {
  const s = seriesList.find((x) => x.id === p.seriesId) || null;
  return {
    ...p,
    readingMinutes: p.content ? estimateReadingMinutes(p.content) : 0,
    words: p.content ? p.content.length : 0,
    series: s,
  };
});

/** 系列补齐统计 */
export const seriesWithStats = seriesList.map((s) => {
  const inSeries = postsWithMeta
    .filter((p) => p.seriesId === s.id)
    .sort((a, b) => a.seriesOrder - b.seriesOrder);
  const published = inSeries.filter((p) => p.status === 'published');
  return {
    ...s,
    posts: inSeries,
    publishedCount: published.length,
    plannedCount: inSeries.length - published.length,
    totalCount: inSeries.length,
    latest: published.length ? published[published.length - 1].publishedAt : null,
  };
});

/** 全站统计 */
export const stats = {
  postCount: postsWithMeta.filter((p) => p.status === 'published').length,
  seriesCount: seriesList.length,
  tagCount: tags.length,
  totalWords: postsWithMeta.reduce((sum, p) => sum + p.words, 0),
  readers: postsWithMeta.reduce((sum, p) => sum + p.views, 0),
};

/** 首页跑马灯条目（为空时首页会退回内置的短词兜底） */
export const tickerItems = [];

/* ============================================================================
   追加文章时的字段模板（复制到上面的 posts 数组里即可）：

   1) 系列（可选）—— 先加进 seriesList：
   {
     id: 's_core',
     slug: 'core',                       // 用于 /series#core 锚点
     title: 'Agent 内核手记',
     subtitle: '循环 · 工具 · 上下文',    // 会被渲染成大写小标签
     summary: '一句话说明这条线在写什么。',
     icon: 'cpu',                        // cpu | network | gauge | rocket
     accent: 'accent',                   // accent | teal
     status: 'ongoing',                  // ongoing | planned | done
     startedAt: '2026-09-15',
   }

   2) 文章：
   {
     id: 'p_001',
     slug: 'my-first-post',              // URL: /posts/my-first-post
     title: '标题',
     dek: '一两句话的摘要，会出现在列表与详情页导语。',
     seriesId: 's_core',                 // 不属于任何系列就写 null
     seriesOrder: 1,                     // 系列内序号
     tags: ['ReAct', '基础'],
     publishedAt: '2026-09-20',          // 未发布写 null
     updatedAt: '2026-09-20',
     views: 0,
     likes: 0,
     featured: false,                    // true 会出现在首页「编辑精选」
     status: 'published',                // published | draft | planned
     cover: { from: '#FF4D2E', to: '#8C2109', pattern: 'grid' },  // grid|dots|lines|cross
     content: C(
       '## 小标题',
       '',
       '正文段落。支持 h2/h3、列表、``` 代码块、引用、表格、**粗体**、`行内代码`。',
     ),
   }
   ============================================================================ */
