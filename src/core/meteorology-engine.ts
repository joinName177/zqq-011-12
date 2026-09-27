import {
  MoodRecord,
  MoodTagMeta,
  BarometricZone,
  MonsoonTrend,
  ExtremeWeatherAlert,
  SynopticChartData,
  MoodStatistics,
  PressureSystemType
} from './models';
import {
  MOOD_LIMITS,
  clampInt,
  roundWhole,
  round1,
  safeDateKey,
  todayKey,
  normalizeNote
} from './format';

export const TAG_METAS: Record<string, MoodTagMeta> = {
  '晴空万里': {
    tag: '晴空万里',
    category: 'sunny',
    defaultPressure: 1024,
    defaultTemp: 24,
    defaultHumidity: 45,
    icon: '☀️',
    windDesc: '微风拂面 · 东南风 2级',
    themeColor: '#ffb703'
  },
  '微风煦暖': {
    tag: '微风煦暖',
    category: 'sunny',
    defaultPressure: 1018,
    defaultTemp: 22,
    defaultHumidity: 50,
    icon: '🌤️',
    windDesc: '和煦暖风 · 南风 3级',
    themeColor: '#fb8500'
  },
  '阴转多云': {
    tag: '阴转多云',
    category: 'cloudy',
    defaultPressure: 1008,
    defaultTemp: 18,
    defaultHumidity: 65,
    icon: '⛅',
    windDesc: '静风无定向 · 气压平缓',
    themeColor: '#8ecae6'
  },
  '低气压大雾': {
    tag: '低气压大雾',
    category: 'fog',
    defaultPressure: 998,
    defaultTemp: 14,
    defaultHumidity: 92,
    icon: '🌫️',
    windDesc: '无风凝滞 · 能见度不足',
    themeColor: '#6c757d'
  },
  '局部有焦虑': {
    tag: '局部有焦虑',
    category: 'cloudy',
    defaultPressure: 992,
    defaultTemp: 26,
    defaultHumidity: 78,
    icon: '🌦️',
    windDesc: '偏西阵风 5级 · 气旋对流',
    themeColor: '#588157'
  },
  '暖湿气流过境': {
    tag: '暖湿气流过境',
    category: 'rain',
    defaultPressure: 1002,
    defaultTemp: 25,
    defaultHumidity: 85,
    icon: '🌧️',
    windDesc: '西南湿润气流 4级',
    themeColor: '#219ebc'
  },
  '突发雷暴': {
    tag: '突发雷暴',
    category: 'storm',
    defaultPressure: 975,
    defaultTemp: 20,
    defaultHumidity: 95,
    icon: '⛈️',
    windDesc: '强烈飑线 · 偏北强风 8级',
    themeColor: '#7209b7'
  },
  '寒潮大风': {
    tag: '寒潮大风',
    category: 'snow',
    defaultPressure: 1032,
    defaultTemp: -2,
    defaultHumidity: 30,
    icon: '❄️',
    windDesc: '西伯利亚干冷风 7级',
    themeColor: '#023e8a'
  }
};

export const DEFAULT_TAG = '阴转多云';
const WIND_DIRECTIONS = ['东北', '东', '东南', '南', '西南', '西', '西北', '北'] as const;

