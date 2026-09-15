import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Clock,
  Hash,
  Inbox,
  Layers,
  Library,
  List,
  Mail,
} from 'lucide-react';

import { PageHeader, SectionHeading } from '../components/ui/Section.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Tag } from '../components/ui/Tag.jsx';
import { EmptyState, Skeleton } from '../components/ui/States.jsx';
import { Reveal } from '../components/ui/Motion.jsx';
import { StatCounter } from '../components/ui/Stat.jsx';
import { SeriesCard } from '../components/blog/SeriesCard.jsx';
import { ShineBorder, TiltWrap } from '../components/fx/CardFx.jsx';
import { ScrollVelocityText, StickyScrollStory } from '../components/fx/ScrollFx.jsx';
import { NumberTicker, TextReveal } from '../components/fx/TextFx.jsx';
import { useAsync } from '../lib/useAsync.js';
import { fetchSeries, fetchStats } from '../api/index.js';
import { compactNumber, formatDate, pad2 } from '../lib/format.js';
import { seriesIcon } from '../lib/icons.js';

const CARD_SKELETONS = [0, 1, 2, 3];
const STAT_SKELETONS = [0, 1, 2, 3];
const LINE_SKELETONS = [0, 1, 2, 3, 4];

/** 篇数兜底：接口没给 / 给了非数字时按 0 处理，避免 NaN 被当成篇数渲染 */
function safeCount(n) {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

/** 百分比：分母为 0（还没有任何篇目）时按 0 处理，绝不产出 NaN / Infinity */
function percentOf(part, whole) {
  const p = safeCount(part);
  const w = safeCount(whole);
  if (w <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((p / w) * 100)));
}

/** 系列卡片的加载占位（结构与 SeriesCard 对齐，避免跳版） */
function SeriesCardSkeleton() {
  return (
    <div className="panel stack stack--5">
      <Skeleton w={44} h={44} radius="var(--r-sm)" />
      <Skeleton w="54%" h={22} />
      <Skeleton w="100%" h={13} />
      <Skeleton w="82%" h={13} />
      <Skeleton w="100%" h={6} radius="var(--r-pill)" />
    </div>
  );
}

/**
 * sticky 滚动叙事里每个系列的分镜内容。
 * 只做静态排版（不含任何滚动动效组件），滚动动效由外层 StickyScrollStory 统一驱动，
 * 避免在分镜里再嵌一层 useScroll 造成重复监听。
 */
