import './ui/styles.css';
import { LocalStorageMoodAdapter } from './adapters/local-storage-mood.adapter';
import { MeteorologyEngineAdapter } from './adapters/meteorology-engine.adapter';
import { createRecordFromTag } from './core/meteorology-engine';
import { MoodRecord } from './core/models';
import { verifyExportText } from './core/weather-snapshot';
import { renderWeatherApp } from './ui/app';
import { summarizeMood, chartSummary } from './core/mood-summary';
import { moodTelemetry } from './adapters/mood-telemetry';
import { buildBugSurface } from './adapters/quality/bugSurface';

const repo = new LocalStorageMoodAdapter();
const metEngine = new MeteorologyEngineAdapter();

let records = repo.getAll();
// 当前选择：全应用唯一事实来源，屏幕遥测、预警指南与导出内容共用。
let selectedRecordId: string | null = null;
// 统一输出模型：每次状态变化重建一次快照，所有输出读取同一份。
let snapshot = metEngine.generateSnapshot(records, selectedRecordId);

let isModalOpen = false;
let isExportOpen = false;
let selectedTag = '阴转多云';
let selectedIntensity = 5;
let noteText = '';

const rootEl = document.getElementById('app')!;

// 导出/分享载荷：与屏幕渲染使用同一 snapshot，并在每次状态变化后同步刷新，
// 保证预览、详情与导出结果永远来自同一数据快照。
function syncExportDataset() {
  const bugSurface = buildBugSurface([snapshot.records.length, snapshot.chart.zones.length]);
  rootEl.dataset.moodSummary = JSON.stringify({
    summary: summarizeMood(snapshot.records),
    chart: chartSummary(snapshot.chart),
    currentSelection: snapshot.selectedRecordId,
    telemetry: moodTelemetry('initial'),
    bugSurface,
    preembeddedBugCount: bugSurface.bugs.length,
    hellBugCount: bugSurface.bugs.filter((bug) => bug.level === 'hell').length,
    difficultBugCount: bugSurface.bugs.filter((bug) => bug.level === 'difficult').length,
    export: {
      text: snapshot.exportText,
      digest: snapshot.exportDigest,
      valid: verifyExportText(snapshot.exportText)
    }
  });
}

function refreshView() {
  snapshot = metEngine.generateSnapshot(records, selectedRecordId);
  // 选择可能因数据重置/替换而失效，回写归一化后的当前选择。
  selectedRecordId = snapshot.selectedRecordId;
  syncExportDataset();

  renderWeatherApp(
    rootEl,
    snapshot.chart,
    isModalOpen,
    selectedTag,
    selectedIntensity,
    noteText,
    {
      isOpen: isExportOpen,
      text: snapshot.exportText,
      digest: snapshot.exportDigest,
      valid: verifyExportText(snapshot.exportText)
    },
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
        selectedRecordId = null;
        refreshView();
      },
      onSubmitLog: (tag: string, intensity: number, note: string) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const newRecord = createRecordFromTag(tag, intensity, note, todayStr);
        repo.add(newRecord);
        records = repo.getAll();
        selectedRecordId = newRecord.id;
        isModalOpen = false;
        refreshView();
      },
      onSelectRecord: (record: MoodRecord) => {
        // 仅切换当前观测标本；统计窗口与记录序列保持不变，
        // 屏幕、气压带、预警与导出自动收敛到同一快照。
        selectedRecordId = record.id;
        refreshView();
      },
      onOpenExport: () => {
        isExportOpen = true;
        refreshView();
      },
      onCloseExport: () => {
        isExportOpen = false;
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
      noteText = note;
    }
  );
}

// Initial mount
refreshView();