export function createRecordFromTag(tag: string, intensity: number, note: string, dateStr?: string): MoodRecord {
  const safeTag = TAG_METAS[tag] ? tag : DEFAULT_TAG;
  const meta = TAG_METAS[safeTag];
  const level = clampInt(intensity, MOOD_LIMITS.intensityMin, MOOD_LIMITS.intensityMax);

  const pressureOffset = (5 - level) * 3;
  const pressureHpa = clampInt(
    meta.defaultPressure + pressureOffset,
    MOOD_LIMITS.pressureMin,
    MOOD_LIMITS.pressureMax
  );
  const tempOffset = (level - 5) * 1.2;
  const temperatureC = clampInt(
    Math.round(meta.defaultTemp + tempOffset),
    MOOD_LIMITS.tempMin,
    MOOD_LIMITS.tempMax
  );
  const humidityPercent = clampInt(
    meta.defaultHumidity + (level > 6 ? 10 : -5),
    MOOD_LIMITS.humidityMin,
    MOOD_LIMITS.humidityMax
  );

  const dirIdx = Math.abs((safeTag.charCodeAt(0) + level) % WIND_DIRECTIONS.length);
  const windDirectionName = WIND_DIRECTIONS[dirIdx];
  const windDeg = dirIdx * 45;
  const windSpeed = clampInt(
    5 + level * 3.5,
    MOOD_LIMITS.windSpeedMin,
    MOOD_LIMITS.windSpeedMax
  );

  return {
    id: `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: safeDateKey(dateStr),
    tag: safeTag,
    intensity: level,
    note: normalizeNote(note) || '平静观测记录',
    pressureHpa,
    temperatureC,
    humidityPercent,
    windSpeedKmH: windSpeed,
    windDirectionDeg: windDeg,
    windDirectionName
  };
}

/**
 * 将任意来源（LocalStorage / 内置序列 / 旧版本数据）的标本归一化为安全标本。
 * 非法标签回退、数值越界收敛、日期统一为本地 YYYY-MM-DD、注记裁剪。
 */
export function normalizeRecord(raw: unknown): MoodRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const tag = typeof r.tag === 'string' && TAG_METAS[r.tag] ? r.tag : DEFAULT_TAG;
  const meta = TAG_METAS[tag];
  const intensity = clampInt(
    Number(r.intensity) || 5,
    MOOD_LIMITS.intensityMin,
    MOOD_LIMITS.intensityMax
  );
  const id = typeof r.id === 'string' && r.id ? r.id : `rec-invalid-${safeDateKey(r.date)}-${tag}`;

  return {
    id,
    date: safeDateKey(r.date),
    tag,
    intensity,
    note: normalizeNote(r.note) || '平静观测记录',
    pressureHpa: clampInt(
      Number(r.pressureHpa) || meta.defaultPressure,
      MOOD_LIMITS.pressureMin,
      MOOD_LIMITS.pressureMax
    ),
    temperatureC: clampInt(
      Number(r.temperatureC) || meta.defaultTemp,
      MOOD_LIMITS.tempMin,
      MOOD_LIMITS.tempMax
    ),
    humidityPercent: clampInt(
      Number(r.humidityPercent) || meta.defaultHumidity,
      MOOD_LIMITS.humidityMin,
      MOOD_LIMITS.humidityMax
    ),
    windSpeedKmH: clampInt(
      Number(r.windSpeedKmH) || 0,
      MOOD_LIMITS.windSpeedMin,
      MOOD_LIMITS.windSpeedMax
    ),
    windDirectionDeg: clampInt(
      Number(r.windDirectionDeg) || 0,
      MOOD_LIMITS.windDegMin,
      MOOD_LIMITS.windDegMax
    ),
    windDirectionName:
      typeof r.windDirectionName === 'string' && r.windDirectionName
        ? r.windDirectionName
        : WIND_DIRECTIONS[0]
  };
}

/**
 * 统一统计窗口：清洗 → 按日期+身份稳定排序 → 按日期去重（同日保留最后一条）。
 * 天气图、气压带、季风、预警、导出都消费这同一份结果。
 */
export function buildRecordWindow(input: readonly MoodRecord[]): MoodRecord[] {
  const cleaned = input
    .map(normalizeRecord)
    .filter((r): r is MoodRecord => r !== null);

  // 稳定排序：先日期，再身份，保证时间线顺序可复现
  cleaned.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // 同日去重：保留序列中靠后的一条（与“当日签到覆盖旧签到”语义一致）
  const byDate = new Map<string, MoodRecord>();
  for (const r of cleaned) byDate.set(r.date, r);
  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** 全周期统一统计（单一舍入口径） */
export function computeStatistics(records: readonly MoodRecord[]): MoodStatistics {
  const window = buildRecordWindow(records);
  const count = window.length;
  const mean = (pick: (r: MoodRecord) => number) =>
    count ? window.reduce((s, r) => s + pick(r), 0) / count : 0;

  // 频次最高标签；并列时取在序列中最先出现者（确定性）
  const counts = new Map<string, number>();
  for (const r of window) counts.set(r.tag, (counts.get(r.tag) ?? 0) + 1);
  let dominantTag = '暂无';
  if (count > 0) {
    let bestCount = -1;
    for (const r of window) {
      const c = counts.get(r.tag) ?? 0;
      if (c > bestCount) {
        bestCount = c;
        dominantTag = r.tag;
      }
    }
  }

  return {
    recordCount: count,
    averageIntensity: round1(mean(r => r.intensity)),
    averagePressure: count ? roundWhole(mean(r => r.pressureHpa)) : 0,
    averageTemp: count ? roundWhole(mean(r => r.temperatureC)) : 0,
    averageHumidity: count ? roundWhole(mean(r => r.humidityPercent)) : 0,
    tags: Array.from(counts.keys()),
    dominantTag
  };
}

function buildZones(records: readonly MoodRecord[]): BarometricZone[] {
  let equatorial = 0; // 对流/灵感（中等气压）
  let subTropical = 0; // 高压晴朗
  let subPolar = 0; // 低压低落
  let polarCold = 0; // 高压低温封闭

  records.forEach(r => {
    if (r.pressureHpa >= 1020 && r.temperatureC > 15) subTropical++;
    else if (r.pressureHpa >= 1020 && r.temperatureC <= 10) polarCold++;
    else if (r.pressureHpa <= 995) subPolar++;
    else equatorial++;
  });

  const total = records.length || 1;
  const ratio = (n: number) => (records.length ? roundWhole((n / total) * 100) : 0);

  return [
    {
      code: 'Z-STH',
      name: '副热带高压带（心境晴朗稳定）',
      psychologicalState: '精力平稳、秩序感充足、心态从容明朗',
      pressureRange: '1018 ~ 1030 hPa',
      activeRatio: ratio(subTropical),
      status: subTropical >= total * 0.35 ? 'dominant' : 'active',
      description: '受反气旋沉降气流控制，天空云量稀少，注意力聚焦，内耗极低。'
    },
    {
      code: 'Z-EQU',
      name: '赤道低压槽（充沛对流与灵感）',
      psychologicalState: '情绪敏感、灵感涌动、轻微情绪躁动',
      pressureRange: '1000 ~ 1015 hPa',
      activeRatio: ratio(equatorial),
      status: equatorial >= total * 0.35 ? 'dominant' : 'active',
      description: '对流活动旺盛，情绪水汽充沛，容易产生即兴表达欲与探索热情。'
    },
    {
      code: 'Z-SPL',
      name: '副极地低气压带（低落潮湿阻滞）',
      psychologicalState: '情绪内耗、局部焦虑、精力低谷期',
      pressureRange: '970 ~ 998 hPa',
      activeRatio: ratio(subPolar),
      status: subPolar >= total * 0.35 ? 'dominant' : 'active',
      description: '暖冷气团交汇形成持久锋面雨带，情绪云层厚重，阳光穿透力减弱。'
    },
    {
      code: 'Z-POL',
      name: '极地冷高压区（情感冷却与封闭）',
      psychologicalState: '冷漠理性、拒绝社交、自我防御开启',
      pressureRange: '1025 ~ 1045 hPa (低温)',
      activeRatio: ratio(polarCold),
      status: polarCold >= total * 0.2 ? 'dominant' : 'receding',
      description: '温度跌破防御线，地表热量迅速散失，表现为情绪冷淡与沉默。'
    }
  ];
}

function buildMonsoon(records: readonly MoodRecord[], avgPressure: number): MonsoonTrend {
  const recentSlice = records.slice(-7);
  const days = recentSlice.length;
  const avgIntensity = days ? recentSlice.reduce((s, r) => s + r.intensity, 0) / days : 0;
  const hasStorm = recentSlice.some(r => r.pressureHpa < 985);

  let vectorName = '静稳均压场（观测样本不足）';
  let originSource = '当前观测标本不足，系统维持静稳占位环流';
  let flowSpeed = '无风 0 km/h';
  let windAngle = 0;
  let weatherImpact = '暂无足够观测数据推演环流';
  let upcomingForecast = '补充今日心情签到后，将生成未来三日气象推演。';

  if (days > 0) {
    vectorName = '东亚温和偏南季风';
    originSource = '来自生活日常与适度社交温和气团';
    flowSpeed = '微风 12 km/h';
    windAngle = 135;
    weatherImpact = '气压平衡，情绪系统处于舒适自净区间';
    upcomingForecast = '预计未来三天无明显冷空气入侵，维持多云转晴趋势。';

    if (avgPressure < 995 || hasStorm || avgIntensity >= 8) {
      vectorName = '西南热带气旋逆时针切变流';
      originSource = '来自多重待办任务与社交过载的深层热低压';
      flowSpeed = '疾风 48 km/h';
      windAngle = 225;
      weatherImpact = '带来间歇性焦虑降水与情绪飑线，心理湿度高居不下';
      upcomingForecast = '警惕情绪二次对流反弹，建议尽早启动防灾避雨防御。';
    } else if (avgPressure > 1020) {
      vectorName = '高压脊平直西风气流';
      originSource = '来自坚实生活秩序与专注工作带来的稳定反气旋';
      flowSpeed = '清风 18 km/h';
      windAngle = 270;
      weatherImpact = '视界清晰无云，情绪能见度极高，适合规划长期战略';
      upcomingForecast = '高压系统稳定，气温宜人，建议保持当前生活节律。';
    }
  }

  return {
    vectorName,
    originSource,
    frequencyDays: days,
    flowSpeed,
    windAngle,
    weatherImpact,
    upcomingForecast
  };
}

/** 预警严格绑定到“当前聚焦标本”，与天气图详情、导出使用同一条记录 */
function buildAlerts(cur: MoodRecord): ExtremeWeatherAlert[] {
  const alerts: ExtremeWeatherAlert[] = [];

  if (cur.pressureHpa < 980 || (cur.tag === '突发雷暴' && cur.intensity >= 8)) {
    alerts.push({
      id: 'alert-red-storm',
      level: '红色',
      type: '情绪特大暴雨与雷电暴风预警',
      title: '红色暴雨预警 · 情绪超负荷对流',
      issuedTime: cur.date,
      triggerCause: `中心气压降至 ${cur.pressureHpa}hPa，阵风超速，局部心理降水量达特大暴雨级别。`,
      defenseProtocol: [
        '立即暂停所有高摩擦高风险的人际沟通与决策。',
        '退回物理安全区（卧室/安静角落），拉上窗帘切断过多声光刺激。',
        '进行5次深长腹式呼吸，允许眼泪或倾诉作为自然水汽释放。',
        '备用应急热饮（热牛奶或洋甘菊茶），等待气旋中心移出。'
      ]
    });
  } else if (cur.tag === '局部有焦虑' && cur.intensity >= 7) {
    alerts.push({
      id: 'alert-orange-anxiety',
      level: '橙色',
      type: '干热高温与强对流焦虑预警',
      title: '橙色预警 · 局部焦虑气团盘旋',
      issuedTime: cur.date,
      triggerCause: `心理湿度高达 ${cur.humidityPercent}%，内热积蓄，出现明显心率过载与思绪乱流。`,
      defenseProtocol: [
        '执行“注意力物理降温”：离开发生焦虑的工位，步行洗脸或冷水洗手。',
        '将脑中盘旋的所有待办事项写在纸上，关停后台大脑线程。',
        '禁止在当夜进行自我复盘或批判，推迟至明早高压回升后再议。'
      ]
    });
  } else if (cur.tag === '寒潮大风') {
    alerts.push({
      id: 'alert-yellow-cold',
      level: '黄色',
      type: '情感寒潮与社交冰封预警',
      title: '黄色预警 · 极地干冷冷锋压境',
      issuedTime: cur.date,
      triggerCause: `气温剧烈骤降至 ${cur.temperatureC}°C，情绪能量趋近冰点，防御性坚冰形成。`,
      defenseProtocol: [
        '不必强迫自己热情回应外界信息，开启社交请假条/免打扰模式。',
        '通过热汤、暖水袋、厚毯子提供基础躯体热量。',
        '倾听白噪音或重温一部熟悉的童年治愈老电影。'
      ]
    });
  }

  return alerts;
}

function buildMetSummary(
  systemType: PressureSystemType,
  stats: MoodStatistics,
  monsoon: MonsoonTrend,
  alertCount: number,
  isEmpty: boolean
): string {
  if (isEmpty) {
    return '气象综观显示：当前心境空域尚无观测标本，暂以静稳占位环流待命。请记录今日心情天气，生成专属情绪综观图。';
  }
  return `气象综观显示：当前心境领空受【${systemType}】统御。全周期共 ${stats.recordCount} 条观测标本，平均气压 ${stats.averagePressure} hPa、平均强度 ${stats.averageIntensity.toFixed(1)} 级，主导气象标签【${stats.dominantTag}】，近期主要受【${monsoon.vectorName}】影响。${alertCount > 0 ? `当前挂起 ${alertCount} 个灾害性气象预警！` : '整层大气环流平稳，无破坏性对流。'}`;
}

/**
 * 统观推演唯一入口。
 *
 * @param input         全周期标本（不再按选择截断，统计窗口恒定）
 * @param focusRecordId 当前选择身份；缺失/找不到时回退到最新一条
 */
export function evaluateSynopticSystem(
  input: readonly MoodRecord[],
  focusRecordId?: string
): SynopticChartData {
  const records = buildRecordWindow(input);
  const isEmpty = records.length === 0;

  const stats = computeStatistics(records);
  const zones = buildZones(records);
  const monsoon = buildMonsoon(records, stats.averagePressure);

  // 当前选择：显式身份优先，否则取最新；空数据走确定性安全占位
  let currentRecord: MoodRecord;
  let focusRecordIdResolved = '';
  let focusIsLatest = false;

  if (isEmpty) {
    currentRecord = createRecordFromTag(DEFAULT_TAG, 5, '暂无观测标本', todayKey());
  } else {
    const latest = records[records.length - 1];
    currentRecord =
      (focusRecordId ? records.find(r => r.id === focusRecordId) : undefined) ?? latest;
    focusRecordIdResolved = currentRecord.id;
    focusIsLatest = currentRecord.id === latest.id;
  }

  // 预警、详情、导出共用同一条当前标本
  const alerts = isEmpty ? [] : buildAlerts(currentRecord);

  let pressureSystemType: PressureSystemType = '温带反气旋平稳';
  if (isEmpty) {
    pressureSystemType = '深槽低气压阴霾';
  } else if (stats.averagePressure >= 1020) {
    pressureSystemType = '副热带高压晴空';
  } else if (stats.averagePressure < 990) {
    pressureSystemType = '强烈冷涡旋';
  } else if (alerts.length > 0) {
    pressureSystemType = '锋面气旋多变';
  } else {
    pressureSystemType = '深槽低气压阴霾';
  }

  const generatedDate = todayKey();
  const metSummary = buildMetSummary(
    pressureSystemType,
    stats,
    monsoon,
    alerts.length,
    isEmpty
  );

  return {
    chartId: `SYN-${Date.now().toString(36).toUpperCase()}`,
    generatedDate,
    currentRecord,
    focusRecordId: focusRecordIdResolved,
    focusIsLatest,
    records,
    statistics: stats,
    windowSize: records.length,
    averagePressure: stats.averagePressure,
    zones,
    monsoon,
    alerts,
    pressureSystemType,
    metSummary,
    isEmpty
  };
}
