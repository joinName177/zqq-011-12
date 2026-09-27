import { MoodRecord, SynopticChartData } from './models';
import { evaluateSynopticSystem } from './meteorology-engine';
import { computeDigest } from './digest';

/**
 * 统一输出模型：屏幕天气图、气压带说明、预警指南与导出/分享内容
 * 全部从同一份 WeatherSnapshot 读取，杜绝多份数据快照互相漂移。
 */
export interface WeatherSnapshot {
  /** 统计窗口内的完整记录序列（按日期升序），屏幕序列条与导出共用。 */
  records: MoodRecord[];
  /** 屏幕端综观天气图模型（遥测、气压带、季风、预警）。 */
  chart: SynopticChartData;
  /** 当前选中的观测标本（与 chart.currentRecord 为同一对象）。 */
  currentRecord: MoodRecord;
  /** 归一化后的当前选择 id（请求的选择缺失时回退为最新记录）。 */
  selectedRecordId: string;
  /** 导出正文（不含校验码行）。 */
  exportBody: string;
  /** 完整导出/分享文本（正文 + 校验码行）。 */
  exportText: string;
  /** 导出正文的内容校验码。 */
  exportDigest: string;
}

const CHECKSUM_MARKER = '\n校验码：';

/**
 * 由 (记录序列, 当前选择) 构建唯一数据快照。
 * 统计（气压带 / 季风 / 平均气压）始终基于同一完整记录窗口，
 * 当前选择只决定“当前观测标本”，并同步驱动预警指南与导出文本。
 */
export function buildWeatherSnapshot(
  records: readonly MoodRecord[],
  selectedRecordId: string | null = null
): WeatherSnapshot {
  const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const requested = selectedRecordId ? sorted.find(r => r.id === selectedRecordId) : undefined;
  const current = requested ?? sorted[sorted.length - 1];

  const chart = evaluateSynopticSystem(sorted, current);
  const currentRecord = chart.currentRecord;
  const exportBody = formatExportBody(chart);
  const exportDigest = computeDigest(exportBody);
  const exportText = `${exportBody}${CHECKSUM_MARKER}${exportDigest}`;

  return {
    records: chart.records,
    chart,
    currentRecord,
    selectedRecordId: currentRecord.id,
    exportBody,
    exportText,
    exportDigest
  };
}

/** 统一文本格式：导出/分享内容仅由同一份综观图模型序列化而来。 */
export function formatExportBody(chart: SynopticChartData): string {
  const cur = chart.currentRecord;
  const lines: string[] = [
    `【情绪气象报告】${chart.chartId} · 生成于 ${chart.generatedDate}`,
    `当前观测：${cur.date} · ${cur.tag} · 强度 ${cur.intensity}/10`,
    `观测要素：气压 ${cur.pressureHpa} hPa · 气温 ${cur.temperatureC} °C · 湿度 ${cur.humidityPercent}% · 风场 ${cur.windDirectionName}风 ${cur.windSpeedKmH} km/h`,
    `气象系统：${chart.pressureSystemType} · 全周期平均气压 ${chart.averagePressure} hPa（${chart.records.length} 条记录）`,
    `气压带分布：${chart.zones.map(z => `${z.name} ${z.activeRatio}%`).join(' · ')}`,
    `季风走势：${chart.monsoon.vectorName}（${chart.monsoon.flowSpeed}）· ${chart.monsoon.upcomingForecast}`
  ];

  if (chart.alerts.length > 0) {
    lines.push(`极端天气预警：${chart.alerts.map(a => `${a.level}·${a.title}`).join('；')}`);
    chart.alerts.forEach(a => {
      lines.push(`自愈指南（${a.title}）：${a.defenseProtocol.map((p, i) => `${i + 1}.${p}`).join(' ')}`);
    });
  } else {
    lines.push('极端天气预警：无 · 当前心境空域晴朗');
  }

  lines.push(`气象综观：${chart.metSummary}`);
  return lines.join('\n');
}

/** 导出校验：重算正文摘要并与文本尾部校验码比对。 */
export function verifyExportText(exportText: string): boolean {
  const trimmed = exportText.replace(/\s+$/u, '');
  const markerIndex = trimmed.lastIndexOf(CHECKSUM_MARKER);
  if (markerIndex < 0) return false;
  const body = trimmed.slice(0, markerIndex);
  const digest = trimmed.slice(markerIndex + CHECKSUM_MARKER.length).trim();
  return /^[0-9A-F]{8}$/.test(digest) && computeDigest(body) === digest;
}
