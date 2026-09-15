/** 无缝滚动跑马灯：内容复制两份，配合 marquee 关键帧实现无限循环 */
export function Marquee({ items = [], className = '' }) {
  const doubled = [...items, ...items];
  return (
    <div className={`marquee ${className}`.trim()} aria-hidden="true">
      <div className="marquee__track">
        {doubled.map((it, i) => (
          <span className="marquee__item" key={`${it.label}-${i}`}>
            <b>{it.label}</b>
            <span>{it.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
