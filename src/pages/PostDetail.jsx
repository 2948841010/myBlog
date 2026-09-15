import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookMarked,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Eye,
  Hash,
  Heart,
  Inbox,
  Layers,
  List,
  RefreshCw,
  Share2,
  Sparkles,
} from 'lucide-react';

import { SectionHeading } from '../components/ui/Section.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Tag } from '../components/ui/Tag.jsx';
import { EmptyState, Skeleton } from '../components/ui/States.jsx';
import { Reveal } from '../components/ui/Motion.jsx';
import { CodeBlock } from '../components/ui/CodeBlock.jsx';
import { CoverArt, PostCard } from '../components/blog/PostCard.jsx';
import { TextReveal } from '../components/fx/TextFx.jsx';
import { ScrollRail, TracingBeam } from '../components/fx/ScrollFx.jsx';
import { ShineBorder, TiltWrap } from '../components/fx/CardFx.jsx';
import { Markdown, extractHeadings } from '../lib/markdown.jsx';
import { useActiveHeading, useLocalStorage } from '../lib/hooks.js';
import { useAsync } from '../lib/useAsync.js';
import { formatDate, formatNumber, fromNow, pad2 } from '../lib/format.js';
import { useToast } from '../store/index.jsx';
import { fetchPost, fetchSeries } from '../api/index.js';

/* ============================================================================
   文章详情
   正文由 lib/markdown 渲染（h2/h3 自带 sec-N 锚点，与 extractHeadings 一致），
   目录跳转走 scrollIntoView —— 项目是 HashRouter，锚点绝不能再用 #hash。
   ============================================================================ */

const FX_EASE = [0.22, 1, 0.36, 1];
/** 目录项 hover / tap 的轻微位移（只动 transform） */
const TOC_MOTION = { duration: 0.2, ease: FX_EASE };

/** 数字兜底：字段缺失 / 非数字时按 0 处理，避免把 NaN 渲染成「NaN 次浏览」 */
function safeCount(n) {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

/** 百分比：分母为 0（系列里还没有篇目）时按 0 处理，绝不产出 NaN% */
function percentOf(part, whole) {
  const p = safeCount(part);
  const w = safeCount(whole);
  if (w <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((p / w) * 100)));
}

