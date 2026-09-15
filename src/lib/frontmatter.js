/* ============================================================================
   lib/frontmatter.js —— 极简 YAML frontmatter 读写（零依赖）

   刻意只支持「key: value」单行语法，够用且不会出错：
     字符串 / 数字 / true|false / null|~ / [a, b, c] / 单双引号包裹
   不支持嵌套对象与多行块。需要表达 cover 这类结构时，
   用 coverFrom / coverTo / coverPattern 这样的扁平键，在业务层组装。

   为什么不用 js-yaml：
     博客只是给自己写文章，多一个依赖就多一份体积和升级负担；
     而且嵌套 YAML 正是最容易写错、最难排查的部分。
   ============================================================================ */

const DELIM_RE = /^---\s*$/;
/** 需要加引号的值：含 YAML 特殊字符，或首尾有空白 */
const NEEDS_QUOTE_RE = /[:#[\]{},"'|>&*!%@`]/;
/** 纯数字（含负号与小数），用于数字还原 */
const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

/** 单个标量值 → JS 值 */
function parseScalar(raw) {
  const s = String(raw).trim();
  if (!s) return '';

  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(',')
      .map((part) => parseScalar(part))
      .filter((v) => v !== '');
  }

  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;

  const quoted =
    (s.startsWith('"') && s.endsWith('"') && s.length > 1) ||
    (s.startsWith("'") && s.endsWith("'") && s.length > 1);
  if (quoted) return s.slice(1, -1);

  if (NUMERIC_RE.test(s)) return Number(s);
  return s;
}

/** JS 值 → frontmatter 里的字符串 */
function formatScalar(value) {
  if (Array.isArray(value)) {
    return `[${value.map((v) => formatScalar(v)).join(', ')}]`;
  }
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);

  const s = String(value);
  if (!s) return '';
  if (NEEDS_QUOTE_RE.test(s) || s !== s.trim()) return JSON.stringify(s);
  return s;
}

/**
 * 解析带 frontmatter 的 markdown
 * @param {string} raw 文件原文
 * @returns {{ data: Record<string, any>, body: string, hasFrontmatter: boolean }}
 */
export function parseFrontmatter(raw = '') {
  const text = String(raw).replace(/\r\n/g, '\n');
  const lines = text.split('\n');

  if (lines.length === 0 || !DELIM_RE.test(lines[0].trim())) {
    return { data: {}, body: text, hasFrontmatter: false };
  }

  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (DELIM_RE.test(lines[i].trim())) {
      end = i;
      break;
    }
  }
  // 只有起始分隔符，视为没有 frontmatter（避免把正文吞掉）
  if (end === -1) return { data: {}, body: text, hasFrontmatter: false };

  const data = {};
  for (let i = 1; i < end; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colon = line.indexOf(':');
    if (colon === -1) continue;

    const key = line.slice(0, colon).trim();
    if (!key) continue;
    data[key] = parseScalar(line.slice(colon + 1));
  }

  return {
    data,
    body: lines.slice(end + 1).join('\n').replace(/^\n+/, ''),
    hasFrontmatter: true,
  };
}

/**
 * 组装带 frontmatter 的 markdown 文本
 * @param {Record<string, any>} data
 * @param {string} body
 * @param {string[]} [order] 期望的键顺序，未列出的键按原顺序附在后面
 */
export function stringifyFrontmatter(data = {}, body = '', order = []) {
  const keys = [
    ...order.filter((k) => k in data),
    ...Object.keys(data).filter((k) => !order.includes(k)),
  ];

  const head = keys
    .map((k) => `${k}: ${formatScalar(data[k])}`)
    .filter((line) => !line.endsWith(': '))
    .join('\n');

  const trimmedBody = String(body).replace(/\s+$/, '');
  return `---\n${head}\n---\n\n${trimmedBody}\n`;
}

/** 文件名安全化：只保留字母数字、连字符与中文，用作 slug 兜底 */
export function slugify(input = '') {
  const s = String(input).trim();
  if (!s) return '';
  return s
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}
