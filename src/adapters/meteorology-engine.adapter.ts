import { MoodRecord, SynopticChartData } from '../core/models';
import { evaluateSynopticSystem } from '../core/meteorology-engine';
import { MeteorologyPort } from '../ports/meteorology.port';

export class MeteorologyEngineAdapter implements MeteorologyPort {
  generateSynopticChart(records: readonly MoodRecord[], focusRecordId?: string): SynopticChartData {
    return evaluateSynopticSystem(records, focusRecordId);
  }
}
