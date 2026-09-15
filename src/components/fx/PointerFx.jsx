import { Children, cloneElement, useCallback, useEffect, useRef } from 'react';
import { useCapability } from '../../lib/motion.js';

/**
 * 自定义光标：小圆点快速跟随 + 圆环慢速跟随（lerp），
 * 悬停可交互元素时圆环放大；输入区域自动恢复系统光标。
 * 只在 (hover:hover) 且非 reduced-motion 时挂载。
 */
export function CursorFollower() {
  const caps = useCapability();
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (!caps.ready || !caps.hover || caps.reduced) return undefined;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return undefined;

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let dx = tx;
    let dy = ty;
    let rx = tx;
    let ry = ty;
    let raf = 0;
    let started = false;

    // 圆点几乎贴着指针；圆环保留一点拖尾但明显更快跟手
    const DOT_LERP = 0.72;
    const RING_LERP = 0.36;

    dot.style.opacity = '0';
    ring.style.opacity = '0';

    const loop = () => {
      dx += (tx - dx) * DOT_LERP;
      dy += (ty - dy) * DOT_LERP;
      rx += (tx - rx) * RING_LERP;
      ry += (ty - ry) * RING_LERP;

      const settled =
        Math.abs(tx - dx) < 0.1 &&
        Math.abs(ty - dy) < 0.1 &&
        Math.abs(tx - rx) < 0.1 &&
        Math.abs(ty - ry) < 0.1;

      if (settled) {
        dx = rx = tx;
        dy = ry = ty;
      }

      dot.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
      ring.style.transform = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0)`;

      // 静止即停：避免常驻 rAF 与每帧两次 mix-blend-mode 合成拖慢其它动效
      if (settled) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!started) {
        // 首次出现直接吸附，避免从屏幕中心“飞”到指针位置；
        // 同时此刻才隐藏系统光标，避免出现「两秒内看不见任何光标」的空档
        started = true;
        dx = rx = tx;
        dy = ry = ty;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
        document.body.classList.add('has-fx-cursor');
      }
      kick();
    };

    const onOver = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const field = t.closest('input, textarea, select, [contenteditable="true"]');
      const interactive = t.closest(
        'a, button, [role="button"], [data-cursor="hover"], summary, label'
      );
      ring.classList.toggle('is-hover', Boolean(interactive) && !field);
      if (started) dot.style.opacity = field ? '0' : '1';
    };

    const show = () => {
      if (!started) return;
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    };
    const hide = () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerleave', hide);
    document.addEventListener('pointerenter', show);

    return () => {
      document.body.classList.remove('has-fx-cursor');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerleave', hide);
      document.removeEventListener('pointerenter', show);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [caps.ready, caps.hover, caps.reduced]);

  if (!caps.ready || !caps.hover || caps.reduced) return null;

  return (
    <>
      <span className="fx-cursor" ref={dotRef} aria-hidden="true">
        <span className="fx-cursor__dot" />
      </span>
      <span className="fx-cursor__ring" ref={ringRef} aria-hidden="true" />
    </>
  );
}

/** 磁吸容器：指针靠近时元素向指针偏移，离开后回弹 */
export function MagneticWrap({ children, strength = 10, className = '', style }) {
  const caps = useCapability();
  const ref = useRef(null);
  const raf = useRef(0);
  const cur = useRef({ x: 0, y: 0 });
  const goal = useRef({ x: 0, y: 0 });

  const loop = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cur.current.x += (goal.current.x - cur.current.x) * 0.18;
    cur.current.y += (goal.current.y - cur.current.y) * 0.18;
    el.style.transform = `translate3d(${cur.current.x.toFixed(2)}px, ${cur.current.y.toFixed(
      2
    )}px, 0)`;
    const settled =
      Math.abs(goal.current.x - cur.current.x) < 0.05 &&
      Math.abs(goal.current.y - cur.current.y) < 0.05;
    if (settled) {
      el.style.transform = `translate3d(${goal.current.x}px, ${goal.current.y}px, 0)`;
      raf.current = 0;
      return;
    }
    raf.current = requestAnimationFrame(loop);
  }, []);

  const start = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    []
  );

  const enabled = caps.hover && !caps.reduced;

  return (
    <span
      ref={ref}
      className={`magnetic ${className}`.trim()}
      style={{ display: 'inline-block', ...style }}
      onPointerMove={
        enabled
          ? (e) => {
              const el = ref.current;
              if (!el) return;
              const rect = el.getBoundingClientRect();
              goal.current.x = ((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)) * strength;
              goal.current.y = ((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)) * strength;
              start();
            }
          : undefined
      }
      onPointerLeave={
        enabled
          ? () => {
              goal.current.x = 0;
              goal.current.y = 0;
              start();
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}

/**
 * Dock 放大：竖向列表在指针附近逐项放大并右移（macOS Dock 的纵向版）
 * 用于侧边栏导航，不改动导航结构与层级。
 */
export function Dock({ children, className = '', maxScale = 0.3, push = 12 }) {
  const caps = useCapability();
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const raf = useRef(0);
  const pointerY = useRef(null);

  const apply = useCallback(() => {
    raf.current = 0;
    const rect = listRef.current?.getBoundingClientRect();
    if (!rect || pointerY.current === null) return;
    itemRefs.current.forEach((el) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const center = r.top + r.height / 2;
      const d = pointerY.current - center;
      const falloff = Math.exp(-(d * d) / (2 * 62 * 62));
      const scale = 1 + maxScale * falloff;
      el.style.transform = `translate3d(${(push * falloff).toFixed(2)}px, 0, 0) scale(${scale.toFixed(
        3
      )})`;
    });
  }, [maxScale, push]);

  const onMove = useCallback(
    (e) => {
      if (!caps.hover || caps.reduced) return;
      pointerY.current = e.clientY;
      if (!raf.current) raf.current = requestAnimationFrame(apply);
    },
    [apply, caps.hover, caps.reduced]
  );

  const onLeave = useCallback(() => {
    pointerY.current = null;
    itemRefs.current.forEach((el) => {
      if (el) el.style.transform = '';
    });
  }, []);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    []
  );

  return (
    <div
      ref={listRef}
      className={`dock ${className}`.trim()}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {Children.map(children, (child, i) =>
        child ? (
          <div
            className="dock__item"
            key={child.key ?? i}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
          >
            {cloneElement(child)}
          </div>
        ) : null
      )}
    </div>
  );
}
