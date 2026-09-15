import { useEffect, useRef } from 'react';
import { useCapability } from '../../lib/motion.js';

/**
 * 全站氛围层（fixed，z-index -1，pointer-events none）
 * 构成：双层极光 + 呼吸光球 + 网格（底层常驻 + 光标点亮层）+ 顶部锥形光斑 + 噪点 + 流星
 * 性能：全部为 CSS transform/opacity 动画；光标联动只在 hover 设备启用，
 *      通过 CSS 变量直写（不经过 React state），reduced-motion 下整体静态化。
 */
export function Atmosphere({ meteors = 10, liveGrid = true, className = '' }) {
  const caps = useCapability();
  const rootRef = useRef(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !caps.hover || caps.reduced || !liveGrid) return undefined;

    let raf = 0;
    let x = -9999;
    let y = -9999;

    const apply = () => {
      raf = 0;
      el.style.setProperty('--gx', `${x}px`);
      el.style.setProperty('--gy', `${y}px`);
    };

    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!el.classList.contains('is-pointer')) el.classList.add('is-pointer');
      if (!raf) raf = requestAnimationFrame(apply);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [caps.hover, caps.reduced, liveGrid]);

  return (
    <div ref={rootRef} className={`atmo ${className}`.trim()} aria-hidden="true">
      <span className="atmo__aurora" />
      <span className="atmo__aurora--b" />
      <span className="atmo__orb atmo__orb--1" />
      <span className="atmo__orb atmo__orb--2" />
      <span className="atmo__grid" />
      {liveGrid ? <span className="atmo__grid--live" /> : null}
      <span className="atmo__spot" />
      <Meteors count={meteors} />
      <span className="atmo__noise" />
    </div>
  );
}

/** 流星：黄金角分布保证不重叠，低端设备自动减到 4 条 */
export function Meteors({ count = 10, className = '' }) {
  const caps = useCapability();
  const total = caps.lowEnd || caps.reduced ? Math.min(4, count) : count;

  const items = Array.from({ length: total }, (_, i) => ({
    left: `${(i * 137.508) % 96}%`,
    top: `${(i * 47) % 62}%`,
    animationDelay: `${((i * 0.83) % 6).toFixed(2)}s`,
    animationDuration: `${(5.2 + ((i * 0.71) % 3.6)).toFixed(2)}s`,
    teal: i % 4 === 0,
  }));

  return (
    <span className={`atmo__meteors ${className}`.trim()}>
      {items.map((style, i) => (
        <span key={i} className={`meteor${style.teal ? ' meteor--teal' : ''}`} style={style} />
      ))}
    </span>
  );
}

/** 容器上下边缘渐隐（长列表 / 滚动区用） */
export function EdgeFade({ top = true, bottom = true, className = '' }) {
  return (
    <div className={className}>
      {top ? <span className="fx-fade fx-fade--top" aria-hidden="true" /> : null}
      {bottom ? <span className="fx-fade fx-fade--bottom" aria-hidden="true" /> : null}
    </div>
  );
}
