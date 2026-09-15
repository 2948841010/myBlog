import { useState } from 'react';
import {
  AlertTriangle,
  AtSign,
  CalendarDays,
  CheckCircle2,
  Library,
  Link2,
  Mail,
  MapPin,
  RefreshCw,
  Rss,
  Send,
  Sparkles,
} from 'lucide-react';

import { PageHeader, SectionHeading } from '../components/ui/Section.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Tag } from '../components/ui/Tag.jsx';
import { Field, Input, Textarea } from '../components/ui/Form.jsx';
import { EmptyState, Skeleton } from '../components/ui/States.jsx';
import { Reveal } from '../components/ui/Motion.jsx';
import { ShineBorder, TiltWrap } from '../components/fx/CardFx.jsx';
import { TracingBeam } from '../components/fx/ScrollFx.jsx';
import { MagneticWrap } from '../components/fx/PointerFx.jsx';
import { HyperText, TextReveal } from '../components/fx/TextFx.jsx';
import { useAsync } from '../lib/useAsync.js';
import { fetchProfile, sendMessage } from '../api/index.js';
import { useToast } from '../store/index.jsx';
import { SITE } from '../config/site.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 社交图标兜底：SITE.socials 的 icon 来自 config/site.js 的 lucide 引用，
 * 若某个 key 没有拿到图标组件，这里按 key 退回一个语义接近的图标，避免出现「只有文字没有图标」的空标签。
 */
const SOCIAL_ICON_FALLBACK = {
  github: Link2,
  x: AtSign,
  rss: Rss,
  mail: Mail,
};

/** 资料卡加载占位 */
function ProfileSkeleton() {
  return (
    <div className="panel" style={{ marginTop: 'var(--sp-10)' }}>
      <div className="split">
        <div className="stack stack--5">
          <div className="row" style={{ gap: 'var(--sp-4)', alignItems: 'center' }}>
            <Skeleton w="var(--sp-16)" h="var(--sp-16)" radius="var(--r-sm)" />
            <div className="stack stack--2" style={{ flex: 1 }}>
              <Skeleton w="42%" h={24} />
              <Skeleton w="62%" h={12} />
            </div>
          </div>
          <Skeleton w="86%" h={12} />
          <Skeleton w="70%" h={28} radius="var(--r-pill)" />
        </div>
        <div className="stack stack--3">
          <Skeleton w="100%" h={14} />
          <Skeleton w="96%" h={14} />
          <Skeleton w="88%" h={14} />
          <Skeleton w="52%" h={12} />
        </div>
      </div>
    </div>
  );
}

/**
 * 留言表单：前端校验 → sendMessage() → toast + 成功态
 * 校验失败与接口失败都会把错误落到对应字段的 Field / Input 上
 */
