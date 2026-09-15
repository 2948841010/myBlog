import { useEffect, useState } from 'react';

/* ============================================================================
   动效配置：全站唯一的缓动 / 变体 / 弹簧来源。
   纪律：只动 transform 与 opacity；所有缓动用自定义 cubic-bezier；
        所有入场动画一律 once，禁止在滚动回调里 setState。
   ============================================================================ */

export const EASE = [0.22, 1, 0.36, 1]; // 主缓动（expo-out 感）
export const EASE_EXPO = [0.16, 1, 0.3, 1]; // 更强的出场
export const EASE_SOFT = [0.32, 0.72, 0, 1]; // 厚重、有质量感
export const EASE_IN_OUT = [0.65, 0, 0.35, 1];

export const SPRING_SOFT = { type: 'spring', stiffness: 220, damping: 28, mass: 0.9 };
export const SPRING_SNAPPY = { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 };
export const SPRING_SLOW = { type: 'spring', stiffness: 90, damping: 24, mass: 1.1 };

/** 错峰延迟（带上限，避免第 30 个元素等 3 秒） */
export const stagger = (i, step = 0.06, max = 0.6) => Math.min(i * step, max);

/** 逐词上浮：父容器 + 子项 */
export const wordsParent = (staggerChildren = 0.045, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});

export const wordChild = {
  hidden: { opacity: 0, y: '0.7em', filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.78, ease: EASE_EXPO },
  },
};

export const fadeUpVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: EASE } },
};

/* ---------------------------------------------------------------------------
   设备能力检测：hover / reduced-motion / 低端设备 / WebGL 可用性
   所有重度动效（3D、自定义光标、聚光跟随）都必须先过这一关。
   --------------------------------------------------------------------------- */
const DEFAULT_CAPS = {
  hover: false,
  reduced: false,
  lowEnd: false,
  webgl: true,
  ready: false,
};

export function useCapability() {
  const [caps, setCaps] = useState(DEFAULT_CAPS);

  useEffect(() => {
    const mqHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const read = () => {
      const cores = navigator.hardwareConcurrency || 8;
      const memory = navigator.deviceMemory || 8;
      let webgl = false;
      try {
        const canvas = document.createElement('canvas');
        webgl = Boolean(
          window.WebGLRenderingContext &&
            (canvas.getContext('webgl2') || canvas.getContext('webgl'))
        );
      } catch {
        webgl = false;
      }
      setCaps({
        hover: mqHover.matches,
        reduced: mqReduced.matches,
        lowEnd: cores <= 4 || memory <= 4 || window.innerWidth < 900,
        webgl,
        ready: true,
      });
    };

    read();
    mqHover.addEventListener('change', read);
    mqReduced.addEventListener('change', read);
    window.addEventListener('resize', read);
    return () => {
      mqHover.removeEventListener('change', read);
      mqReduced.removeEventListener('change', read);
      window.removeEventListener('resize', read);
    };
  }, []);

  return caps;
}

/** 首屏之后（浏览器空闲）再返回 true —— 用于延迟初始化 WebGL 等重资产 */
export function useAfterIdle(timeout = 1400) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setReady(true), { timeout });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(() => setReady(true), timeout);
    return () => window.clearTimeout(t);
  }, [timeout]);
  return ready;
}

/** 元素是否进入过视口（只触发一次，用于启动/暂停 canvas 与 3D 渲染循环） */
export function useInViewOnce(ref, rootMargin = '120px') {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, seen]);
  return seen;
}

/** 标签页是否可见（隐藏时暂停动画循环） */
export function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}
