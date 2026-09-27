import type { MoodRecord, SynopticChartData } from './models';
import { computeStatistics } from './meteorology-engine';

export interface MoodSummary {
  count: number;
  averageIntensity: number;
  tags: string[];
  dominant: string;
}

/**
 * 摘要与天气图 / 气压带 / 导出共用 computeStatistics 的同一口径，
 * 不再独立实现频次排序与舍入。
 */
export function summarizeMood(records: readonly MoodRecord[]): MoodSummary {
  const s = computeStatistics(records);
  return {
    count: s.recordCount,
    averageIntensity: s.averageIntensity,
    tags: s.tags,
    dominant: s.recordCount === 0 ? '暂无' : s.dominantTag
  };
}

/** 一句话摘要必须显式带上“当前选择身份 + 统一窗口大小”，避免与详情串线 */
export function chartSummary(chart: SynopticChartData): string {
  const focus = chart.isEmpty
    ? '暂无标本'
    : `${chart.currentRecord.date} ${chart.currentRecord.tag}`;
  return `${focus} · 全窗口 ${chart.windowSize} 条标本 · ${chart.zones.length} 个气压带`;
}
