import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, CornerDownLeft, Layers, FileText, Inbox } from 'lucide-react';
import { NAV_ITEMS } from '../../config/site.js';
import { useUI } from '../../store/index.jsx';
import { useDebounced, useLockBodyScroll } from '../../lib/hooks.js';
import { searchAll } from '../../api/index.js';

const TYPE_ICON = {
  page: null,
  post: FileText,
  series: Layers,
};

/** ⌘K / Ctrl+K 命令面板：全局搜索文章、系列与页面 */
export function CommandPalette() {
  const { paletteOpen, closePalette } = useUI();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [active, setActive] = useState(0);
  const debounced = useDebounced(query, 200);

  useLockBodyScroll(paletteOpen);

  useEffect(() => {
    if (!paletteOpen) return;
    setQuery('');
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [paletteOpen]);

  useEffect(() => {
    if (!paletteOpen) return undefined;
    let alive = true;
    searchAll(debounced).then((res) => {
      if (alive) {
        setHits(res.data || []);
        setActive(0);
      }
    });
    return () => {
      alive = false;
    };
  }, [debounced, paletteOpen]);

  const pages = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        type: 'page',
        title: item.label,
        sub: '页面',
        to: item.to,
        icon: item.icon,
      })),
    []
  );

  const list = query.trim() ? hits : [...pages, ...hits];

  const go = (item) => {
    if (!item) return;
    closePalette();
    navigate(item.to);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(list.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(list[active]);
    }
  };

  return (
    <AnimatePresence>
      {paletteOpen ? (
        <>
          <motion.div
            className="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closePalette}
          />
          <motion.div
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label="搜索"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="palette__input-row">
              <Search size={18} strokeWidth={1.75} className="text-dim" aria-hidden="true" />
              <input
                ref={inputRef}
                className="palette__input"
                placeholder="搜索文章标题、标签或系列…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                aria-label="搜索关键词"
              />
              <kbd>ESC</kbd>
            </div>

            <div className="palette__list">
              {list.length === 0 ? (
                <div className="empty-state" style={{ border: 0, padding: '48px 16px' }}>
                  <span className="empty-state__icon">
                    <Inbox size={20} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div className="empty-state__title">没有匹配结果</div>
                  <p className="empty-state__desc">
                    试试「MCP」「上下文」或「评测」这类关键词。
                  </p>
                </div>
              ) : (
                list.map((item, i) => {
                  const Icon = item.icon || TYPE_ICON[item.type] || FileText;
                  return (
                    <button
                      key={`${item.type}-${item.to}-${i}`}
                      type="button"
                      className={`palette__item${i === active ? ' is-active' : ''}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                    >
                      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                      <span className="grow">
                        <span className="palette__item-title" style={{ display: 'block' }}>
                          {item.title}
                        </span>
                        <span className="palette__item-sub">{item.sub}</span>
                      </span>
                      <CornerDownLeft size={14} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  );
                })
              )}
            </div>

            <div className="palette__foot">
              <span className="row" style={{ gap: 12 }}>
                <span className="row" style={{ gap: 4 }}>
                  <kbd>↑</kbd>
                  <kbd>↓</kbd> 选择
                </span>
                <span className="row" style={{ gap: 4 }}>
                  <kbd>↵</kbd> 打开
                </span>
              </span>
              <span>{list.length} 条结果</span>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