function SeriesStoryPanel({ series }) {
  const Icon = seriesIcon(series.icon);
  const tone = series.accent === 'teal' ? 'teal' : 'accent';
  const posts = Array.isArray(series.posts) ? series.posts : [];
  const published = safeCount(series.publishedCount);
  const total = safeCount(series.totalCount);
  const planned = safeCount(
    series.plannedCount ?? Math.max(0, total - published)
  );
  /* 分母为 0 时 percent 恒为 0；进度条与「x/y 篇」只在真有篇目时才渲染 */
  const percent = percentOf(published, total);
  const hasProgress = total > 0;

  return (
    <div className="panel stack stack--5">
      <div
        className="row row--between row--wrap"
        style={{ gap: 'var(--sp-4)', alignItems: 'center' }}
      >
        <div className="row row--wrap" style={{ gap: 'var(--sp-3)', alignItems: 'center' }}>
          <span className={`series-slab__icon${tone === 'teal' ? ' series-slab__icon--teal' : ''}`}>
            <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="stack stack--2">
            <span className="display-3">{series.title}</span>
            <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
              {series.subtitle}
            </span>
          </span>
        </div>
        <Tag size="sm" tone={tone}>
          {hasProgress ? `${published}/${total} 篇` : '尚未排篇'}
        </Tag>
      </div>

      <p className="text-sub" style={{ fontSize: 'var(--fs-14)', maxWidth: 'var(--measure)' }}>
        {series.summary}
      </p>

      <div className="stack stack--2">
        {hasProgress ? (
          <>
            <span className="progress-rail">
              <span className="progress-rail__fill" style={{ width: `${percent}%` }} />
            </span>
            <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
              已发布 {published} 篇 · 计划中 {planned} 篇
              {series.latest ? ` · 最近更新 ${formatDate(series.latest)}` : ''}
            </span>
          </>
        ) : (
          <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
            这条线还没有排进任何篇目，进度会在第一篇建档后开始计算
          </span>
        )}
      </div>

      <div className="divider" />

      {posts.length ? (
        <ul className="stack stack--3" style={{ listStyle: 'none' }}>
          {posts.map((p) => {
            const isPublished = p.status === 'published';
            return (
              <li key={p.id ?? p.slug} className="row row--wrap" style={{ gap: 'var(--sp-3)' }}>
                <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
                  {pad2(p.seriesOrder)}
                </span>
                {isPublished ? (
                  <>
                    <Link
                      className="link-sweep"
                      style={{ fontSize: 'var(--fs-14)' }}
                      to={`/posts/${p.slug}`}
                    >
                      {p.title}
                    </Link>
                    <Tag size="sm" icon={Clock}>
                      {p.readingMinutes} 分钟
                    </Tag>
                  </>
                ) : (
                  <>
                    <span className="text-dim" style={{ fontSize: 'var(--fs-14)' }}>
                      {p.title}
                    </span>
                    <span className="tag tag--sm">计划</span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sub" style={{ fontSize: 'var(--fs-14)' }}>
          篇目还在整理，发布后这里会按顺序补齐。
        </p>
      )}
    </div>
  );
}

/**
 * 连载路线图
 * 数据来源：fetchSeries()（系列 + 篇目，含 status='planned' 的未发布项）
 *          fetchStats()（全站统计，用于总览面板）
 * 锚点：每个系列只保留一处 <div id={slug}>，挂在 sticky 叙事的分镜外层，
 *      供 /series#core 这类跳转定位（AppShell 的 RouteScroller 会重试）。
 */
export default function Series() {
  const {
    data: seriesRes,
    loading: seriesLoading,
    error: seriesError,
  } = useAsync(() => fetchSeries(), []);
  const {
    data: statsRes,
    loading: statsLoading,
    error: statsError,
  } = useAsync(() => fetchStats(), []);

  const seriesList = Array.isArray(seriesRes?.data) ? seriesRes.data : [];
  const stats = statsRes?.data ?? null;
  const loading = seriesLoading || statsLoading;
  const hasError = Boolean(seriesError || statsError);

  /* 全新博客：接口已经返回、也确实没有任何系列 —— 这时只留一处朴素空态，
     不渲染按篇数算出来的 0% / 「0/0 篇」/ 空进度条 */
  const isEmptyLibrary = !loading && !hasError && seriesList.length === 0;

  /* 总览：所有系列的已发布 / 总篇数聚合 */
  const totals = seriesList.reduce(
    (acc, s) => {
      acc.published += safeCount(s.publishedCount);
      acc.total += safeCount(s.totalCount);
      return acc;
    },
    { published: 0, total: 0 }
  );
  const plannedCount = Math.max(0, totals.total - totals.published);
  /* 分母为 0 时按 0：不把 NaN / Infinity 交给 NumberTicker 与进度条 */
  const hasProgress = totals.total > 0;
  const percent = percentOf(totals.published, totals.total);

  /* 阅读顺序：已发布按时间倒序在前，计划中的按系列内顺序排在后面 */
  const allPosts = seriesList.flatMap((s) => (Array.isArray(s.posts) ? s.posts : []));
  const ordered = [
    ...allPosts
      .filter((p) => p.status === 'published')
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
    ...allPosts
      .filter((p) => p.status !== 'published')
      .sort((a, b) => (a.seriesOrder || 0) - (b.seriesOrder || 0)),
  ];
  const totalMinutes = allPosts
    .filter((p) => p.status === 'published')
    .reduce((sum, p) => sum + safeCount(p.readingMinutes), 0);

  /* sticky 叙事：4 个系列 → 4 个 step，id 即系列 slug（全页唯一锚点） */
  const storySteps = seriesList.map((s) => ({
    id: s.slug,
    title: s.title,
    desc: s.subtitle,
    content: (
      <div id={s.slug} style={{ scrollMarginTop: 'var(--sp-20)' }}>
        <SeriesStoryPanel series={s} />
      </div>
    ),
  }));

  /* 页内滚动：HashRouter 下不用 <a href="#x">，一律 scrollIntoView */
  const jumpTo = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="page">
      <PageHeader
        eyebrow="SERIES"
        title={<TextReveal as="span" className="display-2" text="连载 *路线图*" />}
        sub="按主题分成几条连载线，每条线按顺序读；未发布的条目会提前挂在这里，方便你看清整条线还差哪几块。"
      >
        {seriesList.length ? (
          <div className="row row--wrap" style={{ gap: 'var(--sp-2)' }}>
            {seriesList.map((s) => {
              const Icon = seriesIcon(s.icon);
              return (
                <Button
                  key={s.slug}
                  variant="quiet"
                  size="sm"
                  icon={Icon}
                  onClick={() => jumpTo(s.slug)}
                >
                  {s.title}
                </Button>
              );
            })}
          </div>
        ) : null}
      </PageHeader>

      {hasError ? (
        <Reveal className="section">
          <EmptyState
            icon={AlertTriangle}
            title="连载数据没能加载出来"
            desc="接口这次没有返回内容，可以刷新重试，或者先去文章列表按标签翻。"
            action={
              <Button variant="ghost" to="/posts" icon={Library}>
                去看已发布的文章
              </Button>
            }
          />
        </Reveal>
      ) : isEmptyLibrary ? (
        /* 全新博客：没有任何系列 —— 只留一处语气朴素的空态，
           不放 0% 的进度条、也不显示「0/0 篇」 */
        <Reveal className="section">
          <EmptyState
            icon={Inbox}
            title="还没有连载线"
            desc="这个博客刚刚开张，第一条连载还没有开始写。等它落地后，这里会给出完整的阅读路线、篇目顺序和进度。"
            action={
              <Button to="/posts" icon={Library}>
                先去看文章
              </Button>
            }
          />
        </Reveal>
      ) : (
        <>
          {/* ------------------------------ 总览 ------------------------------ */}
          {/* 全页唯一一处 ShineBorder：只给这块总览面板描边 */}
          <Reveal style={{ marginTop: 'var(--sp-10)' }}>
            <ShineBorder>
              <div className="panel panel--glow stack stack--6">
                {loading ? (
                  <>
                    <Skeleton w="42%" h={24} />
                    <Skeleton w="100%" h={6} radius="var(--r-pill)" />
                    <div className="stat-grid">
                      {STAT_SKELETONS.map((i) => (
                        <Skeleton key={i} w="100%" h={86} radius="var(--r-md)" />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="row row--between row--wrap"
                      style={{ gap: 'var(--sp-5)', alignItems: 'flex-end' }}
                    >
                      <div>
                        <div className="eyebrow">OVERALL</div>
                        <h2 className="display-3" style={{ marginTop: 'var(--sp-2)' }}>
                          {hasProgress
                            ? `${seriesList.length} 条线 · ${totals.published}/${totals.total} 篇已发布`
                            : `${seriesList.length} 条线 · 篇目还没排进来`}
                        </h2>
                        <p
                          className="text-sub"
                          style={{
                            fontSize: 'var(--fs-14)',
                            marginTop: 'var(--sp-2)',
                            maxWidth: 'var(--measure)',
                          }}
                        >
                          {hasProgress
                            ? '这张进度表回答的不是「写了多少」，而是「还剩多少」：未发布的篇目已经在各自系列里占好位置。'
                            : '系列已经建好，但还没有往里面排篇目；等第一篇建档之后，这里会开始统计已发布与计划中的篇数。'}
                        </p>
                      </div>
                      {hasProgress ? (
                        <div className="stack stack--2" style={{ alignItems: 'flex-end' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: 'var(--fs-52)',
                              fontWeight: 600,
                              lineHeight: 1,
                              letterSpacing: '-0.03em',
                            }}
                          >
                            <NumberTicker value={percent} suffix="%" />
                          </span>
                          <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
                            OVERALL PROGRESS
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="stack stack--2">
                      {hasProgress ? (
                        <>
                          <span className="progress-rail">
                            <span
                              className="progress-rail__fill"
                              style={{ width: `${percent}%` }}
                            />
                          </span>
                          <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
                            已发布 {totals.published} 篇 · 计划中 {plannedCount} 篇 · 合计{' '}
                            {totals.total} 篇
                          </span>
                        </>
                      ) : (
                        <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
                          还没有排进任何篇目，进度会在第一篇建档后出现
                        </span>
                      )}
                    </div>

                    <div className="meta-row">
                      <span className="meta-row__item">
                        <BookOpen size={13} strokeWidth={1.75} aria-hidden="true" />
                        全站累计 {compactNumber(safeCount(stats?.totalWords))} 字
                      </span>
                      <span className="meta-row__item">
                        <Hash size={13} strokeWidth={1.75} aria-hidden="true" />
                        覆盖 {safeCount(stats?.tagCount)} 个标签
                      </span>
                      <span className="meta-row__item">
                        <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
                        {totalMinutes > 0
                          ? `已发布内容约 ${Math.max(1, Math.round(totalMinutes / 60))} 小时能读完`
                          : '还没有正文内容，阅读时长暂时为空'}
                      </span>
                    </div>

                    <div className="stat-grid">
                      <StatCounter
                        value={safeCount(stats?.postCount ?? totals.published)}
                        suffix="篇"
                        label="已发布"
                      />
                      <StatCounter value={plannedCount} suffix="篇" label="计划中" />
                      <StatCounter
                        value={safeCount(stats?.seriesCount ?? seriesList.length)}
                        suffix="条"
                        label="连载系列"
                      />
                      <StatCounter value={safeCount(stats?.readers)} label="累计阅读" />
                    </div>
                  </>
                )}
              </div>
            </ShineBorder>
          </Reveal>

          {/* 超大字跑马灯：系列名向左流动，滚动越快跑得越快（只加这一行） */}
          {seriesList.length ? (
            <ScrollVelocityText
              items={seriesList.map((s) => s.title)}
              baseVelocity={26}
              direction={-1}
              className="section"
            />
          ) : null}

          {/* ------------------------------ 系列列表 ------------------------------ */}
          <Reveal className="section">
            <SectionHeading
              eyebrow="LINES"
              title="四条主线"
              sub="每条线都能单独读，但按顺序读时，前面的概念会在后面被反复用到。"
              action={
                <Tag tone="teal" size="sm" icon={Layers}>
                  {seriesList.length} 条
                </Tag>
              }
            />
            {loading ? (
              <div className="grid grid--2">
                {CARD_SKELETONS.map((i) => (
                  <SeriesCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid--2">
                {seriesList.map((s, i) => (
                  <Reveal key={s.id ?? s.slug} delay={i * 0.06}>
                    <TiltWrap>
                      <SeriesCard series={s} />
                    </TiltWrap>
                  </Reveal>
                ))}
              </div>
            )}
          </Reveal>

          {/* ------------------------------ 阅读顺序（sticky 滚动叙事） ------------------------------ */}
          <Reveal className="section">
            <SectionHeading
              eyebrow="READING ORDER"
              title="阅读顺序"
              sub="把几条线拍平之后的时间顺序：先读完已发布的，再按计划往下等。"
              action={
                <Tag size="sm" icon={List}>
                  {ordered.length} 条
                </Tag>
              }
            />
            {loading ? (
              <div className="stack stack--6">
                {LINE_SKELETONS.map((i) => (
                  <div className="stack stack--2" key={i}>
                    <Skeleton w={88} h={11} />
                    <Skeleton w={`${52 + i * 6}%`} h={16} />
                    <Skeleton w="84%" h={13} />
                  </div>
                ))}
              </div>
            ) : storySteps.length ? (
              /* 有系列才渲染 sticky 叙事：steps 为空时整块不出现，
                 系列锚点 id={slug} 也随分镜一起保留 */
              <StickyScrollStory steps={storySteps} />
            ) : null}
          </Reveal>

          {/* ------------------------------ 下一步 ------------------------------ */}
          <Reveal className="section">
            <div className="panel stack stack--5">
              <div
                className="row row--between row--wrap"
                style={{ gap: 'var(--sp-5)', alignItems: 'flex-end' }}
              >
                <div style={{ maxWidth: 'var(--measure)' }}>
                  <div className="eyebrow eyebrow--accent">NEXT</div>
                  <h3 className="display-3" style={{ marginTop: 'var(--sp-2)' }}>
                    按系列筛选文章
                  </h3>
                  <p className="text-sub" style={{ fontSize: 'var(--fs-14)', marginTop: 'var(--sp-2)' }}>
                    文章列表支持按系列、标签、关键词筛选，也可以按阅读量排序；不知道从哪开始就先读内核那条线。
                  </p>
                </div>
                <div className="btn-row">
                  <Button to="/posts" icon={Library} iconRight={ArrowRight}>
                    浏览全部文章
                  </Button>
                  <Button variant="ghost" to="/about" icon={Mail}>
                    关于我 / 留言
                  </Button>
                </div>
              </div>

              <div className="divider" />

              <div className="tag-row">
                {seriesList.map((s) => (
                  <Tag
                    key={s.slug}
                    size="sm"
                    to={`/posts?series=${s.slug}`}
                    icon={seriesIcon(s.icon)}
                    tone={s.accent === 'teal' ? 'teal' : 'accent'}
                  >
                    {s.title}
                  </Tag>
                ))}
              </div>
            </div>
          </Reveal>
        </>
      )}
    </div>
  );
}
