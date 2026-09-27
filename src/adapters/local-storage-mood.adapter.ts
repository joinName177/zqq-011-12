import { MoodRecord } from '../core/models';
import { MoodRepositoryPort } from '../ports/mood-repository.port';
import { createRecordFromTag, buildRecordWindow } from '../core/meteorology-engine';
import { todayKey, toLocalDateKey } from '../core/format';

const STORAGE_KEY = 'mood_meteorology_records_v1';
const SAMPLE_FLAG_KEY = 'mood_meteorology_sample_v1';

export class LocalStorageMoodAdapter implements MoodRepositoryPort {
  /**
   * 读取真实数据。返回值始终经过统一窗口清洗（排序 / 去重 / 边界收敛）。
   * 仅当不存在任何真实标本时，才回退到内置示例序列，并显式打标，
   * 使“降级示例数据”与“用户真实数据”边界清晰。
   */
  getAll(): MoodRecord[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = buildRecordWindow(parsed);
          if (cleaned.length > 0) return cleaned;
        }
      } catch {
        // 损坏数据：清除并走示例降级，避免异常直接灌入界面
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return this.resetToSample();
  }

  /** 写入前统一归一化 + 同日覆盖，保证持久层与内存窗口口径一致 */
  add(record: MoodRecord): void {
    const incoming = buildRecordWindow([record]);
    if (incoming.length === 0) return;
    const fresh = incoming[0];

    // 在已清洗的历史数据上做同日覆盖，避免旧版本脏数据导致重复键
    let existing: MoodRecord[] = [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) existing = buildRecordWindow(parsed);
      } catch {
        existing = [];
      }
    }
    const merged = existing.filter(r => r.date !== fresh.date).concat(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildRecordWindow(merged)));
    localStorage.setItem(SAMPLE_FLAG_KEY, '0'); // 已产生真实数据
  }

  delete(id: string): void {
    const records = this.getAll().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildRecordWindow(records)));
  }

  /** 内置 14 天气象序列（降级 / 演示数据），日期统一使用本地时区 */
  resetToSample(): MoodRecord[] {
    const sampleSequence: { tag: string; intensity: number; note: string; daysAgo: number }[] = [
      { tag: '晴空万里', intensity: 8, note: '项目顺利交付，周末在公园草坪晒太阳看书', daysAgo: 13 },
      { tag: '微风煦暖', intensity: 7, note: '和久违的老朋友喝咖啡，聊得很尽兴', daysAgo: 12 },
      { tag: '阴转多云', intensity: 5, note: '周一早会任务排得很满，平平淡淡地推进中', daysAgo: 11 },
      { tag: '暖湿气流过境', intensity: 6, note: '收到远方朋友的明信片与礼物，心里暖融融的', daysAgo: 10 },
      { tag: '低气压大雾', intensity: 4, note: '下雨天有点没精神，工作效率稍显迟缓', daysAgo: 9 },
      { tag: '局部有焦虑', intensity: 7, note: '季度目标对齐会议，几个指标有点卡住', daysAgo: 8 },
      { tag: '局部有焦虑', intensity: 8, note: '晚上失眠胡思乱想，担心后续进展', daysAgo: 7 },
      { tag: '突发雷暴', intensity: 9, note: '需求突然变更被要求大改，情绪瞬间崩溃爆发', daysAgo: 6 },
      { tag: '暖湿气流过境', intensity: 6, note: '同组成员主动分担了工作，并送了奶茶安慰', daysAgo: 5 },
      { tag: '阴转多云', intensity: 5, note: '调整心态，逐步把阻塞的问题拆解解决', daysAgo: 4 },
      { tag: '微风煦暖', intensity: 7, note: '晚风很舒服，去河边慢跑了5公里出了一身汗', daysAgo: 3 },
      { tag: '晴空万里', intensity: 8, note: '所有模块测试通过，终于可以松一口气', daysAgo: 2 },
      { tag: '微风煦暖', intensity: 7, note: '睡到自然醒，给阳台的多肉植物浇水修叶', daysAgo: 1 },
      { tag: '局部有焦虑', intensity: 7, note: '新的一周即将到来，局部依然盘旋着对未知的轻度担忧', daysAgo: 0 }
    ];

    const now = new Date();
    const records: MoodRecord[] = sampleSequence.map(item => {
      const d = new Date(now.getTime() - item.daysAgo * 86400000);
      return createRecordFromTag(item.tag, item.intensity, item.note, toLocalDateKey(d));
    });

    const windowed = buildRecordWindow(records);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(windowed));
    localStorage.setItem(SAMPLE_FLAG_KEY, '1');
    return windowed;
  }

  isSampleData(): boolean {
    return localStorage.getItem(SAMPLE_FLAG_KEY) === '1';
  }

  static todayKey(): string {
    return todayKey();
  }
}
