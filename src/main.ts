import './ui/styles.css';
import { LocalStorageMoodAdapter } from './adapters/local-storage-mood.adapter';
import { MeteorologyEngineAdapter } from './adapters/meteorology-engine.adapter';
import { createRecordFromTag } from './core/meteorology-engine';
import { MoodRecord } from './core/models';
import { renderWeatherApp } from './ui/app';
import { summarizeMood, chartSummary } from './core/mood-summary';
import { moodTelemetry } from './adapters/mood-telemetry';
import { buildBugSurface } from './adapters/quality/bugSurface';
import { todayKey } from './core/format';

const repo = new LocalStorageMoodAdapter();
const metEngine = new MeteorologyEngineAdapter();

// 唯一状态：全周期标本 + 当前选择身份。统计窗口恒定，不再按选择截断。
let records = repo.getAll();
let focusRecordId: string | undefined;
let chartData = metEngine.generateSynopticChart(records, focusRecordId);

let isModalOpen = false;
let selectedTag = '阴转多云';
let selectedIntensity = 5;
let noteText = '';

const rootEl = document.getElementById('app')!;
const bugSurface = buildBugSurface([records.length, chartData.zones.length]);
rootEl.dataset.moodSummary = JSON.stringify({
  summary: summarizeMood(records),
  chart: chartSummary(chartData),
  telemetry: moodTelemetry('initial'),
  bugSurface,
  preembeddedBugCount: bugSurface.bugs.length,
  hellBugCount: bugSurface.bugs.filter((bug) => bug.level === 'hell').length,
  difficultBugCount: bugSurface.bugs.filter((bug) => bug.level === 'difficult').length
});

function refreshView() {
  // 天气图 / 气压带 / 季风 / 预警 / 导出 始终从同一份全周期窗口与同一身份派生
  chartData = metEngine.generateSynopticChart(records, focusRecordId);

  renderWeatherApp(
    rootEl,
    chartData,
    isModalOpen,
    selectedTag,
    selectedIntensity,
    noteText,
    {
      onOpenLogModal: () => {
        isModalOpen = true;
        selectedTag = '阴转多云';
        selectedIntensity = 5;
        noteText = '';
        refreshView();
      },
      onResetData: () => {
        records = repo.resetToSample();
        focusRecordId = undefined;
        refreshView();
      },
      onSubmitLog: (tag: string, intensity: number, note: string) => {
        const newRecord = createRecordFromTag(tag, intensity, note, todayKey());
        repo.add(newRecord);
        records = repo.getAll();
        // 当日签到后，当前选择跟随到最新标本
        focusRecordId = newRecord.id;
        isModalOpen = false;
        refreshView();
      },
      onSelectRecord: (record: MoodRecord) => {
        // 仅切换“当前标本身份”；统计 / 气压带 / 季风窗口保持全周期不变
        focusRecordId = record.id;
        refreshView();
      },
      onFocusLatest: () => {
        focusRecordId = undefined; // 缺省即由核心层回退到最新一条
        refreshView();
      }
    },
    () => {
      isModalOpen = false;
      refreshView();
    },
    (tag: string) => {
      selectedTag = tag;
      refreshView();
    },
    (intensity: number) => {
      selectedIntensity = intensity;
      refreshView();
    },
    (note: string) => {
      // 长文本不触发整图重渲染，避免输入卡顿；容量保护由 textarea maxlength 兜底
      noteText = note;
    }
  );

  // 摘要与屏幕同源，每次刷新同步，杜绝旧快照残留
  rootEl.dataset.moodSummary = JSON.stringify({
    summary: summarizeMood(records),
    chart: chartSummary(chartData),
    focusRecordId: chartData.focusRecordId,
    windowSize: chartData.windowSize,
    isEmpty: chartData.isEmpty,
    telemetry: moodTelemetry('refresh'),
    preembeddedBugCount: bugSurface.bugs.length,
    hellBugCount: bugSurface.bugs.filter((bug) => bug.level === 'hell').length,
    difficultBugCount: bugSurface.bugs.filter((bug) => bug.level === 'difficult').length
  });
}

// Initial mount
refreshView();
