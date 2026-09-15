import { DEFAULT_COVER, POST_STATUSES } from './content.js';

/* ============================================================================
   lib/drafts.js —— 写作台的本地草稿箱（localStorage）

   职责边界：
     · 文件（src/content/posts/*.md）是「已发布内容」，只读，来自仓库；
     · 这里的草稿是「还没进仓库的稿子」，可随意增删改，刷新不丢。
   导出动作把草稿变成 .md 文件 —— 那一刻它才真正离开浏览器。

   存储键带版本号，将来结构变了可以直接换 v2，不会读到旧格式崩掉。
   ============================================================================ */

const STORAGE_KEY = 'agent-blog:studio:drafts:v1';

/** localStorage 可能被禁用（隐私模式 / 企业策略），所有读写都要兜底 */
function safeGet() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeSet(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

/** 本地 id：时间戳 + 随机后缀，够避免同日多篇撞车 */
function localId() {
  return `draft:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeCover(cover) {
  return {
    from: cover?.from || DEFAULT_COVER.from,
    to: cover?.to || DEFAULT_COVER.to,
    pattern: cover?.pattern || DEFAULT_COVER.pattern,
  };
}

/** 读取草稿箱（按最后保存时间倒序）。任何脏数据都就地丢弃，不抛异常。 */
export function readDrafts() {
  const raw = safeGet();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((d) => d && typeof d === 'object' && d.id)
      .map((d) => ({
        ...d,
        id: String(d.id),
        slug: String(d.slug || ''),
        title: String(d.title || ''),
        dek: String(d.dek || ''),
        tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
        seriesId: d.seriesId ? String(d.seriesId) : null,
        seriesOrder: Number(d.seriesOrder) || 0,
        status: POST_STATUSES.includes(d.status) ? d.status : 'draft',
        publishedAt: d.publishedAt || null,
        updatedAt: d.updatedAt || null,
        featured: d.featured === true,
        cover: normalizeCover(d.cover),
        content: String(d.content || ''),
        origin: d.origin === 'file' ? 'file' : 'new',
        savedAt: Number(d.savedAt) || 0,
      }))
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

/** 写回草稿箱，返回是否成功（失败通常是配额满或隐私模式） */
export function writeDrafts(list) {
  return safeSet(JSON.stringify(list));
}

/** 新建草稿；seed 可覆盖任意字段 */
export function createDraft(seed = {}) {
  const now = Date.now();
  return {
    id: localId(),
    slug: '',
    title: '',
    dek: '',
    tags: [],
    seriesId: null,
    seriesOrder: 0,
    status: 'draft',
    publishedAt: null,
    updatedAt: null,
    featured: false,
    cover: { ...DEFAULT_COVER },
    content: '',
    origin: 'new',
    savedAt: now,
    ...seed,
    cover: normalizeCover(seed.cover),
  };
}

/** 从一篇「文件文章」派生出一份可编辑的本地副本 */
export function draftFromPost(post = {}) {
  return createDraft({
    slug: post.slug || '',
    title: post.title || '',
    dek: post.dek || '',
    tags: Array.isArray(post.tags) ? [...post.tags] : [],
    seriesId: post.seriesId || null,
    seriesOrder: post.seriesOrder || 0,
    status: post.status || 'published',
    publishedAt: post.publishedAt || null,
    updatedAt: post.updatedAt || null,
    featured: post.featured === true,
    cover: normalizeCover(post.cover),
    content: post.content || '',
    // origin = file 表示它源自仓库里的文件，导出时会提示「这会覆盖同名文件」
    origin: 'file',
  });
}

/** 新增或覆盖一篇草稿，返回新的草稿列表 */
export function saveDraft(draft) {
  const list = readDrafts();
  const next = { ...draft, savedAt: Date.now() };
  const idx = list.findIndex((d) => d.id === draft.id);
  if (idx === -1) list.unshift(next);
  else list[idx] = next;
  writeDrafts(list);
  return list.sort((a, b) => b.savedAt - a.savedAt);
}

/** 删除一篇草稿，返回新的草稿列表 */
export function removeDraft(id) {
  const next = readDrafts().filter((d) => d.id !== id);
  writeDrafts(next);
  return next;
}

/** 清空草稿箱（危险操作，UI 上要二次确认） */
export function clearDrafts() {
  writeDrafts([]);
  return [];
}

/** 导出文件名：优先用 slug，没有就退回标题或 id */
export function draftFileName(draft = {}) {
  const base = draft.slug || draft.title || draft.id.replace(/^draft:/, '');
  return `${base}.md`;
}
