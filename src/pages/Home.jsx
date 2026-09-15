import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Flame,
  Hash,
  Inbox,
  Layers,
  Mail,
} from 'lucide-react';

import { fetchPosts, fetchSeries, fetchStats, fetchTags, fetchTicker } from '../api/index.js';
import { useAsync } from '../lib/useAsync.js';
import { pad2 } from '../lib/format.js';
// 注意：store 的入口文件是 index.jsx。写成 '../store/index.js' Vite 不会做 .js → .jsx 回退，会解析失败。
import { useToast } from '../store/index.jsx';

import { Button } from '../components/ui/Button.jsx';
import { Enter, Reveal } from '../components/ui/Motion.jsx';
import { SectionHeading } from '../components/ui/Section.jsx';
import { EmptyState, PostSkeleton, Skeleton } from '../components/ui/States.jsx';
import { TypedTerminal } from '../components/ui/Terminal.jsx';
import { StatCounter } from '../components/ui/Stat.jsx';
import { PostCard } from '../components/blog/PostCard.jsx';
import { SeriesSlab } from '../components/blog/SeriesCard.jsx';
import { SubscribeForm } from '../components/blog/SubscribeForm.jsx';

/* 动效层（fx）：只在这里组合，不新增 CSS / 类名 */
import { ShimmerText, TextReveal } from '../components/fx/TextFx.jsx';
import { BentoGrid, BentoItem, ShineBorder, TiltWrap } from '../components/fx/CardFx.jsx';
import { AgentGraph } from '../components/fx/AgentGraph.jsx';
import { ContainerScroll, ScrollVelocityText } from '../components/fx/ScrollFx.jsx';
import { MagneticWrap } from '../components/fx/PointerFx.jsx';
import { Hero3DLazy } from '../components/fx/Hero3DLazy.jsx';

/* ============================================================================
   首页 —— 唯一页面文件
   结构：Hero（3D 装饰层 + 文字揭示） → 换气带（滚动速度驱动双行） → 正在连载
        → 最新文章（Bento 精选 + 网格） → 数据（ShineBorder） → 主题标签 → 订阅
   所有数据来自 src/api（经 useAsync 消费），页面本身不硬编码任何文章内容。
   ============================================================================ */

/** hero 终端演示：3 行真实感命令与输出。
 *  放在组件外是必须的 —— TypedTerminal 的 useEffect 依赖 lines 的引用，
 *  写成内联数组会导致每次父组件重渲染都重新打字。 */
const TERMINAL_LINES = [
  { cmd: 'whoami', out: 'zcy · 刚开始写 Agent 笔记' },
  { cmd: 'ls notes/', out: '空的，第一篇还在写' },
  { cmd: 'agent notes new', out: 'waiting for input…' },
];

/** 换气带短词：ScrollVelocityText 用超大字号，只能放短词。
 *  接口拿得到数据时会并上 ticker 的 label（同样很短），拿不到就只用这份兜底。 */
const TAPE_WORDS = [
  'ReAct 循环',
  'Tool Calling',
  'MCP',
  '上下文工程',
  'Eval Harness',
  '可观测性',
  '权限边界',
  '多智能体',
];

/** 标签区展示上限（标签总数较多，只列被引用最多的若干个，其余去文章归档筛） */
const TILE_LIMIT = 12;

/** 错误态的统一外观（列表类区块共用） */
function ErrorState({ title, desc }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      desc={desc}
      action={
        <Button variant="ghost" size="sm" island to="/posts" iconRight={ArrowUpRight}>
          去文章归档看看
        </Button>
      }
    />
  );
}

