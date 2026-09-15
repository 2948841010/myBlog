import {
  profile,
  seriesWithStats,
  postsWithMeta,
  tags,
  stats,
  tickerItems,
} from '../mock/db.js';

/* ============================================================================
   api/index.js —— 异步服务层（API stub）
   现有实现全部读取本地 mock，但签名、延迟、返回结构都按真实后端设计。
   接入真实后端时，只需把每个函数体替换为 fetch 调用，形状保持不变。
   每个函数上方标注了预期的 HTTP 方法 + 路径 + 请求/响应形状。
   ============================================================================ */

const delay = (ms = 320) => new Promise((resolve) => setTimeout(resolve, ms));

const published = () => postsWithMeta.filter((p) => p.status === 'published');

/**
 * GET /api/posts?page&pageSize&tag&series&q&sort
 * res: { code, data: Post[], total, page, pageSize, totalPages }
 */
export async function fetchPosts({
  page = 1,
  pageSize = 6,
  tag = '',
  series = '',
  q = '',
  sort = 'latest',
} = {}) {
  await delay(420);

  let list = published();

  if (tag) list = list.filter((p) => p.tags.includes(tag));
  if (series) list = list.filter((p) => p.series?.slug === series);

  if (q.trim()) {
    const kw = q.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(kw) ||
        p.dek.toLowerCase().includes(kw) ||
        p.tags.some((t) => t.toLowerCase().includes(kw)) ||
        p.content.toLowerCase().includes(kw)
    );
  }

  if (sort === 'oldest') {
    list = [...list].sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
  } else if (sort === 'popular') {
    list = [...list].sort((a, b) => b.views - a.views);
  } else {
    list = [...list].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    code: 0,
    data: list.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/**
 * GET /api/posts/:slug
 * res: { code, data: Post & { prev, next, related } }
 * 404 时返回 { code: 404, message }
 */
export async function fetchPost(slug) {
  await delay(460);

  const post = published().find((p) => p.slug === slug);
  if (!post) return { code: 404, message: '文章不存在或尚未发布', data: null };

  const timeline = published().sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );
  const idx = timeline.findIndex((p) => p.slug === slug);

  const related = timeline
    .filter(
      (p) =>
        p.slug !== slug &&
        (p.seriesId === post.seriesId || p.tags.some((t) => post.tags.includes(t)))
    )
    .slice(0, 3);

  return {
    code: 0,
    data: {
      ...post,
      prev: idx > 0 ? timeline[idx - 1] : null, // 更新的一篇
      next: idx >= 0 && idx < timeline.length - 1 ? timeline[idx + 1] : null, // 更早的一篇
      related,
    },
  };
}

/**
 * GET /api/series
 * res: { code, data: Series[] }
 */
export async function fetchSeries() {
  await delay(340);
  return { code: 0, data: seriesWithStats };
}

/**
 * GET /api/series/:slug
 * res: { code, data: Series }
 */
export async function fetchSeriesBySlug(slug) {
  await delay(300);
  const found = seriesWithStats.find((s) => s.slug === slug);
  if (!found) return { code: 404, message: '系列不存在', data: null };
  return { code: 0, data: found };
}

/**
 * GET /api/tags
 * res: { code, data: { name, count }[] }
 */
export async function fetchTags() {
  await delay(200);
  return { code: 0, data: tags };
}

/**
 * GET /api/stats
 * res: { code, data: { postCount, seriesCount, tagCount, totalWords, readers } }
 */
export async function fetchStats() {
  await delay(180);
  return { code: 0, data: stats };
}

/**
 * GET /api/profile
 * res: { code, data: Profile }
 */
export async function fetchProfile() {
  await delay(220);
  return { code: 0, data: profile };
}

/**
 * GET /api/ticker
 * res: { code, data: { label, value }[] }
 */
export async function fetchTicker() {
  await delay(120);
  return { code: 0, data: tickerItems };
}

/**
 * GET /api/search?q=
 * 全局搜索（命令面板用），返回文章 + 系列 + 页面
 * res: { code, data: { type, title, sub, to }[] }
 */
export async function searchAll(q = '') {
  await delay(180);
  const kw = q.trim().toLowerCase();
  if (!kw) {
    return {
      code: 0,
      data: published()
        .slice(0, 6)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .map((p) => ({
          type: 'post',
          title: p.title,
          sub: `${p.series?.title ?? '未归类'} · ${p.readingMinutes} 分钟`,
          to: `/posts/${p.slug}`,
        })),
    };
  }

  const results = [];
  published().forEach((p) => {
    if (
      p.title.toLowerCase().includes(kw) ||
      p.dek.toLowerCase().includes(kw) ||
      p.tags.some((t) => t.toLowerCase().includes(kw))
    ) {
      results.push({
        type: 'post',
        title: p.title,
        sub: `${p.series?.title ?? '未归类'} · ${p.readingMinutes} 分钟`,
        to: `/posts/${p.slug}`,
      });
    }
  });

  seriesWithStats.forEach((s) => {
    if (`${s.title}${s.subtitle}${s.summary}`.toLowerCase().includes(kw)) {
      results.push({
        type: 'series',
        title: s.title,
        sub: `连载 · ${s.publishedCount}/${s.totalCount} 篇`,
        to: `/series#${s.slug}`,
      });
    }
  });

  return { code: 0, data: results.slice(0, 12) };
}

/**
 * POST /api/subscribe
 * req: { email }
 * res: { code, message }
 */
export async function subscribe(email) {
  await delay(680);
  // TODO: replace with fetch('/api/subscribe', { method: 'POST', body: JSON.stringify({ email }) })
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!ok) {
    return { code: 400, message: '邮箱格式不正确，请检查后再试' };
  }
  return { code: 0, message: `订阅成功，更新会发到 ${email}` };
}

/**
 * POST /api/messages
 * req: { name, email, content }
 * res: { code, message }
 */
export async function sendMessage({ name, email, content }) {
  await delay(760);
  // TODO: replace with fetch('/api/messages', { method: 'POST', ... })
  if (!name.trim()) return { code: 400, message: '请填写称呼' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { code: 400, message: '邮箱格式不正确' };
  if (content.trim().length < 8) return { code: 400, message: '内容太短了，至少写 8 个字' };
  return { code: 0, message: '留言已收到，我会在两天内回复' };
}
