import type { SynopticChartData, WeatherExportPayload } from './models';
import { MOOD_LIMITS, fnv1aHex, normalizeNote } from './format';

export interface ExportPreparation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  payload: WeatherExportPayload | null;
  shareText: string;
  fileName: string;
  sizeBytes: number;
}

/** 构造与屏幕统观完全同源的导出载荷（不含 checksum，便于先序列化再求校验和） */
function buildPayload(chart: SynopticChartData): WeatherExportPayload {
  const base = {
    format: 'mood-weather-export' as const,
    version: 1 as const,
    chartId: chart.chartId,
    generatedDate: chart.generatedDate,
    focusRecordId: chart.focusRecordId,
    windowSize: chart.windowSize,
    statistics: chart.statistics,
    pressureSystemType: chart.pressureSystemType,
    metSummary: chart.metSummary,
    alerts: chart.alerts,
    currentRecord: chart.isEmpty ? null : chart.currentRecord
  };
  const serialized = JSON.stringify(base);
  return { ...base, checksum: fnv1aHex(serialized) };
}

/** 纯文本分享内容：与屏幕显示的数值、日期、文案口径完全一致 */
export function buildShareText(chart: SynopticChartData): string {
  const lines: string[] = [];
  lines.push('🌦️ 情绪天气台 · 心灵气象快照');
  lines.push(`观测日期：${chart.generatedDate}　编号：${chart.chartId}`);
  lines.push(`环流系统：${chart.pressureSystemType}`);

  if (chart.isEmpty) {
    lines.push('当前尚无观测标本，记录今日心情天气即可生成专属气象图。');
    return lines.join('\n');
  }

  const s = chart.statistics;
  lines.push(
    `全周期标本：${s.recordCount} 条 | 主导标签：${s.dominantTag} | 平均强度：${s.averageIntensity.toFixed(1)} 级`
  );
  lines.push(
    `平均气压：${s.averagePressure} hPa | 平均温度：${s.averageTemp}°C | 平均湿度：${s.averageHumidity}%`
  );

  const c = chart.currentRecord;
  lines.push(
    `当前聚焦（${c.date}）：${c.tag}　${c.pressureHpa}hPa / ${c.temperatureC}°C / 湿度${c.humidityPercent}% / ${c.windDirectionName}风 ${c.windSpeedKmH}km/h`
  );

  const note = normalizeNote(c.note);
  if (note && note !== '平静观测记录') {
    lines.push(`心绪注记：${note}`);
  }

  if (chart.alerts.length > 0) {
    lines.push(`预警：${chart.alerts.length} 条活动极端天气预警`);
    for (const a of chart.alerts) {
      lines.push(`  · [${a.level}] ${a.title}（${a.issuedTime}）`);
    }
  } else {
    lines.push('预警：当前心境空域晴朗，无活动极端灾害天气警报。');
  }

  lines.push(chart.metSummary);
  return lines.join('\n');
}

/**
 * 导出 / 分享前的统一校验。
 * 校验“屏幕所见 = 导出所得”：非空窗口、当前选择身份一致、统计窗口一致、
 * 数值与日期合法、容量保护、载荷校验和可复算。
 */
export function prepareExport(chart: SynopticChartData): ExportPreparation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1) 空数据安全态：不产出伪造载荷
  if (chart.isEmpty || chart.windowSize === 0 || chart.records.length === 0) {
    errors.push('当前观测窗口为空，暂无可导出的气象数据，请先记录今日心情天气。');
  }

  // 2) 当前选择身份必须落在统计窗口内，且详情 / 预警 / 导出共用同一身份
  if (!chart.isEmpty) {
    if (!chart.focusRecordId) {
      errors.push('当前选择标本身份缺失，导出结果无法与屏幕对齐。');
    } else if (!chart.records.some(r => r.id === chart.focusRecordId)) {
      errors.push('当前选择标本不在统计窗口内，导出快照与屏幕不一致。');
    } else if (chart.currentRecord.id !== chart.focusRecordId) {
      errors.push('天气图详情、预警指南与导出使用了不同的当前标本。');
    }
  }

  // 3) 统计窗口口径一致
  if (chart.statistics.recordCount !== chart.windowSize || chart.windowSize !== chart.records.length) {
    errors.push('统计窗口在统观模型与统计结果之间不一致，已中止导出。');
  }

  // 4) 数值 / 日期合法性（与录入归一化同一边界）
  const s = chart.statistics;
  if (!Number.isFinite(s.averagePressure) || s.averagePressure < MOOD_LIMITS.pressureMin) {
    errors.push('平均气压越界或非法。');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(chart.generatedDate) || !/^\d{4}-\d{2}-\d{2}$/.test(chart.currentRecord.date)) {
    errors.push('存在未统一为 YYYY-MM-DD 的日期字段。');
  }

  // 5) 容量保护
  if (chart.records.length > MOOD_LIMITS.maxExportRecords) {
    warnings.push(
      `观测标本 ${chart.records.length} 条超过单份导出建议上限 ${MOOD_LIMITS.maxExportRecords} 条，已仅导出当前统观聚合结果。`
    );
  }

  const fileName = `mood-weather-${chart.generatedDate}-${chart.chartId.toLowerCase()}.json`;

  if (errors.length > 0) {
    return { ok: false, errors, warnings, payload: null, shareText: buildShareText(chart), fileName, sizeBytes: 0 };
  }

  const payload = buildPayload(chart);
  const serialized = JSON.stringify(payload);
  const sizeBytes = new TextEncoder().encode(serialized).length;

  if (sizeBytes > MOOD_LIMITS.maxExportBytes) {
    warnings.push(
      `导出载荷 ${sizeBytes} 字节超过建议上限 ${MOOD_LIMITS.maxExportBytes} 字节，建议缩短心绪注记后再导出。`
    );
  }

  // 6) 校验和可复算：保证导出内容未被中途改写
  const { checksum, ...rest } = payload;
  const recomputed = fnv1aHex(JSON.stringify(rest));
  if (recomputed !== checksum) {
    errors.push('导出快照校验和复算失败，数据可能在生成过程中被改写。');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    payload,
    shareText: buildShareText(chart),
    fileName,
    sizeBytes
  };
}

/** 导入侧 / 外部消费侧的校验：核对格式、版本与校验和 */
export function verifyExportPayload(raw: unknown): { ok: boolean; error?: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: '导出内容不是有效的对象。' };
  const p = raw as Partial<WeatherExportPayload>;
  if (p.format !== 'mood-weather-export' || p.version !== 1) {
    return { ok: false, error: '导出格式或版本不受支持。' };
  }
  const { checksum, ...rest } = p as WeatherExportPayload;
  if (typeof checksum !== 'string' || fnv1aHex(JSON.stringify(rest)) !== checksum) {
    return { ok: false, error: '导出内容校验失败，可能已损坏或被篡改。' };
  }
  return { ok: true };
}
