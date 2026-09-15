import { Link } from 'react-router-dom';

function buildClass({ variant, size, block, island, className }) {
  return [
    'btn',
    `btn--${variant}`,
    size === 'sm' ? 'btn--sm' : '',
    size === 'lg' ? 'btn--lg' : '',
    block ? 'btn--block' : '',
    island ? 'btn--island' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

/** 通用按钮：默认渲染 <button>，传 to 渲染 <Link>，传 href 渲染 <a>
 *  island：胶囊 + 尾部图标独立圆形包裹（Button-in-Button） */
export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  island = false,
  icon: Icon,
  iconRight: IconRight,
  to,
  href,
  children,
  className = '',
  ...rest
}) {
  const cls = buildClass({ variant, size, block, island, className });
  const inner = (
    <>
      {Icon ? <Icon size={16} strokeWidth={1.75} aria-hidden="true" /> : null}
      {children}
      {IconRight ? (
        island ? (
          <span className="btn__circle" aria-hidden="true">
            <IconRight size={15} strokeWidth={2} />
          </span>
        ) : (
          <IconRight size={16} strokeWidth={1.75} aria-hidden="true" />
        )
      ) : null}
      {variant === 'primary' ? <span className="btn__shine" aria-hidden="true" /> : null}
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
    <button type="button" className={cls} {...rest}>
      {inner}
    </button>
  );
}

/** 纯图标按钮（必须有 label，用于无障碍） */
export function IconButton({
  icon: Icon,
  label,
  size = 'md',
  to,
  href,
  className = '',
  iconSize = 18,
  ...rest
}) {
  const cls = [
    'btn',
    'btn--icon',
    size === 'sm' ? 'btn--sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const inner = <Icon size={iconSize} strokeWidth={1.75} aria-hidden="true" />;

  if (to) {
    return (
      <Link to={to} className={cls} aria-label={label} title={label} {...rest}>
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
        aria-label={label}
        title={label}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
        {...rest}
      >
        {inner}
      </a>
    );
  }
  return (
    <button type="button" className={cls} aria-label={label} title={label} {...rest}>
      {inner}
    </button>
  );
}
