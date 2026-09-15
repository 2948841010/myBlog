import { Reveal } from './Motion.jsx';

/** 区块标题：eyebrow + 标题 + 说明 + 右侧动作 */
export function SectionHeading({ eyebrow, title, sub, action, style }) {
  return (
    <Reveal className="section__head" style={style}>
      <div>
        {eyebrow ? <div className="eyebrow eyebrow--accent">{eyebrow}</div> : null}
        <h2 className="section__title" style={{ marginTop: eyebrow ? 8 : 0 }}>
          {title}
        </h2>
        {sub ? <p className="section__sub">{sub}</p> : null}
      </div>
      {action}
    </Reveal>
  );
}

/** 页面顶部标题区 */
export function PageHeader({ eyebrow, title, sub, children, aside }) {
  return (
    <Reveal className="row row--between row--wrap" style={{ alignItems: 'flex-end', gap: 24 }}>
      <div style={{ maxWidth: '62ch' }}>
        {eyebrow ? <div className="eyebrow eyebrow--accent">{eyebrow}</div> : null}
        <h1 className="display-2" style={{ marginTop: 10 }}>
          {title}
        </h1>
        {sub ? (
          <p className="lede" style={{ marginTop: 12, fontSize: 16 }}>
            {sub}
          </p>
        ) : null}
        {children ? <div style={{ marginTop: 20 }}>{children}</div> : null}
      </div>
      {aside}
    </Reveal>
  );
}
