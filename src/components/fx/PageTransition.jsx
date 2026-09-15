import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EASE_SOFT, useCapability } from '../../lib/motion.js';

/**
 * 路由转场：切换路由时一组「信号条」从中心张开再收回（快门式遮罩）。
 * - 不拦截导航，因此前进/后退、刷新、深链都不受影响
 * - reduced-motion 下完全不出现
 * - 只保留 1 条强调色，其余为中性面板，避免每次跳转都在闪橙色
 * - 想彻底关掉：把 AppShell 里的 <RouteWipe /> 移除即可
 */
export function RouteWipe({ panels = 4, duration = 0.56 }) {
  const { pathname } = useLocation();
  const caps = useCapability();
  const [runId, setRunId] = useState(0);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (caps.reduced) return;
    setRunId((n) => n + 1);
  }, [pathname, caps.reduced]);

  useEffect(() => {
    if (!runId) return undefined;
    const t = window.setTimeout(() => setRunId(0), duration * 1000 + 220);
    return () => window.clearTimeout(t);
  }, [runId, duration]);

  if (!runId || caps.reduced) return null;

  return (
    <div className="fx-wipe" key={runId} aria-hidden="true">
      {Array.from({ length: panels }).map((_, i) => (
        <motion.span
          key={i}
          className={`fx-wipe__panel${i === 1 ? ' fx-wipe__panel--b' : ' fx-wipe__panel--a'}`}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: [0, 1, 1, 0] }}
          transition={{
            duration,
            times: [0, 0.28, 0.5, 1],
            delay: i * 0.045,
            ease: EASE_SOFT,
          }}
        />
      ))}
    </div>
  );
}
