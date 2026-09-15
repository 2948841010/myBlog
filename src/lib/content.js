import { parseFrontmatter, slugify } from './frontmatter.js';

/* ============================================================================
   lib/content.js —— 内容层：把 src/content/posts/*.md 变成 Post 对象

   构建时用 Vite 的 import.meta.glob 把所有 .md 原文读进来（eager + raw），
   同步解析出 frontmatter 与正文。所以：
     · 写文章 = 往 src/content/posts/ 放一个 .md 文件；
     · 不需要跑任何脚本，dev 下改文件即刻热更新，build 时自动进产物；
     · 内容天然进 git，有版本历史，也不会被清浏览器缓存清掉。

   命名约定：以下划线开头的文件（如 _template.md）不视为文章，作为模板存在。
   ============================================================================ */

const RAW_FILES = import.meta.glob('../content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** 导出时 frontmatter 的键顺序（写作台用它保证文件整洁） */
export const FRONTMATTER_ORDER = [
  'title',
  'slug',
  'dek',
  'tags',
  'series',
  'seriesOrder',
  'status',
  'publishedAt',
  'updatedAt',
  'featured',
  'coverFrom',
  'coverTo',
  'coverPattern',
];

export const DEFAULT_COVER = { from: '#FF4D2E', to: '#8C2109', pattern: 'grid' };
export const COVER_PATTERNS = ['grid', 'dots', 'lines', 'cross'];
export const POST_STATUSES = ['published', 'draft', 'planned'];

/** 任意写法（数组 / 逗号分隔字符串）→ 规整的字符串数组 */
function toArray(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * frontmatter + 正文 → Post（字段与 mock/db.js 的模板完全一致）
 * @param {Record<string, any>} data frontmatter 键值
 * @param {string} body 正文 markdown
 * @param {string} [fallbackSlug] 文件名兜底
 */
export function normalizePost(data = {}, body = '', fallbackSlug = '') {
  const slug = String(data.slug || fallbackSlug || '').trim();
  const seriesRef = data.series ?? data.seriesId ?? null;
  const status = String(data.status || '').trim();

  return {
    id: `file:${slug}`,
    slug,
    title: String(data.title || slug || '未命名'),
    dek: String(data.dek || data.summary || ''),
    // 这里保留原始引用值（可能是系列 id，也可能是系列 slug），
    // db.js 做兼容查找，作者写哪个都能对上。
    seriesId: seriesRef ? String(seriesRef) : null,
    seriesOrder: Number(data.seriesOrder) || 0,
    tags: toArray(data.tags),
    publishedAt: data.publishedAt ? String(data.publishedAt) : null,
    updatedAt: data.updatedAt ? String(data.updatedAt) : null,
    views: Number(data.views) || 0,
    likes: Number(data.likes) || 0,
    featured: data.featured === true,
    status: POST_STATUSES.includes(status) ? status : 'published',
    cover: {
      from: String(data.coverFrom || DEFAULT_COVER.from),
      to: String(data.coverTo || DEFAULT_COVER.to),
      pattern: String(data.coverPattern || DEFAULT_COVER.pattern),
    },
    content: body,
    source: 'file',
  };
}

/** Post → frontmatter 键值（导出用） */
export function postToFrontmatter(post = {}) {
  return {
    title: post.title || '',
    slug: post.slug || '',
    dek: post.dek || '',
    tags: post.tags || [],
    series: post.seriesId || null,
    seriesOrder: post.seriesOrder || null,
    status: post.status || 'published',
    publishedAt: post.publishedAt || null,
    updatedAt: post.updatedAt || null,
    featured: post.featured === true,
    coverFrom: post.cover?.from || DEFAULT_COVER.from,
    coverTo: post.cover?.to || DEFAULT_COVER.to,
    coverPattern: post.cover?.pattern || DEFAULT_COVER.pattern,
  };
}

/** 从单个 .md 原文构造 Post（写作台的「导入」用它） */
export function postFromMarkdown(raw = '', fallbackSlug = '') {
  const { data, body } = parseFrontmatter(raw);
  const guess = fallbackSlug || (data.title ? slugify(data.title) : '');
  return normalizePost(data, body, guess);
}

/** 读取全部文件文章（按发布日期倒序，无日期的排在最后） */
export function loadFilePosts() {
  return Object.entries(RAW_FILES)
    .map(([path, raw]) => {
      const fileName = path.split('/').pop() || '';
      // 下划线开头 = 模板 / 草稿箱文件，不参与渲染
      if (fileName.startsWith('_')) return null;
      const slugFromFile = fileName.replace(/\.md$/i, '');
      const { data, body } = parseFrontmatter(raw);
      return normalizePost(data, body, slugFromFile);
    })
    .filter(Boolean)
    .sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : -1;
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : -1;
      return tb - ta;
    });
}

/** 内容目录里一共有几个 .md（含模板），供写作台提示用 */
export function contentFileCount() {
  return Object.keys(RAW_FILES).filter((p) => !(p.split('/').pop() || '').startsWith('_')).length;
}
