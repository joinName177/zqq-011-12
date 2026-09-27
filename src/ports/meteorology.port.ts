import { MoodRecord, SynopticChartData } from '../core/models';
import { WeatherSnapshot } from '../core/weather-snapshot';

export interface MeteorologyPort {
  generateSynopticChart(records: MoodRecord[], currentRecord?: MoodRecord): SynopticChartData;
  /** 统一输出模型：屏幕与导出/分享共用的同一数据快照。 */
  generateSnapshot(records: MoodRecord[], selectedRecordId?: string | null): WeatherSnapshot;
}
