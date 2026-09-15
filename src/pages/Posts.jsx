import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  Inbox,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from 'lucide-react';

import { PageHeader } from '../components/ui/Section.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ChipFilter } from '../components/ui/Tag.jsx';
import { Input } from '../components/ui/Form.jsx';
import { EmptyState, PostSkeleton } from '../components/ui/States.jsx';
import { PostCard, PostRow } from '../components/blog/PostCard.jsx';
import { ScrollVelocityText } from '../components/fx/ScrollFx.jsx';
import { TiltWrap } from '../components/fx/CardFx.jsx';
import { useAsync } from '../lib/useAsync.js';
import { useDebounced } from '../lib/hooks.js';
import { fetchPosts, fetchSeries, fetchTags } from '../api/index.js';

/* ============================================================================
   文章归档
   六个筛选维度（q / tag / series / sort / view / page）全部落在 URL 上，
   刷新、前进后退、把链接发给别人，都能还原到同一屏结果。
   ============================================================================ */

const DEFAULTS = { q: '', tag: '', series: '', sort: 'latest', view: 'list', page: '1' };

const PAGE_SIZE = 6;

const SORT_OPTIONS = [
  { key: 'latest', label: '最新', icon: Clock },
  { key: 'oldest', label: '最早', icon: ArrowUpDown },
  { key: 'popular', label: '最热', icon: TrendingUp },
];

const VIEW_OPTIONS = [
  { key: 'list', label: '列表', icon: List },
  { key: 'grid', label: '网格', icon: LayoutGrid },
];

/* 动效节奏：与 lib/motion 的 EASE 保持一致；进出场只动 transform / opacity */
const EASE_OUT = [0.22, 1, 0.36, 1];
/** 结果块（整页翻页 / 骨架 → 结果）入场 */
const RESULT_TRANSITION = { duration: 0.42, ease: EASE_OUT };
/** 单个渲染单元：共享布局 + 入场 / 出场 */
const ITEM_TRANSITION = { duration: 0.34, ease: EASE_OUT };
/** 筛选标签的微交互 */
const TAG_MOTION = { duration: 0.18, ease: EASE_OUT };

/** 数字兜底：接口没给 / 给了非数字时按 fallback 处理，避免 NaN 进页码与计数 */
function safeInt(n, fallback = 0) {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? Math.floor(v) : fallback;
}

/**
 * 页码序列：页数多时用省略号收敛，如 1 … 3 4 5 … 12
 * total = 0（一篇文章都没有）时返回空数组，配合外层的 totalPages > 1 判定，
 * 不会出现「只有一页却带省略号」或「上一页 / 下一页 未禁用」的状态。
 */
function buildPages(current, total) {
  const last = Math.max(0, safeInt(total));
  if (last <= 0) return [];
  if (last === 1) return [1];

  const cur = Math.min(Math.max(1, safeInt(current, 1)), last);
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

  const pages = [1];
  const start = Math.max(2, cur - 1);
  const end = Math.min(last - 1, cur + 1);

  if (start > 2) pages.push('…');
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (end < last - 1) pages.push('…');
  pages.push(last);

  return pages;
}

/** 页面右上角的计数块（命中 / 系列 / 标签） */
function CountBlock({ label, value }) {
  return (
    <span className="stack stack--2" style={{ gap: 'var(--sp-1)' }}>
      <span
        className="mono text-dim"
        style={{ fontSize: 'var(--fs-12)', letterSpacing: '0.16em' }}
      >
        {label}
      </span>
      <span className="mono" style={{ fontSize: 'var(--fs-28)' }}>
        {value}
      </span>
    </span>
  );
}