export default function Home() {
  const { push } = useToast();

  const postsRes = useAsync(() => fetchPosts({ pageSize: 12, sort: 'latest' }), []);
  const seriesRes = useAsync(() => fetchSeries(), []);
  const statsRes = useAsync(() => fetchStats(), []);
  const tagsRes = useAsync(() => fetchTags(), []);
  const tickerRes = useAsync(() => fetchTicker(), []);

  const posts = postsRes.data?.data ?? [];
  const series = seriesRes.data?.data ?? [];
  const stats = statsRes.data?.data ?? null;
  const tags = tagsRes.data?.data ?? [];
  const ticker = tickerRes.data?.data ?? [];

  // 一次请求派生：最新 6 篇 + 精选 3 篇
  const latest = posts.slice(0, 6);
  const featured = posts.filter((p) => p.featured).slice(0, 3);
  const topTags = tags.slice(0, TILE_LIMIT);

  // 换气带文案：ticker 是 { label, value }[]，label 本身就是短词，直接并进清单；
  // 数据还没回来 / 请求失败时退回静态短词，换气带永远有内容。
  const tapeWords = useMemo(
    () => (ticker.length ? TAPE_WORDS.concat(ticker.map((t) => t.label)) : TAPE_WORDS),
    [ticker]
  );

  // 主列表失败时额外给一条全局提示（区块内仍渲染错误态）
  const postsError = postsRes.error;
  useEffect(() => {
    if (!postsError) return;
    push({
      variant: 'danger',
      title: '文章列表加载失败',
      desc: postsError.message || '接口没有返回数据，稍后刷新重试。',
    });
  }, [postsError, push]);

  return (
    <div className="page">
      {/* ───────────────────────── 1. Hero ───────────────────────── */}
      {/* 3D 装饰层是 absolute 铺满，容器必须有定位；底部留白给换气带当背景 */}
      <div
        style={{
          position: 'relative',
          paddingBottom: 'var(--sp-16)',
        }}
      >
        <Hero3DLazy />

        <section className="hero" style={{ position: 'relative', zIndex: 1 }}>
          {/* 左列只留三件事：标题、导语、两个入口。
              原来的「01 AGENT 开发连载 · 每两周一更」eyebrow、
              「最近在写」主题轮播、底部「15 篇已发布 / 4 条连载线 / 最近更新」元信息
              都是汇报语气，且把首屏信息密度推得过高，已全部去掉。 */}
          <div className="stack stack--6">
            <Enter delay={0.04}>
              <TextReveal
                as="h1"
                className="display-hero"
                text="欢迎来到我的 *Agent* 开发笔记"
              />
            </Enter>

            <Enter delay={0.16}>
              <p className="lede">
                内容从 ReAct 循环一路写到评测、成本和上线，每篇都来自当天的排障现场。
                更新不快，但会尽量把数据、代码和走过的弯路留全。
              </p>
            </Enter>

            <Enter delay={0.26}>
              <div className="btn-row">
                <MagneticWrap strength={8}>
                  <Button size="lg" island to="/posts" iconRight={ArrowUpRight}>
                    浏览全部文章
                  </Button>
                </MagneticWrap>
                <Button variant="ghost" island to="/series" icon={Layers} iconRight={ArrowUpRight}>
                  看连载路线
                </Button>
              </div>
            </Enter>
          </div>

          {/* 右列：终端 + Agent 执行链路图
              两张卡叠成一组，让右列与左列的视觉重量匹配，不再是「一张卡撑一片空白」 */}
          <Enter delay={0.3} className="stack stack--5">
            <ContainerScroll>
              <div className="terminal-wrap bleed-right float-slow">
                <span className="terminal-wrap__halo" aria-hidden="true" />
                <TypedTerminal
                  title="zsh — zcy@agent-notes"
                  lines={TERMINAL_LINES}
                  loop
                  holdMs={3600}
                />
              </div>
            </ContainerScroll>

            <div className="bleed-right">
              <AgentGraph />
            </div>
          </Enter>
        </section>

        {/* 2. 换气带 —— 作为 hero 底部的背景纹理层（absolute + 低透明度），
            不再单独占据一行高度；下方区块用 zIndex:1 压住它 */}
        <div className="tape" aria-hidden="true">
          {/* 上一行用描边字体（更淡，与 hero 底部内容有重叠），下一行实心 */}
          <ScrollVelocityText items={tapeWords} direction={1} />
          <ScrollVelocityText items={tapeWords} direction={-1} solid />
        </div>
      </div>

      {/* ───────────────────────── 3. 正在连载 ───────────────────────── */}
      <section className="section--lg" style={{ position: 'relative', zIndex: 1 }}>
        <SectionHeading
          eyebrow="SERIES"
          title="正在连载"
          sub="每条线按顺序读下来，就是一个功能从原型走到线上灰度的完整过程。"
          action={
            <Button variant="ghost" size="sm" island to="/series" iconRight={ArrowUpRight}>
              全部系列
            </Button>
          }
        />

        {seriesRes.loading ? (
          <div className="stack stack--5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} h={96} radius="var(--r-md)" />
            ))}
          </div>
        ) : seriesRes.error ? (
          <ErrorState
            title="连载列表加载失败"
            desc={seriesRes.error.message || '接口没有返回数据，刷新页面再试一次。'}
          />
        ) : series.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="还没有连载线"
            desc="第一条系列正在定稿，按顺序读会比单篇更有连贯性。"
            action={
              <Button variant="ghost" size="sm" island to="/posts" iconRight={ArrowUpRight}>
                先看已发布的文章
              </Button>
            }
          />
        ) : (
          <div className="stack stack--5">
            {series.slice(0, 4).map((s, i) => (
              <Reveal key={s.slug} delay={0.06 * i}>
                <TiltWrap max={3}>
                  <SeriesSlab series={s} />
                </TiltWrap>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ───────────────────────── 4. 最新文章 ───────────────────────── */}
      <section className="section--lg">
        <SectionHeading
          eyebrow="LATEST"
          title="最新文章"
          sub="一次拉最近 12 篇：先看编辑挑出的精选，再看最近 6 篇的完整列表。"
          action={
            <Button variant="ghost" size="sm" island to="/posts" iconRight={ArrowUpRight}>
              文章归档
            </Button>
          }
        />

        {postsRes.loading ? (
          <PostSkeleton variant="grid" count={6} />
        ) : postsRes.error ? (
          <ErrorState
            title="文章加载失败"
            desc={postsRes.error.message || '接口没有返回数据，稍后刷新重试。'}
          />
        ) : latest.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="还没有已发布的文章"
            desc="草稿箱里的几篇正在做最后一遍事实核对，通过评测后就会出现在这里。"
            action={
              <Button variant="ghost" size="sm" island to="/series" iconRight={ArrowUpRight}>
                先看连载规划
              </Button>
            }
          />
        ) : (
          <div className="stack stack--8">
            {featured.length ? (
              <Reveal className="stack stack--5">
                <span className="eyebrow eyebrow--accent">
                  <Flame size={12} strokeWidth={1.75} aria-hidden="true" />
                  编辑精选
                </span>

                {/* Bento 拼贴：第 1 篇占宽位（倾斜 + 反光），其余占窄位；不足 3 篇按实际数量渲染 */}
                <BentoGrid>
                  {featured.map((p, i) =>
                    i === 0 ? (
                      <BentoItem key={p.id} span={featured.length === 1 ? 'full' : 'wide'}>
                        <TiltWrap max={5}>
                          <PostCard post={p} />
                        </TiltWrap>
                      </BentoItem>
                    ) : (
                      <BentoItem key={p.id} span="narrow">
                        <PostCard post={p} />
                      </BentoItem>
                    )
                  )}
                </BentoGrid>
              </Reveal>
            ) : null}

            <div className="grid grid--auto">
              {latest.map((p, i) => (
                <Reveal key={p.id} delay={0.04 * i}>
                  <TiltWrap max={3}>
                    <PostCard post={p} />
                  </TiltWrap>
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ───────────────────────── 5. 数据 ───────────────────────── */}
      <section className="section--lg">
        <SectionHeading
          eyebrow="DATA"
          title="数据"
          sub="数字取自每次发布后的统计；字数是正文净字数，不含代码块与图表说明。"
        />

        <Reveal delay={0.06}>
          {/* 全页唯一一处 ShineBorder */}
          <ShineBorder>
            <div className="stat-grid" style={{ padding: 'var(--sp-3)' }}>
              {stats ? (
                <>
                  <StatCounter value={stats.postCount} label="已发布文章" />
                  <StatCounter value={stats.seriesCount} label="连载系列" />
                  <StatCounter value={stats.totalWords} suffix="字" label="累计字数" />
                  <StatCounter value={stats.readers} label="累计阅读" />
                </>
              ) : (
                [0, 1, 2, 3].map((i) => <Skeleton key={i} h={78} radius="var(--r-md)" />)
              )}
            </div>
          </ShineBorder>
        </Reveal>
      </section>

      {/* ───────────────────────── 6. 主题标签 ───────────────────────── */}
      <section className="section--lg">
        <SectionHeading
          eyebrow="TOPICS"
          title="主题标签"
          sub={
            stats
              ? `共 ${stats.tagCount} 个标签，这里列出被引用最多的 ${topTags.length} 个。`
              : '按被引用次数排序。'
          }
          action={
            <Button variant="ghost" size="sm" island to="/posts" iconRight={ArrowUpRight}>
              按标签筛选
            </Button>
          }
        />

        {tagsRes.loading ? (
          <div className="grid grid--2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} h={44} radius="var(--r-sm)" />
            ))}
          </div>
        ) : tagsRes.error ? (
          <ErrorState
            title="标签加载失败"
            desc={tagsRes.error.message || '接口没有返回数据，刷新页面再试一次。'}
          />
        ) : topTags.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="还没有标签"
            desc="文章发布时会从正文主题与元数据里聚合标签，先有第一篇才会有标签。"
          />
        ) : (
          <div className="grid grid--2">
            {topTags.map((t, i) => (
              <Reveal key={t.name} delay={0.03 * i}>
                <Link className="topic-tile" to={`/posts?tag=${encodeURIComponent(t.name)}`}>
                  <span className="row" style={{ gap: 'var(--sp-2)' }}>
                    <Hash size={13} strokeWidth={1.75} aria-hidden="true" />
                    {t.name}
                  </span>
                  <span className="topic-tile__count">{pad2(t.count)} 篇</span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ───────────────────────── 7. 订阅 ───────────────────────── */}
      <section className="section--lg">
        <Reveal className="panel panel--glow" delay={0.06} style={{ padding: 'var(--sp-8)' }}>
          <div className="split" style={{ alignItems: 'center' }}>
            <div className="stack stack--5">
              <span className="eyebrow eyebrow--accent">
                <Mail size={12} strokeWidth={1.75} aria-hidden="true" />
                NEWSLETTER
              </span>

              <h2 className="display-3">
                更新当天收到，一次读完大概<ShimmerText>十分钟</ShimmerText>
              </h2>

              <p className="text-sub" style={{ fontSize: 'var(--fs-14)', maxWidth: 'var(--measure)' }}>
                这一期新增了哪几篇、哪段实现被换掉、评测集里又多了哪些失败用例，
                以及这次踩坑的复现步骤。随时可以退订。
              </p>

              <span className="meta-row">
                <span className="meta-row__item">
                  <CalendarDays size={12} strokeWidth={1.75} aria-hidden="true" />
                  每两周一封 · 周三 20:00 发出 · 随时退订
                </span>
              </span>
            </div>

            <SubscribeForm />
          </div>
        </Reveal>
      </section>
    </div>
  );
}
