import { useCallback, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** 代码块：等宽字体 + 语言标签 + 一键复制 */
export function CodeBlock({ code = '', lang = 'text' }) {
  const [done, setDone] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // 剪贴板不可用时降级为选中文本
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* 忽略 */
      }
      document.body.removeChild(ta);
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 1600);
  }, [code]);

  return (
    <div className="codeblock">
      <div className="codeblock__bar">
        <span className="codeblock__lang">{lang}</span>
        <button
          type="button"
          className={`codeblock__copy${done ? ' is-done' : ''}`}
          onClick={copy}
          aria-label={done ? '已复制' : '复制代码'}
        >
          {done ? (
            <Check size={13} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Copy size={13} strokeWidth={1.75} aria-hidden="true" />
          )}
          {done ? '已复制' : '复制'}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
