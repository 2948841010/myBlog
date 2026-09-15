import { Suspense, lazy, useRef } from 'react';
import { useAfterIdle, useCapability, useInViewOnce } from '../../lib/motion.js';

/* three.js 单独成 chunk：只有真正要渲染时才下载 */
const Hero3D = lazy(() => import('./Hero3D.jsx'));

/**
 * 3D 层的加载闸门。
 * 只有同时满足「已检测能力 / 支持 WebGL / 非 reduced-motion / 非低端设备 / 已过首屏空闲」
 * 才动态加载 three 并挂载；否则直接呈现静态渐变兜底。
 */
export function Hero3DLazy({ className = '', idleTimeout = 1400 }) {
  const caps = useCapability();
  const idleReady = useAfterIdle(idleTimeout);
  const ref = useRef(null);
  const inView = useInViewOnce(ref, '200px');

  const enabled =
    caps.ready && caps.webgl && !caps.reduced && !caps.lowEnd && idleReady;

  return (
    <div
      ref={ref}
      className={`hero3d${enabled ? '' : ' hero3d--fallback'} ${className}`.trim()}
      aria-hidden="true"
    >
      {enabled && inView ? (
        <Suspense fallback={null}>
          <Hero3D />
        </Suspense>
      ) : null}
    </div>
  );
}

export default Hero3DLazy;
