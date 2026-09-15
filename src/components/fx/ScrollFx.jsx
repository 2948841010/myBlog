import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion';
import { useCapability } from '../../lib/motion.js';
import { pad2 } from '../../lib/format.js';

/**
 * 阅读光束：沿容器左缘随滚动进度生长。
 * 进度走 useTransform → scaleY，不进 React state。
 */
export function TracingBeam({ children, className = '', style }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 85%', 'end 55%'],
  });
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <div ref={ref} className={className} style={{ position: 'relative', ...style }}>
      <span className="beam-track" aria-hidden="true">
        <motion.span className="beam-track__fill" style={{ scaleY }} />
      </span>
      {children}
    </div>
  );
}

/** 右侧章节刻度：随阅读位置高亮，点击跳转（不用 href="#"，兼容 HashRouter） */
export function ScrollRail({ items = [], activeId, className = '' }) {
  if (!items.length) return null;
  return (
    <nav className={`scroll-rail ${className}`.trim()} aria-label="章节导航">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className={`scroll-rail__dot${activeId === it.id ? ' is-active' : ''}`}
          title={it.label}
          aria-label={it.label}
          onClick={() => {
            const el = document.getElementById(it.id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      ))}
    </nav>
  );
}

/**
 * 滚动速度驱动的超大字跑马灯
 * 基础速度恒定，滚动越快速度越快；向上滚可反向。reduced-motion 下静止。
 */
export function ScrollVelocityText({
  items = [],
  baseVelocity = 42,
  direction = 1,
  solid = false,
  className = '',
}) {
  const caps = useCapability();
  const trackRef = useRef(null);
  const widthRef = useRef(0);
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const rawVelocity = useVelocity(scrollY);
  const velocity = useSpring(rawVelocity, { damping: 50, stiffness: 380 });

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const measure = () => {
      widthRef.current = el.scrollWidth / 2;
      if (x.get() === 0 && widthRef.current) x.set(-widthRef.current);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items, x]);

  useAnimationFrame((_, delta) => {
    if (caps.reduced) return;
    const width = widthRef.current;
    if (!width) return;

    const dir = direction >= 0 ? 1 : -1;
    let move = dir * baseVelocity * (delta / 1000);
    // 滚动速度加成：越快越猛，可短暂反向
    move += dir * velocity.get() * 0.055;

    let next = x.get() + move;
    if (next <= -width) next += width;
    else if (next > 0) next -= width;
    x.set(next);
  });

  const doubled = [...items, ...items];

  return (
    <div className={`sv-row ${className}`.trim()} aria-hidden="true">
      <motion.div className="sv-row__track" ref={trackRef} style={{ x }}>
        {doubled.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className={`sv-row__item${solid ? ' sv-row__item--solid' : ''}`}
          >
            {label}
            <span className="dot" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/**
 * Sticky 滚动叙事：左栏步骤列表锁定，右栏分镜依次进入
 * steps: [{ id, title, desc, content }]
 */
export function StickyScrollStory({ steps = [], className = '' }) {
  const [active, setActive] = useState(0);
  const panelRefs = useRef([]);
  const activeRef = useRef(0);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const i = Number(entry.target.dataset.index);
          if (Number.isNaN(i) || i === activeRef.current) return;
          activeRef.current = i;
          setActive(i);
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    panelRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [steps.length]);

  return (
    <div className={`sticky-scroll ${className}`.trim()}>
      <div className="sticky-scroll__aside">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`sticky-scroll__step${active === i ? ' is-active' : ''}`}
            onClick={() => {
              const el = panelRefs.current[i];
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            <span className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>
              {pad2(i + 1)}
            </span>
            <span className="stack stack--2" style={{ textAlign: 'left' }}>
              <span style={{ fontWeight: 600, fontSize: 16 }}>{s.title}</span>
              {s.desc ? (
                <span className="text-sub" style={{ fontSize: 14 }}>
                  {s.desc}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      <div className="stack stack--8">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className="sticky-scroll__panel"
            data-index={i}
            ref={(el) => {
              panelRefs.current[i] = el;
            }}
          >
            {s.content}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 滚动翻出：内容从带透视的「屏幕」里翻平（适合展示终端/截图类内容） */
export function ContainerScroll({ children, className = '', style }) {
  const ref = useRef(null);
  const caps = useCapability();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'start center'],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.001,
  });
  const rotateX = useTransform(smooth, [0, 1], [15, 0]);
  const scale = useTransform(smooth, [0, 1], [0.93, 1]);
  const y = useTransform(smooth, [0, 1], [44, 0]);

  if (caps.reduced) {
    return (
      <div ref={ref} className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`container-scroll ${className}`.trim()}
      style={style}
    >
      <motion.div className="container-scroll__inner" style={{ rotateX, scale, y }}>
        {children}
      </motion.div>
    </div>
  );
}
