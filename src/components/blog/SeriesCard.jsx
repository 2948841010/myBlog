import { Link } from 'react-router-dom';
import { ArrowRight, ListOrdered } from 'lucide-react';
import { Tag } from '../ui/Tag.jsx';
import { seriesIcon } from '../../lib/icons.js';
import { formatDate, pad2 } from '../../lib/format.js';

/** 系列横幅（首页「正在连载」与系列页顶部的横向条目） */
export function SeriesSlab({ series, cta = '查看系列' }) {
  const Icon = seriesIcon(series.icon);
  const tone = series.accent === 'teal' ? 'teal' : 'accent';
  const percent = series.totalCount
    ? Math.round((series.publishedCount / series.totalCount) * 100)
    : 0;

  return (
    <Link className="series-slab" to={`/series#${series.slug}`}>
      <span className={`series-slab__icon${tone === 'teal' ? ' series-slab__icon--teal' : ''}`}>
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>

      <span className="stack stack--2">
        <span className="row row--wrap" style={{ gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
            {series.title}
          </span>
          <Tag size="sm" tone={tone === 'teal' ? 'teal' : 'accent'}>
            {series.subtitle}
          </Tag>
        </span>
        <span className="text-sub" style={{ fontSize: 14, maxWidth: '62ch' }}>
          {series.summary}
        </span>
        <span className="row" style={{ gap: 12, marginTop: 4 }}>
          <span className="progress-rail" style={{ width: 160 }}>
            <span className="progress-rail__fill" style={{ width: `${percent}%` }} />
          </span>
          <span className="mono text-dim" style={{ fontSize: 11 }}>
            {series.publishedCount}/{series.totalCount} 篇 · {percent}%
          </span>
          {series.latest ? (
            <span className="mono text-dim" style={{ fontSize: 11 }}>
              最近更新 {formatDate(series.latest)}
            </span>
          ) : null}
        </span>
      </span>

      <span className="row nowrap" style={{ gap: 6, color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
        {cta}
        <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
      </span>
    </Link>
  );
}

/** 系列卡片（系列页网格视图，含篇目清单） */
export function SeriesCard({ series, maxItems = 4 }) {
  const Icon = seriesIcon(series.icon);
  const tone = series.accent === 'teal' ? 'series-slab__icon--teal' : '';
  const percent = series.totalCount
    ? Math.round((series.publishedCount / series.totalCount) * 100)
    : 0;

  return (
    <div className="panel stack stack--4">
      <div className="row row--between" style={{ alignItems: 'flex-start', gap: 16 }}>
        <span className={`series-slab__icon ${tone}`.trim()}>
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span className="stack stack--2" style={{ alignItems: 'flex-end' }}>
          <Tag size="sm" tone={series.status === 'ongoing' ? 'accent' : 'default'}>
            {series.status === 'ongoing' ? '连载中' : series.status === 'done' ? '已完结' : '筹备中'}
          </Tag>
          <span className="mono text-dim" style={{ fontSize: 11 }}>
            {series.publishedCount}/{series.totalCount} 篇
          </span>
        </span>
      </div>

      <div>
        <h3 className="display-3">{series.title}</h3>
        <p className="mono text-dim" style={{ fontSize: 11, marginTop: 6, letterSpacing: '0.08em' }}>
          {series.subtitle.toUpperCase()}
        </p>
        <p className="text-sub" style={{ fontSize: 14, marginTop: 12 }}>
          {series.summary}
        </p>
      </div>

      <div className="stack stack--2">
        <span className="progress-rail">
          <span className="progress-rail__fill" style={{ width: `${percent}%` }} />
        </span>
        <span className="row row--between mono text-dim" style={{ fontSize: 11 }}>
          <span>进度 {percent}%</span>
          <span>{series.latest ? `更新于 ${formatDate(series.latest)}` : '尚未发布'}</span>
        </span>
      </div>

      <ul className="stack stack--2" style={{ listStyle: 'none' }}>
        {series.posts.slice(0, maxItems).map((p) => (
          <li key={p.id}>
            {p.status === 'published' ? (
              <Link className="link-sweep" style={{ fontSize: 14 }} to={`/posts/${p.slug}`}>
                <span className="mono text-dim" style={{ fontSize: 11 }}>
                  {pad2(p.seriesOrder)}
                </span>
                {p.title}
              </Link>
            ) : (
              <span className="row" style={{ gap: 8, fontSize: 14, color: 'var(--text-dim)' }}>
                <span className="mono" style={{ fontSize: 11 }}>
                  {pad2(p.seriesOrder)}
                </span>
                {p.title}
                <span className="tag tag--sm">计划</span>
              </span>
            )}
          </li>
        ))}
      </ul>

      {series.posts.length > maxItems ? (
        <Link className="link-sweep" style={{ fontSize: 13 }} to={`/posts?series=${series.slug}`}>
          <ListOrdered size={14} strokeWidth={1.75} aria-hidden="true" />
          查看全部 {series.totalCount} 篇
        </Link>
      ) : null}
    </div>
  );
}
