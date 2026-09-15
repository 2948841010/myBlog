/**
 * 极简 Markdown → React 渲染器（零依赖）
 * 支持：## / ### 标题、段落、无序/有序列表、围栏代码块、引用、表格、分隔线、
 *       行内 `code` / **粗体** / *斜体* / [链接](url)
 *
 * 说明：标题 id 使用顺序编号（sec-1、sec-2…），避免中文 slug 的不确定性，
 *       TOC 与正文锚点共用同一份编号结果。
 */

const HEADING_RE = /^(#{2,4})\s+(.*)$/;
const UL_RE = /^\s*[-*]\s+/;
const OL_RE = /^\s*\d+[.)]\s+/;
const TABLE_DIVIDER_RE = /^\|[\s:|-]+\|$/;

function isBlockStart(line) {
  const t = line.trim();
  if (!t) return true;
  if (t.startsWith('```')) return true;
  if (HEADING_RE.test(t)) return true;
  if (t.startsWith('>')) return true;
  if (t.startsWith('|')) return true;
  if (UL_RE.test(line)) return true;
  if (OL_RE.test(line)) return true;
  if (/^-{3,}$/.test(t)) return true;
  return false;
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

const INLINE_RE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;

/** 行内解析 → React 节点数组 */
export function parseInline(text = '', keyPrefix = 'in') {
  const nodes = [];
  let last = 0;
  let k = 0;
  let m;

  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    const key = `${keyPrefix}-${k++}`;

    if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      const link = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(token);
      if (link) {
        nodes.push(
          <a
            key={key}
            href={link[2]}
            target={link[2].startsWith('http') ? '_blank' : undefined}
            rel={link[2].startsWith('http') ? 'noreferrer' : undefined}
          >
            {link[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    }
    last = m.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Markdown → block 数组 */
export function parseMarkdown(md = '') {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // 围栏代码块
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim() || 'text';
      i += 1;
      const buf = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'code', lang, code: buf.join('\n') });
      continue;
    }

    // 标题
    const h = HEADING_RE.exec(line.trim());
    if (h) {
      const level = h[1].length;
      blocks.push({ type: level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4', text: h[2].trim() });
      i += 1;
      continue;
    }

    // 分隔线
    if (/^-{3,}$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    // 引用
    if (line.trim().startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', lines: buf });
      continue;
    }

    // 表格
    if (line.trim().startsWith('|') && TABLE_DIVIDER_RE.test((lines[i + 1] || '').trim())) {
      const header = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    // 无序列表
    if (UL_RE.test(line)) {
      const items = [];
      while (i < lines.length && UL_RE.test(lines[i])) {
        items.push(lines[i].replace(UL_RE, ''));
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // 有序列表
    if (OL_RE.test(line)) {
      const items = [];
      while (i < lines.length && OL_RE.test(lines[i])) {
        items.push(lines[i].replace(OL_RE, ''));
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // 段落
    const buf = [line.trim()];
    i += 1;
    while (i < lines.length && !isBlockStart(lines[i])) {
      buf.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: 'p', text: buf.join(' ') });
  }

  // 统一分配标题锚点 id
  let n = 0;
  blocks.forEach((b) => {
    if (b.type === 'h2' || b.type === 'h3' || b.type === 'h4') {
      n += 1;
      b.id = `sec-${n}`;
    }
  });

  return blocks;
}

/** 从 Markdown 中提取 h2/h3 标题，用于目录 */
export function extractHeadings(md = '') {
  return parseMarkdown(md)
    .filter((b) => b.type === 'h2' || b.type === 'h3')
    .map((b) => ({ id: b.id, text: b.text, level: b.type === 'h2' ? 2 : 3 }));
}

/** Markdown → React（标题带锚点 id，供 TOC 跳转）
 *  codeComponent：可选，用于替换代码块渲染（传入 CodeBlock 即可获得复制按钮）
 */
export function Markdown({ content, className = 'prose', codeComponent }) {
  const blocks = parseMarkdown(content);

  return (
    <div className={className}>
      {blocks.map((b, idx) => {
        const key = `${b.type}-${idx}`;
        switch (b.type) {
          case 'h2':
            return (
              <h2 key={key} id={b.id}>
                {parseInline(b.text, key)}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={key} id={b.id}>
                {parseInline(b.text, key)}
              </h3>
            );
          case 'h4':
            return <h4 key={key} id={b.id}>{parseInline(b.text, key)}</h4>;
          case 'ul':
            return (
              <ul key={key}>
                {b.items.map((it, j) => (
                  <li key={j}>{parseInline(it, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={key}>
                {b.items.map((it, j) => (
                  <li key={j}>{parseInline(it, `${key}-${j}`)}</li>
                ))}
              </ol>
            );
          case 'quote':
            return (
              <blockquote key={key}>
                {b.lines.map((l, j) => (
                  <p key={j}>{parseInline(l, `${key}-${j}`)}</p>
                ))}
              </blockquote>
            );
          case 'code':
            // 页面可传入 codeComponent（如 CodeBlock）以获得复制按钮
            if (codeComponent) {
              const Custom = codeComponent;
              return <Custom key={key} code={b.code} lang={b.lang} />;
            }
            return (
              <div className="codeblock" key={key}>
                <div className="codeblock__bar">
                  <span className="codeblock__lang">{b.lang}</span>
                </div>
                <pre>
                  <code>{b.code}</code>
                </pre>
              </div>
            );
          case 'table':
            return (
              <table key={key}>
                <thead>
                  <tr>
                    {b.header.map((c, j) => (
                      <th key={j}>{parseInline(c, `${key}-h-${j}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, j) => (
                    <tr key={j}>
                      {r.map((c, k2) => (
                        <td key={k2}>{parseInline(c, `${key}-${j}-${k2}`)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          case 'hr':
            return <hr key={key} />;
          default:
            return <p key={key}>{parseInline(b.text, key)}</p>;
        }
      })}
    </div>
  );
}
