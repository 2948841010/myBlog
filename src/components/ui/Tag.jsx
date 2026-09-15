import { Link } from 'react-router-dom';

/** 标签 / 胶囊：可作 span、内部 Link 或外部链接 */
export function Tag({
  children,
  tone = 'default',
  size = 'md',
  to,
  href,
  icon: Icon,
  className = '',
  ...rest
}) {
  const cls = [
    'tag',
    tone === 'accent' ? 'tag--accent' : '',
    tone === 'teal' ? 'tag--teal' : '',
    size === 'sm' ? 'tag--sm' : '',
    size === 'lg' ? 'tag--lg' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inner = (
    <>
      {Icon ? <Icon size={12} strokeWidth={1.75} aria-hidden="true" /> : null}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }
  if (href) {
    const external = href.startsWith('http');
    return (
      <a
        href={href}
        className={cls}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
        {...rest}
      >
        {inner}
      </a>
    );
  }
  return (
    <span className={cls} {...rest}>
      {inner}
    </span>
  );
}

/** 可点选的筛选胶囊（用于文章归档的标签筛选） */
export function ChipFilter({ active = false, children, icon: Icon, ...rest }) {
  return (
    <button
      type="button"
      className={`chip-filter${active ? ' is-active' : ''}`}
      aria-pressed={active}
      {...rest}
    >
      {Icon ? <Icon size={13} strokeWidth={1.75} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
