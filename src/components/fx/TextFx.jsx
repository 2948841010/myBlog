import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { EASE, EASE_EXPO, useCapability, wordChild, wordsParent } from '../../lib/motion.js';
import { formatNumber } from '../../lib/format.js';

/* ---------------------------------------------------------------------------
   分词：中文按字拆、拉丁词整体保留，空格单独成 token。
   这样中英混排的标题都能得到「逐字/逐词」的遮罩揭示，而不是整句淡入。
   --------------------------------------------------------------------------- */
const CJK = '\\u4e00-\\u9fa5\\u3000-\\u303f\\uff00-\\uffef';
// 注意：`\*词\*` 必须排在第一位，否则星号会被单切成 token，强调色永远不会命中
const TOKEN_RE = new RegExp(`\\*[^*\\s]+\\*|[${CJK}]|[A-Za-z0-9@._#/+-]+|[^\\s]`, 'g');

export function tokenize(text = '') {
  const out = [];
  String(text)
    .split(/(\s+)/)
    .forEach((seg) => {
      if (!seg) return;
      if (/^\s+$/.test(seg)) {
        out.push({ space: true, value: ' ' });
        return;
      }
      const parts = seg.match(TOKEN_RE) || [seg];
      parts.forEach((p) => out.push({ space: false, value: p }));
    });
  return out;
}

/** 文本里用 *星号* 包裹的词会被着色为强调色 */
function isAccent(token) {
  return token.length > 2 && token.startsWith('*') && token.endsWith('*');
}

/**
 * 文字揭示：逐字/逐词从遮罩里上浮 + 模糊消散
 * - variant="mask"     遮罩上浮（标题用）
 * - variant="generate" 原地由模糊变清晰（段落用，字多时更省）
 * - token 超过 72 个自动退化为整块淡入，避免一次启动上百个动画
 */
export function TextReveal({
  text = '',
  as: Tag = 'div',
  className = '',
  variant = 'mask',
  delay = 0,
  step = 0.032,
  amount = 0.35,
}) {
  const caps = useCapability();
  const tokens = useMemo(() => tokenize(text), [text]);
  const heavy = tokens.length > 72;

  if (caps.reduced || heavy) {
    return (
      <Tag className={className}>
        <motion.span
          style={{ display: 'inline' }}
          initial={caps.reduced ? false : { opacity: 0, y: 14, filter: 'blur(6px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount }}
          transition={{ duration: 0.7, delay, ease: EASE }}
        >
          {text}
        </motion.span>
      </Tag>
    );
  }

  return (
    <Tag className={className}>
      <motion.span
        style={{ display: 'inline' }}
        variants={wordsParent(step, delay)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount }}
      >
        {tokens.map((t, i) =>
          t.space ? (
            <span key={`s-${i}`}> </span>
          ) : (
            <span className="txt-mask" key={`${t.value}-${i}`}>
              <motion.span
                className={`txt-mask__inner${isAccent(t.value) ? ' text-accent' : ''}`}
                variants={
                  variant === 'generate'
                    ? {
                        hidden: { opacity: 0, y: 0, filter: 'blur(10px)' },
                        show: {
                          opacity: 1,
                          y: 0,
                          filter: 'blur(0px)',
                          transition: { duration: 0.72, ease: EASE_EXPO },
                        },
                      }
                    : wordChild
                }
              >
                {isAccent(t.value) ? t.value.slice(1, -1) : t.value}
              </motion.span>
            </span>
          )
        )}
      </motion.span>
    </Tag>
  );
}

/** 单词轮播：hero 里做「循环切换关键词」 */
export function FlipWords({ words = [], interval = 2600, className = '' }) {
  const caps = useCapability();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (caps.reduced || words.length < 2) return undefined;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => window.clearInterval(t);
  }, [caps.reduced, interval, words.length]);

  if (!words.length) return null;

  return (
    <span className={`flipwords ${className}`.trim()}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[index]}
          className="flipwords__word"
          initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -18, filter: 'blur(8px)' }}
          transition={{ duration: 0.46, ease: EASE }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*<>/\\';

/** 乱码定形：hover 时字符抖动后还原（只用于很短的字符串，如品牌名） */
export function HyperText({ text = '', className = '', duration = 520 }) {
  const caps = useCapability();
  const [display, setDisplay] = useState(text);
  const timer = useRef(0);

  useEffect(() => setDisplay(text), [text]);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const onEnter = useCallback(() => {
    if (caps.reduced || caps.lowEnd) return;
    window.clearInterval(timer.current);
    const start = performance.now();
    timer.current = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const progress = Math.min(1, elapsed / duration);
      const revealed = Math.floor(progress * text.length);
      setDisplay(
        text
          .split('')
          .map((ch, i) => {
            if (i < revealed || ch === ' ') return ch;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join('')
      );
      if (progress >= 1) {
        window.clearInterval(timer.current);
        setDisplay(text);
      }
    }, 34);
  }, [caps.lowEnd, caps.reduced, duration, text]);

  return (
    <span className={`hyper ${className}`.trim()} onPointerEnter={onEnter}>
      {display}
    </span>
  );
}

/** 高光扫过的文字 */
export function ShimmerText({ children, className = '' }) {
  return <span className={`shimmer-text ${className}`.trim()}>{children}</span>;
}

/** 数字滚动：进入视口后从 0 递增到目标值（rAF + easeOutExpo，跑完即停） */
export function NumberTicker({
  value = 0,
  decimals = 0,
  suffix = '',
  prefix = '',
  duration = 1500,
  className = '',
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const caps = useCapability();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    if (caps.reduced) {
      setCurrent(value);
      return undefined;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setCurrent(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, caps.reduced]);

  const shown =
    decimals > 0
      ? current.toFixed(decimals)
      : formatNumber(Math.round(current));

  return (
    <span ref={ref} className={`ticker ${className}`.trim()}>
      {prefix}
      {shown}
      {suffix}
    </span>
  );
}
