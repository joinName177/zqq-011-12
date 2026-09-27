/**
 * 统一文本 / 数值格式层（domain 基础口径）。
 *
 * 屏幕天气图、气压带、预警指南、导出/分享共用此处的同一套口径，
 * 避免日期、时区、舍入、编码与容量保护在不同输出之间各自为政。
 */

/** 领域安全边界：所有入口（录入 / 恢复 / 导出）都以此为准 */
export const MOOD_LIMITS = {
  pressureMin: 960,
  pressureMax: 1045,
  tempMin: -30,
  tempMax: 50,
  humidityMin: 0,
  humidityMax: 100,
  intensityMin: 1,
  intensityMax: 10,
  windSpeedMin: 0,
  windSpeedMax: 200,
  windDegMin: 0,
  windDegMax: 360,
  noteMaxLength: 280,
  /** 导出 / 分享单条快照的容量保护 */
  maxExportRecords: 366,
  maxExportBytes: 64 * 1024
} as const;

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

/** 整数舍入口径 */
export function roundWhole(value: number): number {
  return Math.round(value);
}

/** 保留一位小数的口径（强度均值等） */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** 保留一位小数的展示文本（缺失时安全回退） */
export function formatDecimal1(value: number): string {
  return Number.isFinite(value) ? round1(value).toFixed(1) : '—';
}

/** 以本地时区生成 / 格式化 YYYY-MM-DD（全应用唯一日期格式） */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 严格校验 YYYY-MM-DD，拒绝非法日期（如 2026-13-40） */
export function isValidDateKey(key: unknown): key is string {
  if (typeof key !== 'string' || !ISO_DATE_RE.test(key)) return false;
  const [y, m, d] = key.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const probe = new Date(y, m - 1, d);
  return probe.getFullYear() === y && probe.getMonth() === m - 1 && probe.getDate() === d;
}

/** 任意输入归一化为安全日期键；非法时回退到本地今天 */
export function safeDateKey(input: unknown, fallback: Date = new Date()): string {
  return isValidDateKey(input) ? input : toLocalDateKey(fallback);
}

/** 今天的本地日期键 */
export function todayKey(now: Date = new Date()): string {
  return toLocalDateKey(now);
}

/** HTML 转义：天气图 / 指南等所有富文本出口共用 */
export function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(
    /[&<>'"]/g,
    t =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t)
  );
}

/** 纯文本出口（分享 / 导出 / textContent）：统一裁剪空白并收敛超长注记 */
export function normalizeNote(note: unknown): string {
  const text = String(note ?? '').replace(/\s+$/g, '');
  return text.length > MOOD_LIMITS.noteMaxLength
    ? text.slice(0, MOOD_LIMITS.noteMaxLength)
    : text;
}

/** FNV-1a（32 位）校验和，用于导出快照的完整性校验；无需依赖外部库 */
export function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return ('0000000' + (hash >>> 0).toString(16)).slice(-8);
}
