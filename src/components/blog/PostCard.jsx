import { Link } from 'react-router-dom';
import { Clock, Eye, ArrowUpRight, BookMarked } from 'lucide-react';
import { Tag } from '../ui/Tag.jsx';
import { SpotlightCard } from '../ui/Card.jsx';
import { formatDate, compactNumber, pad2 } from '../../lib/format.js';

/** 封面装饰：由两个渐变色 + 图案类型生成的 CSS 视觉，不依赖位图资源 */
function CoverArt({ cover, className = '' }) {
  const style = {
    background: `linear-gradient(135deg, ${cover.from}, ${cover.to})`,
  };
  return (
    <span className={`cover-art cover-art--${cover.pattern} ${className}`.trim()} style={style} aria-hidden="true" />
  );
}

/** 文章卡片（网格视图） */
export function PostCard({ post, showOrder = true }) {
  return (
    <SpotlightCard to={`/posts/${post.slug}`} className="post-card">
      <CoverArt cover={post.cover} className="cover-art--card" />

      <div className="post-card__head">
        {showOrder && post.series ? (
          <span className="post-card__order">{pad2(post.seriesOrder)}</span>
        ) : null}
        <span>{post.series ? post.series.title : '随笔'}</span>
        <span style={{ marginLeft: 'auto' }}>{formatDate(post.publishedAt)}</span>
      </div>

      <h3 className="post-card__title">{post.title}</h3>
      <p className="post-card__dek">{post.dek}</p>

      <div className="tag-row">
        {post.tags.slice(0, 3).map((t) => (
          <Tag key={t} size="sm">
            {t}
          </Tag>
        ))}
      </div>

      <div className="post-card__foot">
        <span className="row" style={{ gap: 12 }}>
          <span className="row" style={{ gap: 4 }}>
            <Clock size={12} strokeWidth={1.75} aria-hidden="true" />
            {post.readingMinutes} 分钟
          </span>
          <span className="row" style={{ gap: 4 }}>
            <Eye size={12} strokeWidth={1.75} aria-hidden="true" />
            {compactNumber(post.views)}
          </span>
        </span>
        <span className="row" style={{ gap: 4, color: 'var(--accent)' }}>
          阅读
          <ArrowUpRight size={12} strokeWidth={2} aria-hidden="true" />
        </span>
      </div>
    </SpotlightCard>
  );
}

/** 文章行（列表视图，信息密度更高） */
export function PostRow({ post }) {
  return (
    <Link to={`/posts/${post.slug}`} className="post-row">
      <span className="post-row__date">{formatDate(post.publishedAt)}</span>
      <span>
        <span className="post-row__title" style={{ display: 'block' }}>
          {post.title}
        </span>
        <span className="post-row__dek" style={{ display: 'block' }}>
          {post.dek}
        </span>
        <span className="tag-row" style={{ marginTop: 10 }}>
          {post.series ? (
            <Tag tone="accent" size="sm" icon={BookMarked}>
              {post.series.title}
            </Tag>
          ) : null}
          {post.tags.slice(0, 2).map((t) => (
            <Tag key={t} size="sm">
              {t}
            </Tag>
          ))}
        </span>
      </span>
      <span className="post-row__tail">
        {post.readingMinutes} 分钟
        <br />
        {compactNumber(post.views)} 阅读
      </span>
    </Link>
  );
}

/** 计划中的文章（时间线上的占位，不可点击） */
export function PlannedPostCard({ post }) {
  return (
    <div className="post-card" style={{ opacity: 0.72, cursor: 'default' }}>
      <div className="post-card__head">
        <span className="post-card__order">{pad2(post.seriesOrder)}</span>
        <span>计划中</span>
      </div>
      <h3 className="post-card__title">{post.title}</h3>
      <p className="post-card__dek">{post.dek}</p>
      <div className="post-card__foot">
        <span>尚未发布</span>
        <span className="tag tag--sm">Planned</span>
      </div>
    </div>
  );
}

export { CoverArt };