function ContactForm({ fallbackEmail }) {
  const [form, setForm] = useState({ name: '', email: '', content: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { push } = useToast();

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = '请填一个称呼，昵称也行';
    if (!EMAIL_RE.test(form.email.trim())) next.email = '邮箱格式看起来不太对';
    if (form.content.trim().length < 8) next.content = '内容太短了，至少写 8 个字，方便我知道你想聊什么';
    return next;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const next = validate();
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setErrors({});
    setLoading(true);
    const res = await sendMessage({
      name: form.name.trim(),
      email: form.email.trim(),
      content: form.content.trim(),
    });
    setLoading(false);

    if (res.code !== 0) {
      // 接口返回的 message 决定错误落到哪个字段
      const field = res.message.includes('称呼')
        ? 'name'
        : res.message.includes('邮箱')
          ? 'email'
          : 'content';
      setErrors({ [field]: res.message });
      push({ variant: 'danger', title: '发送失败', desc: res.message });
      return;
    }

    setDone(true);
    push({ variant: 'success', title: '留言已送达', desc: res.message });
  };

  const reset = () => {
    setForm({ name: '', email: '', content: '' });
    setErrors({});
    setDone(false);
  };

  if (done) {
    return (
      <div className="panel panel--glow stack stack--5">
        <div className="row row--wrap" style={{ gap: 'var(--sp-3)' }}>
          <CheckCircle2 size={20} strokeWidth={1.75} className="text-accent" aria-hidden="true" />
          <span style={{ fontSize: 'var(--fs-18)', fontWeight: 600 }}>留言已送到</span>
        </div>
        <p className="text-sub" style={{ fontSize: 'var(--fs-14)', maxWidth: 'var(--measure)' }}>
          我通常在两天内回复，回复会发到 {form.email || fallbackEmail}。如果是具体的线上问题，可以把
          trace 里的关键几步一起写进来，这样我们能少来回两轮。
        </p>
        <div className="btn-row">
          <Button variant="ghost" icon={RefreshCw} onClick={reset}>
            再写一条
          </Button>
          <Button variant="quiet" to="/posts" icon={Library}>
            顺便看看文章
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="panel stack stack--5" onSubmit={onSubmit} noValidate>
      <div className="grid grid--2">
        <Field label="怎么称呼你" htmlFor="contact-name" error={errors.name} hint="昵称也可以">
          <Input
            id="contact-name"
            name="name"
            value={form.name}
            error={Boolean(errors.name)}
            aria-invalid={Boolean(errors.name)}
            autoComplete="name"
            placeholder="比如：老周"
            onChange={(e) => setField('name', e.target.value)}
          />
        </Field>

        <Field label="邮箱" htmlFor="contact-email" error={errors.email} hint="只用来回复，不会公开">
          <Input
            id="contact-email"
            name="email"
            type="email"
            value={form.email}
            error={Boolean(errors.email)}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            placeholder="you@example.com"
            onChange={(e) => setField('email', e.target.value)}
          />
        </Field>
      </div>

      <Field
        label="想说的话"
        htmlFor="contact-content"
        error={errors.content}
        hint="越具体越好，比如「多智能体路由总是选错工具」「评测集怎么和线上数据同步」"
      >
        <Textarea
          id="contact-content"
          name="content"
          rows={5}
          value={form.content}
          error={Boolean(errors.content)}
          aria-invalid={Boolean(errors.content)}
          placeholder="说说你在做的 Agent，以及卡在哪一步。"
          onChange={(e) => setField('content', e.target.value)}
        />
      </Field>

      <div className="row row--between row--wrap" style={{ gap: 'var(--sp-3)' }}>
        <MagneticWrap>
          <Button
            type="submit"
            variant="primary"
            island
            icon={loading ? undefined : Send}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                发送中
              </>
            ) : (
              '提交留言'
            )}
          </Button>
        </MagneticWrap>
        <span className="row" style={{ gap: 'var(--sp-2)', color: 'var(--text-dim)' }}>
          <Mail size={13} strokeWidth={1.75} aria-hidden="true" />
          <span className="mono" style={{ fontSize: 'var(--fs-12)' }}>
            也可以直接发邮件：{fallbackEmail}
          </span>
        </span>
      </div>
    </form>
  );
}

/**
 * 关于页
 * 数据来源：fetchProfile()（姓名 / 简介 / now / stack / timeline）
 *          SITE.socials（社交链接，profile 里没有 socials 字段）
 *          sendMessage()（留言表单提交）
 * 动效：资料卡 ShineBorder（全页唯一）+ 姓名 HyperText + 简介 TextReveal，
 *      时间线 TracingBeam，技能栈 TiltWrap，社交与提交按钮 MagneticWrap
 */
