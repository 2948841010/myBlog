import { useCallback, useEffect, useRef } from 'react';
import { useCapability } from '../../lib/motion.js';

/**
 * 3D 倾斜容器：鼠标在卡片上移动时产生轻微 rotateX / rotateY
 * 用 rAF + 线性插值直接写 transform（不经过 React state），
 * 非 hover 设备、reduced-motion、低端设备自动关闭（返回普通 div）。
 */
export function TiltWrap({ children, max = 6, className = '', style }) {
  const caps = useCapability();
  const innerRef = useRef(null);
  const raf = useRef(0);
  const pos = useRef({ rx: 0, ry: 0, x: 0, y: 0 });
  const goal = useRef({ rx: 0, ry: 0 });

  const loop = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    const p = pos.current;
    const g = goal.current;
    p.rx += (g.rx - p.rx) * 0.14;
    p.ry += (g.ry - p.ry) * 0.14;
    p.x += (0 - p.x) * 0.14;
    p.y += (0 - p.y) * 0.14;
    el.style.transform = `rotateX(${p.rx.toFixed(2)}deg) rotateY(${p.ry.toFixed(
      2
    )}deg) translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0)`;

    const settled =
      Math.abs(g.rx - p.rx) < 0.02 &&
      Math.abs(g.ry - p.ry) < 0.02 &&
      Math.abs(p.x) < 0.02 &&
      Math.abs(p.y) < 0.02;

    if (settled) {
      el.style.transform = `rotateX(${g.rx}deg) rotateY(${g.ry}deg)`;
      raf.current = 0;
      return;
    }
    raf.current = requestAnimationFrame(loop);
  }, []);

  const start = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(loop);
  }, [loop]);

  const onPointerMove = useCallback(
    (e) => {
      const el = innerRef.current;
      if (!el || !caps.hover || caps.reduced) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      goal.current.ry = px * max * 2;
      goal.current.rx = -py * max * 2;
      start();
    },
    [caps.hover, caps.reduced, max, start]
  );

  const onPointerLeave = useCallback(() => {
    goal.current.rx = 0;
    goal.current.ry = 0;
    start();
  }, [start]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    []
  );

  const enabled = caps.hover && !caps.reduced;

  return (
    <div
      className={`tilt ${className}`.trim()}
      style={style}
      onPointerMove={enabled ? onPointerMove : undefined}
      onPointerLeave={enabled ? onPointerLeave : undefined}
    >
      <div className="tilt__inner" ref={innerRef}>
        {children}
      </div>
    </div>
  );
}

/** 绕行光圈描边容器（强调型卡片用，不要大面积使用） */
export function ShineBorder({ children, className = '', style }) {
  return (
    <div className={`shine-border ${className}`.trim()} style={style}>
      <div className="shine-border__core">{children}</div>
    </div>
  );
}

/** 悬停时一道斜向反光扫过 */
export function GlareWrap({ children, className = '', style, ...rest }) {
  return (
    <div className={`glare ${className}`.trim()} style={style} {...rest}>
      {children}
    </div>
  );
}

/** 不规则拼贴网格（桌面 6 列，≤900px 自动降为单列） */
export function BentoGrid({ children, className = '' }) {
  return <div className={`bento ${className}`.trim()}>{children}</div>;
}

export function BentoItem({ children, span = 'half', className = '', ...rest }) {
  return (
    <div className={`bento__item bento__item--${span} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
