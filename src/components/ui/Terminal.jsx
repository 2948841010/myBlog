import { useEffect, useRef, useState } from 'react';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 终端窗口容器
 * React 19 起函数组件可直接接收 ref（不再是保留属性），这里显式解构后落到根节点上，
 * 供 TypedTerminal 做「离屏暂停」的 IntersectionObserver 观察。
 * @param {{title?: string, children: any, className?: string, ref?: any}} props
 */
export function Terminal({
  title = 'bash — linwei@agent-dev',
  children,
  className = '',
  ref,
  ...rest
}) {
  return (
    <div ref={ref} className={`terminal ${className}`.trim()} {...rest}>
      <div className="terminal__bar">
        <span className="terminal__dots" aria-hidden="true">
          <span className="terminal__dot" />
          <span className="terminal__dot" />
          <span className="terminal__dot" />
        </span>
        <span className="terminal__title">{title}</span>
      </div>
      <div className="terminal__body">{children}</div>
    </div>
  );
}

/**
 * 打字机逐行输出
 * lines: [{ cmd: string, out?: string }]
 * - loop：打完一轮后清屏重打（默认关闭）
 * - 打完最后一行为「空闲」态：末行下方保留一个空提示符 + 闪烁光标，像真的在等输入
 * - 视口外自动暂停（不产生 setState），reduced-motion 下直接输出全文且不循环
 */
export function TypedTerminal({
  lines = [],
  title,
  className = '',
  loop = false,
  holdMs = 3400,
  charDelay = 34,
  startDelay = 420,
}) {
  const [revealed, setRevealed] = useState(() => lines.map(() => 0));
  const [showOut, setShowOut] = useState(() => lines.map(() => false));
  const [cursor, setCursor] = useState(0);

  const rootRef = useRef(null);
  const inViewRef = useRef(true);

  // 视口外暂停：只改 ref，不触发重渲染，避免打断正在进行的打字流程
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        inViewRef.current = entries.some((e) => e.isIntersecting);
      },
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const perChar = reduced ? 0 : charDelay;

    const reset = () => {
      setRevealed(lines.map(() => 0));
      setShowOut(lines.map(() => false));
      setCursor(0);
    };

    const waitUntilVisible = async () => {
      while (!cancelled && !inViewRef.current) await wait(220);
    };

    const run = async () => {
      if (perChar) await wait(startDelay);

      for (;;) {
        for (let i = 0; i < lines.length; i += 1) {
          if (cancelled) return;
          await waitUntilVisible();
          if (cancelled) return;

          setCursor(i);
          const text = lines[i].cmd || '';
          for (let c = 1; c <= text.length; c += 1) {
            if (cancelled) return;
            setRevealed((prev) => {
              const next = prev.slice();
              next[i] = c;
              return next;
            });
            if (perChar) await wait(perChar);
          }

          if (perChar) await wait(260);
          if (cancelled) return;
          setShowOut((prev) => {
            const next = prev.slice();
            next[i] = true;
            return next;
          });
          if (perChar) await wait(460);
        }

        if (cancelled) return;
        setCursor(lines.length); // 进入空闲态

        if (!loop || reduced) return;

        await wait(holdMs);
        if (cancelled) return;
        reset();
        await wait(320);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [lines, loop, holdMs, charDelay, startDelay]);

  const activeLine = cursor < lines.length ? cursor : -1;
  const idle = cursor >= lines.length;

  return (
    <Terminal title={title} className={className} ref={rootRef}>
      {lines.map((l, i) => (
        <div key={`${l.cmd}-${i}`}>
          <div className="terminal__line">
            <span className="terminal__prompt">$</span>
            <span>
              {l.cmd.slice(0, revealed[i])}
              {activeLine === i ? <span className="caret" aria-hidden="true" /> : null}
            </span>
          </div>
          {l.out && showOut[i] ? (
            <div className="terminal__line">
              <span className="terminal__prompt" style={{ opacity: 0.35 }}>
                ›
              </span>
              <span className="terminal__out">{l.out}</span>
            </div>
          ) : null}
        </div>
      ))}

      {idle ? (
        <div className="terminal__line">
          <span className="terminal__prompt">$</span>
          <span className="caret" aria-hidden="true" />
        </div>
      ) : null}
    </Terminal>
  );
}
