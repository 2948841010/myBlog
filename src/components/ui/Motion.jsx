import { useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1];

/** 滚动进入视口的错峰上浮动画（首屏 & 长列表通用） */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  duration = 0.62,
  className = '',
  amount = 0.15,
  as = 'div',
  ...rest
}) {
  const reduced = useReducedMotion();
  const Comp = motion[as] || motion.div;

  if (reduced) {
    const Static = as;
    return (
      <Static className={className} {...rest}>
        {children}
      </Static>
    );
  }

  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** 只做挂载时一次性入场（用于首屏 hero，不依赖滚动） */
export function Enter({ children, delay = 0, y = 16, className = '', ...rest }) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** 磁吸：鼠标靠近时元素轻微跟随 */
export function Magnetic({ children, strength = 6, className = '', ...rest }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  const onMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el || reduced) return;
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
    },
    [reduced, strength]
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = 'translate3d(0,0,0)';
  }, []);

  return (
    <div
      ref={ref}
      className={`magnetic ${className}`.trim()}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      {...rest}
    >
      {children}
    </div>
  );
}
