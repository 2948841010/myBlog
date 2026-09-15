import { Inbox } from 'lucide-react';

/** 骨架屏块 */
export function Skeleton({ w = '100%', h = 14, radius = 8, className = '', style }) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ display: 'block', width: w, height: h, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

/** 文章列表骨架（加载态，覆盖列表与网格两种排布） */
export function PostSkeleton({ variant = 'row', count = 5 }) {
  const items = Array.from({ length: count });
  if (variant === 'grid') {
    return (
      <div className="grid grid--auto">
        {items.map((_, i) => (
          <div className="card" key={i}>
            <Skeleton w="40%" h={11} />
            <div style={{ height: 14 }} />
            <Skeleton w="90%" h={20} />
            <div style={{ height: 10 }} />
            <Skeleton w="100%" h={13} />
            <div style={{ height: 6 }} />
            <Skeleton w="72%" h={13} />
            <div style={{ height: 18 }} />
            <Skeleton w="100%" h={1} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div>
      {items.map((_, i) => (
        <div className="post-row" key={i}>
          <Skeleton w={62} h={11} />
          <div>
            <Skeleton w={`${58 + ((i * 13) % 30)}%`} h={20} />
            <div style={{ height: 10 }} />
            <Skeleton w={`${72 + ((i * 7) % 22)}%`} h={13} />
          </div>
          <Skeleton w={56} h={11} />
        </div>
      ))}
    </div>
  );
}

/** 空状态 */
export function EmptyState({
  icon: Icon = Inbox,
  title = '什么都没有',
  desc = '',
  action = null,
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="empty-state__title">{title}</div>
      {desc ? <p className="empty-state__desc">{desc}</p> : null}
      {action}
    </div>
  );
}

/** 内联加载指示 */
export function Spinner({ label = '加载中' }) {
  return (
    <span className="row" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="text-dim" style={{ fontSize: 13 }}>
        {label}
      </span>
    </span>
  );
}
