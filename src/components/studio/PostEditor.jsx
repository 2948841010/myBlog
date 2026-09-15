import { useMemo, useRef, useState } from 'react';
import {
  Bold,
  Code,
  Columns2,
  Eye,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pencil,
  Quote,
  Table,
  Terminal,
} from 'lucide-react';
import { CodeBlock } from '../ui/CodeBlock.jsx';
import { IconButton } from '../ui/Button.jsx';
import { Markdown } from '../../lib/markdown.jsx';
import { estimateReadingMinutes } from '../../lib/format.js';
import { PostMeta } from './PostMeta.jsx';

/* ============================================================================
   components/studio/PostEditor.jsx —— 正文编辑器
   左写右看，预览用的就是详情页那套 Markdown 渲染器与 CodeBlock，
   所以预览里长什么样，发出去就长什么样。
   ============================================================================ */

const TABLE_SKELETON = ['| 列一 | 列二 |', '| --- | --- |', '| 值 | 值 |'].join('\n');

const VIEW_MODES = [
  { key: 'split', label: '分栏', icon: Columns2 },
  { key: 'edit', label: '仅编辑', icon: Pencil },
  { key: 'preview', label: '仅预览', icon: Eye },
];

/* ------------------------------ 光标处的编辑操作 ------------------------------ */

/** 给选中的每一行加前缀（用于列表、引用、标题） */
function withLinePrefix(value, start, end, prefix) {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEndIdx = value.indexOf('\n', end);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const block = value.slice(lineStart, lineEnd);
  const prefixed = block
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
  return {
    next: value.slice(0, lineStart) + prefixed + value.slice(lineEnd),
    caret: lineStart + prefixed.length,
  };
}

/** 用标记包裹选区（粗体、斜体、行内代码、链接） */
function withWrap(value, start, end, before, after, placeholder) {
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  return { next, caret: start + before.length + selected.length + after.length };
}

/** 插入独立的块（代码块、表格、分隔线），自动补空行 */
function withBlock(value, start, end, text) {
  const needsLeading = start > 0 && value[start - 1] !== '\n';
  const payload = `${needsLeading ? '\n\n' : ''}${text}\n`;
  return { next: value.slice(0, start) + payload + value.slice(end), caret: start + payload.length };
}

const OPS = {
  h2: (v, s, e) => withLinePrefix(v, s, e, '## '),
  h3: (v, s, e) => withLinePrefix(v, s, e, '### '),
  bold: (v, s, e) => withWrap(v, s, e, '**', '**', '粗体'),
  italic: (v, s, e) => withWrap(v, s, e, '*', '*', '斜体'),
  code: (v, s, e) => withWrap(v, s, e, '`', '`', '代码'),
  link: (v, s, e) => withWrap(v, s, e, '[', '](https://)', '链接文字'),
  ul: (v, s, e) => withLinePrefix(v, s, e, '- '),
  ol: (v, s, e) => withLinePrefix(v, s, e, '1. '),
  quote: (v, s, e) => withLinePrefix(v, s, e, '> '),
  codeblock: (v, s, e) => withBlock(v, s, e, '```bash\n\n```'),
  table: (v, s, e) => withBlock(v, s, e, TABLE_SKELETON),
  hr: (v, s, e) => withBlock(v, s, e, '---'),
};

const TOOLBAR = [
  [
    { key: 'h2', label: '二级标题', icon: Heading2 },
    { key: 'h3', label: '三级标题', icon: Heading3 },
  ],
  [
    { key: 'bold', label: '粗体', icon: Bold },
    { key: 'italic', label: '斜体', icon: Italic },
    { key: 'code', label: '行内代码', icon: Code },
    { key: 'link', label: '链接', icon: Link2 },
  ],
  [
    { key: 'ul', label: '无序列表', icon: List },
    { key: 'ol', label: '有序列表', icon: ListOrdered },
    { key: 'quote', label: '引用', icon: Quote },
  ],
  [
    { key: 'codeblock', label: '代码块', icon: Terminal },
    { key: 'table', label: '表格', icon: Table },
    { key: 'hr', label: '分隔线', icon: Minus },
  ],
];

export function PostEditor({ draft, onChange, seriesList = [] }) {
  const [view, setView] = useState('split');
  const [metaOpen, setMetaOpen] = useState(false);
  const textareaRef = useRef(null);

  const words = useMemo(() => (draft.content || '').length, [draft.content]);
  const minutes = useMemo(() => estimateReadingMinutes(draft.content || ''), [draft.content]);

  const runOp = (key) => {
    const ta = textareaRef.current;
    const op = OPS[key];
    if (!ta || !op) return;
    const { next, caret } = op(ta.value, ta.selectionStart, ta.selectionEnd);
    onChange({ content: next });
    window.requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="seditor">
      <div className="seditor__head">
        <input
          className="seditor__title"
          value={draft.title}
          placeholder="文章标题"
          aria-label="文章标题"
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <button
          type="button"
          className={`seditor__meta-toggle${metaOpen ? ' is-open' : ''}`}
          onClick={() => setMetaOpen((v) => !v)}
          aria-expanded={metaOpen}
        >
          {metaOpen ? '收起文章设置' : '展开文章设置'}
        </button>
      </div>

      {metaOpen ? (
        <div className="seditor__meta">
          <PostMeta draft={draft} onChange={onChange} seriesList={seriesList} />
        </div>
      ) : null}

      <div className="seditor__toolbar" role="toolbar" aria-label="Markdown 工具栏">
        {TOOLBAR.map((group, gi) => (
          <div className="seditor__group" key={gi}>
            {group.map((item) => (
              <IconButton
                key={item.key}
                icon={item.icon}
                label={item.label}
                size="sm"
                iconSize={16}
                onClick={() => runOp(item.key)}
              />
            ))}
          </div>
        ))}

        <div className="seditor__modes">
          {VIEW_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`seditor__mode${view === m.key ? ' is-active' : ''}`}
              onClick={() => setView(m.key)}
            >
              <m.icon size={14} strokeWidth={1.75} aria-hidden="true" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`seditor__panes seditor__panes--${view}`}>
        {view !== 'preview' ? (
          <div className="seditor__pane">
            <textarea
              ref={textareaRef}
              className="seditor__input"
              value={draft.content}
              placeholder={'## 从一个小标题开始\n\n正文……'}
              spellCheck="false"
              aria-label="Markdown 正文"
              onChange={(e) => onChange({ content: e.target.value })}
            />
          </div>
        ) : null}

        {view !== 'edit' ? (
          <div className="seditor__pane">
            <div className="seditor__preview">
              {draft.content.trim() ? (
                <Markdown content={draft.content} codeComponent={CodeBlock} />
              ) : (
                <p className="seditor__preview-empty">左边写点什么，这里就会实时渲染出来。</p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="seditor__foot">
        <span className="seditor__stat">{words} 字符</span>
        <span className="seditor__stat">约 {minutes} 分钟读完</span>
        <span className="seditor__foot-hint">
          语法：## 标题 · - 列表 · &gt; 引用 · ``` 代码块 · | 表格 ·
          **粗体** · `代码`
        </span>
      </div>
    </div>
  );
}