export default function PostDetail() {
  const { slug } = useParams();
  const { push } = useToast();

  const [reload, setReload] = useState(0);
  const [copied, setCopied] = useState(false);

  const postState = useAsync(() => fetchPost(slug), [slug, reload]);
  const seriesState = useAsync(() => fetchSeries(), []);

  const res = postState.data;
  const post = res?.data ?? null;
  /* 空博客时任何 slug 都会落到这里：不把 undefined 拼进句子里 */
  const slugText = slug ? `「${slug}」` : '这个地址';
  const notFound = Boolean(res) && (res.code === 404 || post === null);
  const content = post?.content ?? '';

  const headings = useMemo(() => extractHeadings(content), [content]);
  const headingIds = useMemo(() => headings.map((h) => h.id), [headings]);
  const activeId = useActiveHeading(headingIds, 120);

  // 右侧章节刻度只收 h2；少于 2 节时没有导航价值，直接不渲染
  const railItems = useMemo(
    () => headings.filter((h) => h.level === 2).map((h) => ({ id: h.id, label: h.text })),
    [headings]
  );

  const seriesList = useMemo(() => seriesState.data?.data ?? [], [seriesState.data]);
  const seriesInfo = useMemo(() => {
    if (!post?.series) return null;
    return seriesList.find((s) => s.slug === post.series.slug) ?? null;
  }, [post, seriesList]);

  const seriesPosts = useMemo(
    () =>
      seriesInfo
        ? (Array.isArray(seriesInfo.posts) ? seriesInfo.posts : []).filter(
            (p) => p.status === 'published'
          )
        : [],
    [seriesInfo]
  );
  /* 分母为 0 时 percent 恒为 0：进度条与「x/y 篇」只在系列里真有篇目时才渲染 */
  const seriesPublished = safeCount(seriesInfo?.publishedCount);
  const seriesTotal = safeCount(seriesInfo?.totalCount);
  const hasSeriesProgress = seriesTotal > 0;
  const seriesPercent = percentOf(seriesPublished, seriesTotal);

  const [likedSlugs, setLikedSlugs] = useLocalStorage('agent-blog:likes', []);
  const likedList = Array.isArray(likedSlugs) ? likedSlugs : [];
  const liked = Boolean(post) && likedList.includes(post.slug);

  // 换一篇文章时回到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  const jumpTo = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const toggleLike = useCallback(() => {
    if (!post) return;
    const has = likedList.includes(post.slug);
    setLikedSlugs(
      has ? likedList.filter((s) => s !== post.slug) : [...likedList, post.slug]
    );
    push({
      variant: 'success',
      title: has ? '已取消点赞' : '已点赞',
      desc: has ? '已从本地记录里移除。' : '记录在本地，不会上传任何数据。',
    });
  }, [likedList, post, push, setLikedSlugs]);

  const share = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      push({ variant: 'success', title: '链接已复制', desc: url });
    } catch {
      push({
        variant: 'danger',
        title: '复制失败',
        desc: '当前浏览器不允许脚本写入剪贴板，请手动复制地址栏链接。',
      });
    }
  }, [push]);

  const toTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /* 顺序刻意如此：先 loading、再 error、最后才判定 404 ——
     加载途中不会闪出「没有这篇文章」，接口报错也不会被误判成 404。 */

  /* ----------------------------- 加载态 ----------------------------- */
  if (postState.loading) {
    return (
      <div className="page">
        <div className="stack stack--6" style={{ maxWidth: 'var(--measure)' }}>
          <Skeleton w="26%" h="var(--fs-12)" />
          <Skeleton w="94%" h="var(--fs-38)" />
          <Skeleton w="62%" h="var(--fs-38)" />
          <Skeleton w="100%" h="var(--fs-16)" />
          <Skeleton w="78%" h="var(--fs-16)" />
          <Skeleton w="100%" h="var(--sp-24)" radius="var(--r-sm)" />
          <Skeleton w="100%" h="var(--fs-16)" />
          <Skeleton w="92%" h="var(--fs-16)" />
          <Skeleton w="70%" h="var(--fs-16)" />
        </div>
      </div>
    );
  }

  /* ----------------------------- 异常态 ----------------------------- */
  if (postState.error) {
    return (
      <div className="page page--narrow">
        <EmptyState
          icon={AlertTriangle}
          title="加载失败"
          desc="读取这篇文章时出了点问题，可能是本地模拟层被中断。重试一次，或者先回归档页继续读别的篇目。"
          action={
            <Button variant="ghost" icon={RefreshCw} onClick={() => setReload((n) => n + 1)}>
              重新加载
            </Button>
          }
        />
      </div>
    );
  }

  /* --------------------- 没有这篇文章（404 / 未发布） --------------------- */
  if (notFound) {
    return (
      <div className="page page--narrow">
        <EmptyState
          icon={Inbox}
          title="还没有这篇文章"
          desc={`这个博客刚刚开张，还没有发布过任何文章，所以 ${slugText} 暂时没有内容可以读。等第一篇写完之后，归档页和这里都会正常显示；如果是从别处点进来的链接，也可能是地址写错了。`}
          action={
            <div className="btn-row">
              <Button to="/posts" icon={List}>
                浏览文章
              </Button>
              <Button variant="ghost" to="/">
                回首页
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const related = Array.isArray(post.related) ? post.related : [];
  /* 点赞数兜底：post.likes 缺失时不会出现「NaN」 */
  const likeCount = safeCount(post.likes) + (liked ? 1 : 0);

  /* ----------------------------- 正文态 ----------------------------- */
  return (
    <div className="page">
      {/* 右侧章节刻度：随阅读位置高亮，点击平滑跳转（HashRouter 下不用 #hash） */}
      {railItems.length >= 2 ? (
        <ScrollRail items={railItems} activeId={activeId} />
      ) : null}

      <article className="stack stack--8">
        {/* ---------- 头部 ---------- */}
        <header className="stack stack--5">
          <div className="eyebrow eyebrow--accent">
            {post.series ? (
              <>
                <BookMarked size={12} strokeWidth={1.75} aria-hidden="true" />
                {`${post.series.title} · 序 ${pad2(safeCount(post.seriesOrder))}`}
              </>
            ) : (
              `随笔 · ${formatDate(post.publishedAt)}`
            )}
          </div>

          {/* 标题逐字揭示 */}
          <div style={{ maxWidth: 'var(--measure)' }}>
            <TextReveal as="h1" className="display-2" text={post.title} step={0.026} />
          </div>

          {/* 导语：生成式入场（原地由模糊散开），正文不做逐字动画 */}
          <TextReveal
            as="p"
            className="lede"
            text={post.dek}
            variant="generate"
            step={0.014}
          />

          <div className="meta-row">
            <span className="meta-row__item">
              <CalendarDays size={12} strokeWidth={1.75} aria-hidden="true" />
              {`发布于 ${formatDate(post.publishedAt)}`}
            </span>
            <span className="meta-row__item">
              <RefreshCw size={12} strokeWidth={1.75} aria-hidden="true" />
              {post.updatedAt
                ? `更新于 ${formatDate(post.updatedAt)}（${fromNow(post.updatedAt)}）`
                : '首次发布后未修订'}
            </span>
            <span className="meta-row__item">
              <Clock size={12} strokeWidth={1.75} aria-hidden="true" />
              {`约 ${safeCount(post.readingMinutes)} 分钟`}
            </span>
            <span className="meta-row__item">
              <Eye size={12} strokeWidth={1.75} aria-hidden="true" />
              {`${formatNumber(safeCount(post.views))} 次浏览`}
            </span>
            <span className="meta-row__item">
              <Hash size={12} strokeWidth={1.75} aria-hidden="true" />
              {`${formatNumber(safeCount(post.words))} 字`}
            </span>
          </div>

          {post.tags?.length ? (
            <div className="tag-row">
              {post.tags.map((t) => (
                <Tag key={t} size="sm" to={`/posts?tag=${encodeURIComponent(t)}`} icon={Hash}>
                  {t}
                </Tag>
              ))}
            </div>
          ) : null}

          {post.cover ? <CoverArt cover={post.cover} className="cover-art--wide" /> : null}
        </header>

        {/* ---------- 正文 + 侧栏 ---------- */}
        {/* alignItems: stretch —— 让右栏与正文等高，sticky 目录才有可滚动区间 */}
        <div className="article-grid" style={{ alignItems: 'stretch' }}>
          {/* 阅读光束：沿左缘随滚动进度生长；左侧留出内边距，文字不压光束 */}
          <TracingBeam style={{ paddingLeft: 'var(--sp-6)' }}>
            <Markdown content={content} codeComponent={CodeBlock} />

            {/* 点赞 / 分享 / 回到顶部 */}
            <div className="action-row">
              <motion.span
                style={{ display: 'inline-flex' }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.18, ease: FX_EASE }}
              >
                <Button
                  variant={liked ? 'primary' : 'ghost'}
                  island
                  icon={Heart}
                  iconRight={liked ? Check : Sparkles}
                  onClick={toggleLike}
                  aria-pressed={liked}
                >
                  {liked
                    ? `已赞 · ${formatNumber(likeCount)}`
                    : `点赞 · ${formatNumber(likeCount)}`}
                </Button>
              </motion.span>

              <Button
                variant="ghost"
                island
                icon={copied ? Check : Share2}
                iconRight={Copy}
                onClick={share}
              >
                {copied ? '已复制' : '复制链接'}
              </Button>

              <span className="grow" />

              <Button variant="quiet" island iconRight={ArrowUpRight} onClick={toTop}>
                回到顶部
              </Button>
            </div>
          </TracingBeam>

          <aside className="article-aside stack stack--6">
            {headings.length ? (
              <nav className="toc" aria-label="文章目录">
                <div className="toc__title">目录 · {headings.length} 节</div>
                {headings.map((h) => (
                  <motion.button
                    key={h.id}
                    type="button"
                    className={`toc__link${h.level === 3 ? ' is-level-3' : ''}${
                      activeId === h.id ? ' is-active' : ''
                    }`}
                    onClick={() => jumpTo(h.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      borderTop: 0,
                      borderRight: 0,
                      borderBottom: 0,
                      cursor: 'pointer',
                    }}
                    whileHover={{ x: 3 }}
                    whileTap={{ x: 1 }}
                    transition={TOC_MOTION}
                  >
                    {h.text}
                  </motion.button>
                ))}
              </nav>
            ) : null}

            {/* 全页唯一的 ShineBorder：系列进度面板 */}
            {seriesInfo ? (
              <ShineBorder>
                <div className="panel panel--soft stack stack--3">
                  <div className="eyebrow">系列进度</div>
                  <span className="row" style={{ gap: 'var(--sp-2)' }}>
                    <Layers size={14} strokeWidth={1.75} aria-hidden="true" />
                    <span style={{ fontSize: 'var(--fs-14)' }}>{seriesInfo.title}</span>
                  </span>
                  <span className="progress-rail">
                    <span
                      className="progress-rail__fill"
                      style={{ width: `${seriesPercent}%` }}
                    />
                  </span>
                  <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
                    {`已发布 ${seriesInfo.publishedCount}/${seriesInfo.totalCount} 篇 · ${seriesPercent}%`}
                  </span>
                  <span className="row">
                    <Link
                      className="link-sweep"
                      to={`/posts?series=${seriesInfo.slug}`}
                      style={{ fontSize: 'var(--fs-13)' }}
                    >
                      <List size={13} strokeWidth={1.75} aria-hidden="true" />
                      看该系列全部篇目
                    </Link>
                  </span>
                </div>
              </ShineBorder>
            ) : null}
          </aside>
        </div>

        {/* ---------- 系列内导航 ---------- */}
        {seriesInfo && seriesPosts.length ? (
          <section className="panel stack stack--5">
            <div className="row row--between row--wrap" style={{ gap: 'var(--sp-5)' }}>
              <div className="stack stack--2">
                <span className="eyebrow eyebrow--accent">系列导航</span>
                <h2 className="display-3">{seriesInfo.title}</h2>
                <span className="text-sub" style={{ fontSize: 'var(--fs-14)' }}>
                  {seriesInfo.subtitle}
                </span>
              </div>

              <div className="stack stack--2" style={{ minWidth: 'var(--sp-24)' }}>
                <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
                  {`${seriesInfo.publishedCount} / ${seriesInfo.totalCount} 篇已发布 · ${seriesPercent}%`}
                </span>
                <span className="progress-rail">
                  <span className="progress-rail__fill" style={{ width: `${seriesPercent}%` }} />
                </span>
              </div>
            </div>

            <ul className="stack stack--2" style={{ listStyle: 'none' }}>
              {seriesPosts.map((p) => {
                const current = p.slug === slug;
                return (
                  <li
                    key={p.id}
                    className="row"
                    style={{ gap: 'var(--sp-3)' }}
                  >
                    <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
                      {pad2(safeCount(p.seriesOrder))}
                    </span>
                    {current ? (
                      <span
                        className="text-accent row"
                        style={{ gap: 'var(--sp-2)', fontSize: 'var(--fs-14)', fontWeight: 500 }}
                      >
                        {p.title}
                        <Tag size="sm" tone="accent">
                          当前
                        </Tag>
                      </span>
                    ) : (
                      <Link
                        className="link-sweep"
                        to={`/posts/${p.slug}`}
                        style={{ fontSize: 'var(--fs-14)' }}
                      >
                        {p.title}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* ---------- 上下篇 ---------- */}
        {post.prev || post.next ? (
          <nav className="pager-nav" aria-label="上一篇 / 下一篇">
            {post.prev ? (
              <Link className="pager-nav__item" to={`/posts/${post.prev.slug}`}>
                <span
                  className="row"
                  style={{ gap: 'var(--sp-2)', fontSize: 'var(--fs-12)' }}
                >
                  <ArrowLeft size={13} strokeWidth={1.75} aria-hidden="true" />
                  <span className="mono text-dim">更新的一篇</span>
                </span>
                <span style={{ fontSize: 'var(--fs-16)', fontWeight: 500 }}>
                  {post.prev.title}
                </span>
                <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
                  {formatDate(post.prev.publishedAt)}
                </span>
              </Link>
            ) : null}

            {post.next ? (
              <Link
                className="pager-nav__item pager-nav__item--right"
                to={`/posts/${post.next.slug}`}
                style={post.prev ? undefined : { gridColumn: '2' }}
              >
                <span
                  className="row"
                  style={{ gap: 'var(--sp-2)', fontSize: 'var(--fs-12)' }}
                >
                  <span className="mono text-dim">更早的一篇</span>
                  <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span style={{ fontSize: 'var(--fs-16)', fontWeight: 500 }}>
                  {post.next.title}
                </span>
                <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
                  {formatDate(post.next.publishedAt)}
                </span>
              </Link>
            ) : null}
          </nav>
        ) : null}

        {/* ---------- 相关阅读 ---------- */}
        {related.length ? (
          <section>
            <SectionHeading
              eyebrow="继续阅读"
              title="相关阅读"
              sub="同系列，或者标签重叠度最高的几篇。"
            />
            <div className="grid grid--auto">
              {related.slice(0, 3).map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i * 0.04, 0.3)} style={{ height: '100%' }}>
                  <TiltWrap max={5} style={{ height: '100%', display: 'grid' }}>
                    <PostCard post={p} />
                  </TiltWrap>
                </Reveal>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </div>
  );
}
