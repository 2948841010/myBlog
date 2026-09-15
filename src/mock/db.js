import { estimateReadingMinutes } from '../lib/format.js';
import { loadFilePosts } from '../lib/content.js';

/* ============================================================================
   mock/db.js —— 全站唯一数据源
   页面不得散落硬编码数据，一律通过 src/api 读取本文件。
   数据结构即未来真实后端的返回结构（见 src/api/index.js 的接口注释）。

   文章从哪来：
     文章不再是写死在本文件里的数组，而是 src/content/posts/ 下的 .md 文件，
     由 lib/content.js 在构建时读入（frontmatter 提供元数据，正文是 markdown）。
     加一篇 = 丢一个 .md 文件进那个目录；改一篇 = 改那个文件。
     写作台（#/studio）负责帮你生成格式正确的 .md。

   连载系列：
     仍然在本文件的 seriesList 里声明。文章的 frontmatter 里写 series 字段
     （系列 id 或 slug 都可以），关联关系会自动建立。
   ============================================================================ */

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
/* 来自 src/content/posts/*.md（构建时读入，见 lib/content.js）。
   要写新文章请用 #/studio 写作台生成 .md，而不是改这个文件。 */
export const posts = loadFilePosts();

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
  // frontmatter 里 series 写 id 或 slug 都能对上
  const s =
    seriesList.find((x) => x.id === p.seriesId || x.slug === p.seriesId) || null;
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
   连载系列（可选）—— 还是要写在本文件里，字段模板：

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

   加进 seriesList 之后，文章的 frontmatter 里写 series: core 即可关联
   （写 id `s_core` 也行，两种都能对上）。

   文章本身请去 src/content/posts/ 里写，或打开 #/studio 用写作台生成。
   现成的空模板在 src/content/posts/_template.md，复制改名即可。
   ============================================================================ */