export default function Posts() {
  const [params, setParams] = useSearchParams();

  /* --------------------------- URL 即状态 --------------------------- */
  const q = params.get('q') ?? DEFAULTS.q;
  const tag = params.get('tag') ?? DEFAULTS.tag;
  const series = params.get('series') ?? DEFAULTS.series;

  const sortParam = params.get('sort') ?? DEFAULTS.sort;
  const viewParam = params.get('view') ?? DEFAULTS.view;

  const sort = SORT_OPTIONS.some((o) => o.key === sortParam) ? sortParam : DEFAULTS.sort;
  const view = VIEW_OPTIONS.some((o) => o.key === viewParam) ? viewParam : DEFAULTS.view;
  const page = Math.max(1, Number.parseInt(params.get('page') ?? DEFAULTS.page, 10) || 1);

  /* --------------------------- 本地输入态 --------------------------- */
  const [search, setSearch] = useState(q);
  const debouncedSearch = useDebounced(search, 260);
  const [reload, setReload] = useState(0);

  // 「URL 中 q 的最新已知值」：写 URL 之前先记账，
  // 这样防抖写入后的 URL 变化不会被误判成外部变化，输入框也就不会被回填覆盖。
  const urlQueryRef = useRef(q);

  const patchParams = useCallback(
    (patch) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([key, value]) => {
          if (value === '' || value === null || value === undefined) next.delete(key);
          else next.set(key, String(value));
        });
        return next;
      });
    },
    [setParams]
  );

  // 输入框 → URL：停止输入 260ms 后写入 q，并重置到第 1 页
  useEffect(() => {
    if (urlQueryRef.current === debouncedSearch) return;
    urlQueryRef.current = debouncedSearch;
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (debouncedSearch) next.set('q', debouncedSearch);
      else next.delete('q');
      next.set('page', DEFAULTS.page);
      return next;
    });
  }, [debouncedSearch, setParams]);

  // URL → 输入框：浏览器前进 / 后退，或点击「清除」时把输入框同步回来
  useEffect(() => {
    if (q === urlQueryRef.current) return;
    urlQueryRef.current = q;
    setSearch(q);
  }, [q]);

  /* ----------------------------- 数据 ----------------------------- */
  const postsState = useAsync(
    () => fetchPosts({ page, pageSize: PAGE_SIZE, tag, series, q, sort }),
    [page, tag, series, q, sort, reload]
  );
  const tagsState = useAsync(() => fetchTags(), []);
  const seriesState = useAsync(() => fetchSeries(), []);

  const list = Array.isArray(postsState.data?.data) ? postsState.data.data : [];
  /* 计数与页码一律兜底成数字：0 / 空数据时不会把 NaN 渲染到页面上 */
  const total = Math.max(0, safeInt(postsState.data?.total));
  const totalPages = Math.max(1, safeInt(postsState.data?.totalPages, 1));
  const currentPage = Math.min(Math.max(1, safeInt(postsState.data?.page, 1)), totalPages);
  const hasResult = Boolean(postsState.data);

  const tagOptions = useMemo(
    () => (Array.isArray(tagsState.data?.data) ? tagsState.data.data : []),
    [tagsState.data]
  );
  const seriesOptions = useMemo(
    () => (Array.isArray(seriesState.data?.data) ? seriesState.data.data : []),
    [seriesState.data]
  );

  const activeSeries = useMemo(
    () => seriesOptions.find((s) => s.slug === series) ?? null,
    [series, seriesOptions]
  );

  /* ----------------------------- 交互 ----------------------------- */
  const resetPageAnd = useCallback(
    (patch) => patchParams({ ...patch, page: DEFAULTS.page }),
    [patchParams]
  );

  const selectTag = useCallback(
    (name) => resetPageAnd({ tag: tag === name ? '' : name }),
    [resetPageAnd, tag]
  );

  const selectSeries = useCallback(
    (slug) => resetPageAnd({ series: series === slug ? '' : slug }),
    [resetPageAnd, series]
  );

  const clearAll = useCallback(() => {
    setSearch('');
    resetPageAnd({ q: '', tag: '', series: '' });
  }, [resetPageAnd]);

  const goPage = useCallback(
    (next) => {
      if (next < 1 || next > totalPages || next === currentPage) return;
      patchParams({ page: String(next) });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [currentPage, patchParams, totalPages]
  );

  const activeFilters = [];
  if (q) {
    activeFilters.push({
      key: 'q',
      label: `关键词：${q}`,
      onClear: () => {
        setSearch('');
        resetPageAnd({ q: '' });
      },
    });
  }
  if (tag) {
    activeFilters.push({
      key: 'tag',
      label: `标签：${tag}`,
      onClear: () => resetPageAnd({ tag: '' }),
    });
  }
  if (series) {
    activeFilters.push({
      key: 'series',
      label: `系列：${activeSeries?.title ?? series}`,
      onClear: () => resetPageAnd({ series: '' }),
    });
  }

  const filterCount = activeFilters.length;
  const pages = buildPages(currentPage, totalPages);

  /* 「真的一篇文章都没有」：没有启用任何筛选，且归档总数为 0。
     要和「筛选后无结果」区分开 —— 前者整块隐藏搜索与筛选工具栏（只剩一个主空态），
     后者必须保留工具栏，让用户能改条件。 */
  const libraryEmpty = hasResult && filterCount === 0 && total === 0;

  /* 工具栏：确认空库就不渲染；首屏还在读且没有任何筛选时也先不渲染，
     避免一个筛不出东西的空工具栏闪一下再消失。 */
  const showToolbar = !libraryEmpty && (!postsState.loading || filterCount > 0);

  const countText = !hasResult
    ? '正在读取本地索引…'
    : libraryEmpty
      ? '索引已就绪 · 还没有任何文章'
      : filterCount
        ? `命中 ${total} 篇 · 已启用 ${filterCount} 个筛选 · 第 ${currentPage} / ${totalPages} 页`
        : `共 ${total} 篇 · ${seriesOptions.length} 个系列 · 第 ${currentPage} / ${totalPages} 页`;

  /* ----------------------------- 渲染 ----------------------------- */
  return (
    <div className="page">
      <PageHeader
        eyebrow="ARCHIVE"
        title="文章归档"
        sub="按发布时间倒序排列的连载全集。可以按标签或系列收敛范围，也可以直接搜正文里的关键词——AI 应用、Agent 内核、MCP、评测与可观测性的踩坑记录都在这里。"
        aside={
          <div className="row" style={{ gap: 'var(--sp-8)' }}>
            <CountBlock label="命中" value={hasResult && !libraryEmpty ? total : '—'} />
            <CountBlock label="系列" value={seriesOptions.length || '—'} />
            <CountBlock label="标签" value={tagOptions.length || '—'} />
          </div>
        }
      >
        <span className="mono text-dim" style={{ fontSize: 'var(--fs-13)' }}>
          {countText}
        </span>
      </PageHeader>

      {/* ---------- 换气带：标签沿滚动速度横向流动（无标签时不渲染） ---------- */}
      {tagOptions.length ? (
        <div style={{ marginTop: 'var(--sp-6)' }}>
          <ScrollVelocityText
            items={tagOptions.map((t) => t.name).slice(0, 10)}
            direction={-1}
            baseVelocity={28}
          />
        </div>
      ) : null}

      <div className="stack stack--6" style={{ marginTop: 'var(--sp-10)' }}>
        {/* ---------- 搜索 + 筛选工具栏 ----------
            这里刻意不做 sticky：筛选区含三行标签/系列/排序，整体高约 250px，
            吸顶会长期占用近三分之一视口。需要吸顶时把下方 div 换成
            className="sticky-toolbar" 即可（样式已在 fx.css 中就绪）。
            一篇文章都没有时整块隐藏：不需要让用户去筛一个空集合。 */}
        {showToolbar ? (
        <div style={{ paddingTop: 'var(--sp-2)' }}>
          <div className="stack stack--3">
            <div className="input-group">
              {/* flex: 1 1 auto —— 窄屏下 .input-group 会变成纵向排列，
                  此时 flex-basis 必须为 auto，否则输入框会被压成 0 高 */}
              <span
                className="grow"
                style={{ flex: '1 1 auto', position: 'relative', display: 'block', minWidth: 0 }}
              >
                <Search
                  size={15}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 'var(--sp-3)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-dim)',
                    pointerEvents: 'none',
                  }}
                />
                <Input
                  type="search"
                  aria-label="搜索文章"
                  placeholder="搜索标题、标签或正文关键词…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 'var(--sp-10)' }}
                />
              </span>
              <Button
                variant="ghost"
                icon={X}
                onClick={clearAll}
                disabled={!filterCount && !search}
              >
                清除
              </Button>
            </div>

            <div className="row row--between row--wrap" style={{ gap: 'var(--sp-3)' }}>
              <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
                输入即筛选（防抖 260ms）· 所有条件都会同步进地址栏，可直接分享
              </span>
              <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
                {`每页 ${PAGE_SIZE} 篇`}
              </span>
            </div>

            <div className="toolbar">
              <div className="row row--wrap" style={{ gap: 'var(--sp-2)', width: '100%' }}>
                <span className="eyebrow" style={{ minWidth: 'var(--sp-12)' }}>
                  标签
                </span>
                <ChipFilter active={!tag} onClick={() => resetPageAnd({ tag: '' })}>
                  全部
                </ChipFilter>
                {tagOptions.map((t) => (
                  <ChipFilter
                    key={t.name}
                    active={tag === t.name}
                    onClick={() => selectTag(t.name)}
                  >
                    {t.name}
                    <span className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.7 }}>
                      {t.count}
                    </span>
                  </ChipFilter>
                ))}
              </div>

              <div className="row row--wrap" style={{ gap: 'var(--sp-2)', width: '100%' }}>
                <span className="eyebrow" style={{ minWidth: 'var(--sp-12)' }}>
                  系列
                </span>
                <ChipFilter active={!series} onClick={() => resetPageAnd({ series: '' })}>
                  全部
                </ChipFilter>
                {seriesOptions.map((s) => (
                  <ChipFilter
                    key={s.slug}
                    active={series === s.slug}
                    onClick={() => selectSeries(s.slug)}
                  >
                    {s.title}
                    <span className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.7 }}>
                      {`${s.publishedCount}/${s.totalCount}`}
                    </span>
                  </ChipFilter>
                ))}
              </div>

              <div className="row row--wrap" style={{ gap: 'var(--sp-2)', width: '100%' }}>
                <span className="eyebrow" style={{ minWidth: 'var(--sp-12)' }}>
                  排序
                </span>
                <div className="seg" role="group" aria-label="排序方式">
                  {SORT_OPTIONS.map((o) => {
                    const Icon = o.icon;
                    const active = sort === o.key;
                    return (
                      <button
                        key={o.key}
                        type="button"
                        className={`seg__btn${active ? ' is-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => resetPageAnd({ sort: o.key })}
                      >
                        {/* 共享布局指示条：在两个选项之间滑动，而不是各自染色 */}
                        {active ? (
                          <motion.span
                            layoutId="seg-ink-sort"
                            className="seg__ink"
                            initial={false}
                          />
                        ) : null}
                        <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
                        {o.label}
                      </button>
                    );
                  })}
                </div>

                <span
                  className="eyebrow"
                  style={{ minWidth: 'var(--sp-12)', marginLeft: 'var(--sp-4)' }}
                >
                  视图
                </span>
                <div className="seg" role="group" aria-label="展示方式">
                  {VIEW_OPTIONS.map((o) => {
                    const Icon = o.icon;
                    const active = view === o.key;
                    return (
                      <button
                        key={o.key}
                        type="button"
                        className={`seg__btn${active ? ' is-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => patchParams({ view: o.key })}
                      >
                        {active ? (
                          <motion.span
                            layoutId="seg-ink-view"
                            className="seg__ink"
                            initial={false}
                          />
                        ) : null}
                        <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ---------- 已启用的筛选（可逐个移除，带轻微悬停 / 按压反馈） ---------- */}
            {filterCount ? (
              <div className="tag-row">
                <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
                  已启用
                </span>
                {activeFilters.map((f) => (
                  <motion.button
                    key={f.key}
                    type="button"
                    className="tag"
                    onClick={f.onClear}
                    aria-label={`移除筛选：${f.label}`}
                    title="移除该筛选"
                    style={{ cursor: 'pointer' }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.94 }}
                    transition={TAG_MOTION}
                  >
                    {f.label}
                    <X size={11} strokeWidth={2} aria-hidden="true" />
                  </motion.button>
                ))}
                <motion.button
                  type="button"
                  className="tag"
                  onClick={clearAll}
                  style={{ cursor: 'pointer' }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  transition={TAG_MOTION}
                >
                  全部清除
                  <RefreshCw size={11} strokeWidth={2} aria-hidden="true" />
                </motion.button>
              </div>
            ) : null}
          </div>
        </div>
        ) : null}

        {/* ---------- 结果区：列表 ↔ 网格共享布局 + 分页入场 ---------- */}
        <div style={{ position: 'relative' }}>
          {postsState.error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={RESULT_TRANSITION}
            >
              <EmptyState
                icon={AlertTriangle}
                title="加载失败"
                desc="读取文章索引时出了点问题。可以先重试；如果一直失败，刷新页面能重置本地缓存的模拟层。"
                action={
                  <Button variant="ghost" icon={RefreshCw} onClick={() => setReload((n) => n + 1)}>
                    重新加载
                  </Button>
                }
              />
            </motion.div>
          ) : postsState.loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={RESULT_TRANSITION}
            >
              <PostSkeleton variant={view === 'grid' ? 'grid' : 'row'} count={PAGE_SIZE} />
            </motion.div>
          ) : libraryEmpty ? (
            /* 全新博客：真的没有任何已发布文章 —— 全页只留这一处主空态，
               不再出现「按标签筛选」「按系列筛选」和一排 0 计的计数块 */
            <motion.div
              key="empty-library"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={RESULT_TRANSITION}
            >
              <EmptyState
                icon={Inbox}
                title="还没有文章"
                desc="这个博客刚刚开张，第一篇还在写。文章发布之后，这里会自动出现列表、标签与系列筛选。"
                action={
                  <Button to="/" icon={Home}>
                    回首页
                  </Button>
                }
              />
            </motion.div>
          ) : list.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={RESULT_TRANSITION}
            >
              <EmptyState
                icon={Inbox}
                title="没有匹配的文章"
                desc={
                  q
                    ? `关键词「${q}」在本站已发布的文章里没有命中。试试更短的词、换成英文术语（如 MCP / trace），或者放宽标签与系列筛选。`
                    : '当前标签与系列组合下没有文章。清掉筛选条件，就能看到全部已发布的篇目。'
                }
                action={
                  <Button variant="ghost" icon={X} onClick={clearAll}>
                    清除全部筛选
                  </Button>
                }
              />
            </motion.div>
          ) : (
            <LayoutGroup>
              {/* 翻页：整块以 key 变化重新入场；换视图：同一容器换类名，做共享布局 */}
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={page}
                  layout
                  className={view === 'grid' ? 'grid grid--auto' : 'stack stack--2'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={RESULT_TRANSITION}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {list.map((p) => (
                      <motion.div
                        key={p.slug}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={ITEM_TRANSITION}
                      >
                        {view === 'grid' ? (
                          <TiltWrap max={5} style={{ height: '100%', display: 'grid' }}>
                            <PostCard post={p} />
                          </TiltWrap>
                        ) : (
                          <PostRow post={p} />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>
            </LayoutGroup>
          )}
        </div>

        {/* ---------- 分页 ----------
            total = 0 时 totalPages 恒为 1，这一块整块不渲染，
            因此不会出现「只有一页还是显示省略号 / 上下页没禁用」的状态。 */}
        {!postsState.loading &&
        !postsState.error &&
        !libraryEmpty &&
        totalPages > 1 &&
        pages.length > 1 ? (
          <nav className="pager" aria-label="分页导航">
            <button
              type="button"
              className="pager__btn"
              onClick={() => goPage(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="上一页"
            >
              <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>

            {pages.map((p, i) =>
              p === '…' ? (
                <span
                  key={`gap-${i}`}
                  className="mono text-dim"
                  style={{ fontSize: 'var(--fs-12)' }}
                  aria-hidden="true"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`pager__btn${p === currentPage ? ' is-active' : ''}`}
                  onClick={() => goPage(p)}
                  aria-current={p === currentPage ? 'page' : undefined}
                  aria-label={`第 ${p} 页`}
                >
                  {p}
                </button>
              )
            )}

            <button
              type="button"
              className="pager__btn"
              onClick={() => goPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="下一页"
            >
              <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
