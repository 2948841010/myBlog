/** 日期 / 数字 / 文本格式化工具 */

const MONTHS = [
  '01', '02', '03', '04', '05', '06',
  '07', '08', '09', '10', '11', '12',
];

/** 2026-08-14 → 2026.08.14 */
export function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${MONTHS[d.getMonth()]}.${String(d.getDate()).padStart(2, '0')}`;
}

/** 2026-08-14 → 08.14 */
export function formatShortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getMonth()]}.${String(d.getDate()).padStart(2, '0')}`;
}

/** 相对时间：3 天前 / 2 个月前 */
export function fromNow(iso) {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return iso;
  const diff = Date.now() - d;
  const day = 86400000;
  if (diff < day) return '今天';
  if (diff < 2 * day) return '昨天';
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))} 个月前`;
  return `${Math.floor(diff / (365 * day))} 年前`;
}

/** 1234 → 1,234 */
export function formatNumber(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 1200 → 1.2k */
export function compactNumber(n) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/** 按中文字符数估算阅读时长（400 字/分钟） */
export function estimateReadingMinutes(text) {
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = (text.match(/[A-Za-z0-9_]+/g) || []).length;
  return Math.max(1, Math.round((cjk + words * 1.6) / 400));
}

/** 序号：1 → 01 */
export function pad2(n) {
  return String(n).padStart(2, '0');
}
