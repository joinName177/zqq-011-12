export type AlertLevel = '蓝色' | '黄色' | '橙色' | '红色';

export interface MoodTagMeta {
  tag: string;
  category: 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
  defaultPressure: number; // 960 - 1040 hPa
  defaultTemp: number;     // Celsius
  defaultHumidity: number; // 0 - 100%
  icon: string;
  windDesc: string;
  themeColor: string;
}

export interface MoodRecord {
  id: string;
  date: string; // YYYY-MM-DD（统一本地日期键）
  tag: string;
  intensity: number; // 1 - 10
  note: string;
  pressureHpa: number;
  temperatureC: number;
  humidityPercent: number;
  windSpeedKmH: number;
  windDirectionDeg: number;
  windDirectionName: string;
}

/** 全周期统一统计口径：天气图 / 气压带 / 指南 / 导出共用同一份 */
export interface MoodStatistics {
  recordCount: number;
  averageIntensity: number;   // 一位小数
  averagePressure: number;    // 整数 hPa
  averageTemp: number;        // 整数 °C
  averageHumidity: number;    // 整数 %
  tags: string[];
  dominantTag: string;        // 频次最高；并列时取序列中先出现者
}

export interface BarometricZone {
  code: string;
  name: string;
  psychologicalState: string;
  pressureRange: string;
  activeRatio: number; // 0 - 100%
  status: 'dominant' | 'active' | 'receding';
  description: string;
}

export interface MonsoonTrend {
  vectorName: string;
  originSource: string;
  frequencyDays: number;
  flowSpeed: string;
  windAngle: number;
  weatherImpact: string;
  upcomingForecast: string;
}

export interface ExtremeWeatherAlert {
  id: string;
  level: AlertLevel;
  type: string;
  title: string;
  issuedTime: string;
  triggerCause: string;
  defenseProtocol: string[]; // 防灾自愈指南
}

export type PressureSystemType =
  | '强烈冷涡旋'
  | '副热带高压晴空'
  | '锋面气旋多变'
  | '温带反气旋平稳'
  | '深槽低气压阴霾';

/**
 * 单一统观数据模型。
 *
 * - records / statistics / zones / monsoon 始终基于同一份全周期标本；
 * - currentRecord 由 focusRecordId 显式指定，是详情、预警与导出的唯一“当前选择”。
 */
export interface SynopticChartData {
  chartId: string;
  generatedDate: string; // YYYY-MM-DD
  currentRecord: MoodRecord;
  /** 当前聚焦标本的显式身份；空串表示无真实标本（空数据安全态） */
  focusRecordId: string;
  /** 当前聚焦是否即全周期最新一条（决定“返回最新”入口可见性） */
  focusIsLatest: boolean;
  records: MoodRecord[];
  statistics: MoodStatistics;
  /** 统计窗口大小（与 records.length 同源，导出校验据此核对快照一致性） */
  windowSize: number;
  averagePressure: number;
  zones: BarometricZone[];
  monsoon: MonsoonTrend;
  alerts: ExtremeWeatherAlert[];
  pressureSystemType: PressureSystemType;
  metSummary: string;
  /** 无真实数据时为 true，界面进入安全空态，不渲染伪数据 */
  isEmpty: boolean;
}

/** 导出 / 分享的统一载荷（与屏幕输出同源同快照） */
export interface WeatherExportPayload {
  format: 'mood-weather-export';
  version: 1;
  chartId: string;
  generatedDate: string;
  focusRecordId: string;
  windowSize: number;
  statistics: MoodStatistics;
  pressureSystemType: PressureSystemType;
  metSummary: string;
  alerts: ExtremeWeatherAlert[];
  currentRecord: MoodRecord | null;
  checksum: string;
}