export default function About() {
  const { data: res, loading, error } = useAsync(() => fetchProfile(), []);
  const profile = res?.data ?? null;

  if (loading) {
    return (
      <div className="page">
        <div className="stack stack--5">
          <Skeleton w={96} h={12} />
          <Skeleton w="46%" h={38} />
          <Skeleton w="64%" h={16} />
        </div>
        <ProfileSkeleton />
        <div className="section stack stack--3">
          <Skeleton w="34%" h={22} />
          <Skeleton w="100%" h={14} />
          <Skeleton w="92%" h={14} />
          <Skeleton w="78%" h={14} />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page">
        <EmptyState
          icon={AlertTriangle}
          title="资料没能加载出来"
          desc="接口这次没有返回内容，可以刷新页面重试，或者直接去连载里翻文章。"
          action={
            <Button variant="ghost" to="/posts" icon={Library}>
              去看文章
            </Button>
          }
        />
      </div>
    );
  }

  const initial = profile.name.slice(0, 1);
  const timeline = profile.timeline ?? [];
  const stack = profile.stack ?? [];
  const now = profile.now ?? [];
  const earlierFrom = 3;

  /* 资料卡的派生值：空值一律不参与渲染，
     避免出现「只有一个图标」的元信息项，或「— zcy · 写于 」这种断掉的句子。 */
  const identity = [profile.handle, profile.role]
    .filter((v) => typeof v === 'string' && v.trim())
    .join(' · ');
  const place = typeof SITE.location === 'string' ? SITE.location.trim() : '';
  const metaItems = [
    profile.location?.trim() ? { key: 'location', icon: MapPin, text: profile.location } : null,
    profile.since?.trim()
      ? { key: 'since', icon: CalendarDays, text: `${profile.since} 年起做 Agent` }
      : null,
    profile.email?.trim() ? { key: 'email', icon: Mail, text: profile.email } : null,
  ].filter(Boolean);
  const stackCount = stack.reduce((sum, g) => sum + (g.items?.length ?? 0), 0);

  return (
    <div className="page">
      <PageHeader eyebrow="ABOUT" title="关于" sub={SITE.tagline} />

      {/* ------------------------------ 资料卡 ------------------------------ */}
      {/* 全页唯一一处 ShineBorder：只给资料卡描边 */}
      <Reveal style={{ marginTop: 'var(--sp-10)' }}>
        <ShineBorder>
          <div className="panel">
            <div className="split">
              <div className="stack stack--5">
                <div className="row row--wrap" style={{ gap: 'var(--sp-4)', alignItems: 'center' }}>
                  <span
                    className="series-slab__icon"
                    style={{
                      width: 'var(--sp-16)',
                      height: 'var(--sp-16)',
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--fs-28)',
                      fontWeight: 600,
                    }}
                    aria-hidden="true"
                  >
                    {initial}
                  </span>
                  <span className="stack stack--2">
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'var(--fs-28)',
                        fontWeight: 600,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      <HyperText text={profile.name} />
                    </span>
                    {identity ? (
                      <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
                        {identity}
                      </span>
                    ) : null}
                  </span>
                </div>

                {/* 元信息逐项判空：值为空时整项不渲染，图标与间距都不会悬空 */}
                {metaItems.length ? (
                  <div className="meta-row">
                    {metaItems.map(({ key, icon: Icon, text }) => (
                      <span className="meta-row__item" key={key}>
                        <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
                        {text}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="tag-row">
                  {SITE.socials.map((s) => (
                    <MagneticWrap key={s.key}>
                      <Tag href={s.href} icon={s.icon || SOCIAL_ICON_FALLBACK[s.key]} size="sm">
                        {s.label}
                        <span className="text-dim">{s.handle}</span>
                      </Tag>
                    </MagneticWrap>
                  ))}
                </div>
              </div>

              <div className="stack stack--5">
                <p className="lede" style={{ fontSize: 'var(--fs-16)' }}>
                  <TextReveal as="span" variant="generate" text={profile.bio} step={0.012} />
                </p>
                <div className="hr-accent" />
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--fs-18)',
                    fontStyle: 'italic',
                    color: 'var(--text-sub)',
                  }}
                >
                  把 Agent 从能跑到能扛，中间那些没人写进文档的步骤，我都想写下来。
                </p>
                {/* SITE.location 为空时只留署名，不让「写于」后面空着 */}
                <span className="mono text-dim" style={{ fontSize: 'var(--fs-12)' }}>
                  {`— ${profile.name}${place ? ` · 写于 ${place}` : ''}`}
                </span>
              </div>
            </div>
          </div>
        </ShineBorder>
      </Reveal>

      {/* ------------------------------ 现在在做什么 ------------------------------ */}
      <Reveal className="section">
        <SectionHeading
          eyebrow="NOW"
          title="现在在做什么"
          sub="这三件事占掉了我大部分时间，博客里的文章基本都是从它们中间长出来的。"
          action={
            <Tag tone="teal" size="sm" icon={Sparkles}>
              每两周更新
            </Tag>
          }
        />
        {now.length ? (
          <div className="panel panel--soft stack stack--3">
            {now.map((item, i) => (
              <Reveal
                className="row"
                key={item}
                delay={i * 0.06}
                style={{ gap: 'var(--sp-3)' }}
              >
                <span className={i % 2 === 1 ? 'dot dot--teal' : 'dot'} aria-hidden="true" />
                <span className="text-sub" style={{ fontSize: 'var(--fs-14)' }}>
                  {item}
                </span>
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal className="panel panel--soft">
            <p className="text-sub" style={{ fontSize: 'var(--fs-14)', maxWidth: 'var(--measure)' }}>
              还没有可同步的近况，等第一篇笔记发出来再补。
            </p>
          </Reveal>
        )}
      </Reveal>

      {/* ------------------------------ 技能栈 ------------------------------ */}
      <Reveal className="section">
        <SectionHeading
          eyebrow="STACK"
          title="工具与方法"
          sub="不追新，能用、能排查、能交接的才会留在生产环境里。"
          action={stackCount ? <Tag size="sm">{stackCount} 项</Tag> : null}
        />
        {stack.length ? (
          <div className="grid grid--2">
            {stack.map((group, i) => (
              <Reveal key={group.group} delay={i * 0.06}>
                <TiltWrap max={4}>
                  <div className="stack-group">
                    <div className="stack-group__title">{group.group}</div>
                    <div className="tag-row">
                      {(group.items ?? []).map((item) => (
                        <Tag key={item} size="sm">
                          {item}
                        </Tag>
                      ))}
                    </div>
                  </div>
                </TiltWrap>
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal className="panel panel--soft">
            <p className="text-sub" style={{ fontSize: 'var(--fs-14)', maxWidth: 'var(--measure)' }}>
              还没有可列出的工具与方法，等这一版用顺了再补。
            </p>
          </Reveal>
        )}
      </Reveal>

      {/* ------------------------------ 时间线 ------------------------------ */}
      <Reveal className="section">
        <SectionHeading
          eyebrow="TIMELINE"
          title="做过的一些事"
          sub="从第一个上线的 Agent 到现在，几件对我影响比较大的事。"
        />
        {/* 光束沿左缘随滚动生长；内容整体右移一段，避免与时间线自带的竖线重叠。
            时间线为空时整块（含 .timeline 与光束）都不渲染：.timeline 自带一条竖线，
            没有条目时会露出一根孤线。 */}
        {timeline.length ? (
          <TracingBeam style={{ paddingLeft: 'var(--sp-6)' }}>
            <div className="timeline">
              {timeline.map((item, i) => (
                <Reveal
                  key={`${item.when}-${item.what}`}
                  className={
                    i >= earlierFrom ? 'timeline__item timeline__item--muted' : 'timeline__item'
                  }
                  delay={Math.min(i, 6) * 0.05}
                >
                  <div className="timeline__when">{item.when}</div>
                  <div className="timeline__what">{item.what}</div>
                  <p className="timeline__desc">{item.desc}</p>
                </Reveal>
              ))}

              <Reveal className="timeline__item timeline__item--muted" delay={0.3}>
                <div className="timeline__when">NEXT</div>
                <div className="timeline__what">下一件：把连载写完</div>
                <p className="timeline__desc">
                  四条主线都还没走完，写完会补一份可复用的 checklist：一个 Agent 上线前到底该过哪些关。
                </p>
              </Reveal>
            </div>
          </TracingBeam>
        ) : (
          <Reveal className="panel panel--soft">
            <p className="text-sub" style={{ fontSize: 'var(--fs-14)', maxWidth: 'var(--measure)' }}>
              还没有可以按时间排的经历，等做过的事攒到能说清楚再补。
            </p>
          </Reveal>
        )}
      </Reveal>

      {/* ------------------------------ 留言 ------------------------------ */}
      <Reveal className="section">
        <SectionHeading
          eyebrow="CONTACT"
          title="写点什么"
          sub="对某篇文章有不同看法、或者遇到具体的问题，都可以直接写在这里。"
        />
        <Reveal delay={0.06}>
          <ContactForm fallbackEmail={profile.email} />
        </Reveal>
      </Reveal>
    </div>
  );
}
