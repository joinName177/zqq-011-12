import { MoodRecord, SynopticChartData } from '../core/models';

export interface MeteorologyPort {
  /**
   * 基于全周期标本生成统观数据。
   * @param focusRecordId 当前选择标本身份；缺省时由核心层回退到最新一条
   */
  generateSynopticChart(records: readonly MoodRecord[], focusRecordId?: string): SynopticChartData;
}
