import { MoodRecord, SynopticChartData } from '../core/models';
import { evaluateSynopticSystem } from '../core/meteorology-engine';
import { buildWeatherSnapshot, WeatherSnapshot } from '../core/weather-snapshot';
import { MeteorologyPort } from '../ports/meteorology.port';

export class MeteorologyEngineAdapter implements MeteorologyPort {
  generateSynopticChart(records: MoodRecord[], currentRecord?: MoodRecord): SynopticChartData {
    return evaluateSynopticSystem(records, currentRecord);
  }

  generateSnapshot(records: MoodRecord[], selectedRecordId: string | null = null): WeatherSnapshot {
    return buildWeatherSnapshot(records, selectedRecordId);
  }
}
