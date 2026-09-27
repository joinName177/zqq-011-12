import { SynopticChartData, MoodRecord } from '../core/models';
import { TAG_METAS, DEFAULT_TAG } from '../core/meteorology-engine';
import { escapeHtml, MOOD_LIMITS } from '../core/format';
import { prepareExport } from '../core/export-share';

export interface WeatherUIHandlers {
  onOpenLogModal: () => void;
  onResetData: () => void;
  onSubmitLog: (tag: string, intensity: number, note: string) => void;
  onSelectRecord: (record: MoodRecord) => void;
  /** 从历史标本返回最新一条，但统计窗口始终保持全周期 */
  onFocusLatest: () => void;
}

export function renderWeatherApp(
  container: HTMLElement,
  chartData: SynopticChartData,
  isModalOpen: boolean,
  selectedTag: string,
  selectedIntensity: number,
  noteText: string,
  handlers: WeatherUIHandlers,
  onCloseModal: () => void,
  onTagChange: (tag: string) => void,
  onIntensityChange: (val: number) => void,
  onNoteChange: (val: string) => void
) {
  const cur = chartData.currentRecord;
  const meta = TAG_METAS[cur.tag] || TAG_METAS[DEFAULT_TAG];
  const esc = escapeHtml;

  // 导出 / 分享与屏幕使用同一份统观快照，并执行统一校验
  const exportPrep = prepareExport(chartData);

  // Generate Isobar SVG paths dynamically based on records
  const isobarsSvg = `
    <svg class="synoptic-svg" viewBox="0 0 800 380" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(0, 240, 255, 0.15)" />
          <stop offset="50%" stop-color="rgba(58, 134, 255, 0.05)" />
          <stop offset="100%" stop-color="rgba(255, 0, 84, 0.1)" />
        </linearGradient>
        <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
        </pattern>
      </defs>

      <!-- Background Grid -->
      <rect width="100%" height="100%" fill="url(#gridPattern)" />
      <rect width="100%" height="100%" fill="url(#cloudGrad)" />

      <!-- Lat/Long Guides -->
      <line x1="0" y1="190" x2="800" y2="190" stroke="rgba(0, 240, 255, 0.2)" stroke-dasharray="4,4" />
      <line x1="400" y1="0" x2="400" y2="380" stroke="rgba(0, 240, 255, 0.2)" stroke-dasharray="4,4" />
      <text x="410" y="25" fill="rgba(0, 240, 255, 0.4)" font-size="10" font-family="monospace">CENTRAL MERIDIAN 120°E</text>
      <text x="15" y="180" fill="rgba(0, 240, 255, 0.4)" font-size="10" font-family="monospace">PSYCHIC EQUATOR 0°</text>

      <!-- Isobar Concentric Waves -->
      <!-- Center 1: Low pressure trough / cyclone -->
      <g transform="translate(240, 180)">
        <ellipse cx="0" cy="0" rx="200" ry="110" fill="none" stroke="rgba(0, 240, 255, 0.3)" stroke-width="1.5" stroke-dasharray="6,2" />
        <ellipse cx="0" cy="0" rx="140" ry="80" fill="none" stroke="rgba(0, 240, 255, 0.5)" stroke-width="1.5" />
        <ellipse cx="0" cy="0" rx="80" ry="45" fill="none" stroke="rgba(255, 0, 84, 0.6)" stroke-width="2" />
        <circle cx="0" cy="0" r="16" fill="rgba(255, 0, 84, 0.2)" stroke="#ff0054" stroke-width="2" />
        <text x="0" y="5" fill="#ff0054" font-size="13" font-weight="bold" text-anchor="middle">L</text>
        <text x="50" y="-30" fill="#00f0ff" font-size="10">992 hPa</text>
        <text x="100" y="-60" fill="#00f0ff" font-size="10">1004 hPa</text>
      </g>

      <!-- Center 2: High pressure ridge -->
      <g transform="translate(600, 150)">
        <ellipse cx="0" cy="0" rx="180" ry="100" fill="none" stroke="rgba(58, 134, 255, 0.3)" stroke-width="1.5" />
        <ellipse cx="0" cy="0" rx="110" ry="60" fill="none" stroke="rgba(58, 134, 255, 0.6)" stroke-width="1.5" />
        <circle cx="0" cy="0" r="16" fill="rgba(58, 134, 255, 0.2)" stroke="#3a86ff" stroke-width="2" />
        <text x="0" y="5" fill="#3a86ff" font-size="13" font-weight="bold" text-anchor="middle">H</text>
        <text x="-90" y="-40" fill="#3a86ff" font-size="10">1020 hPa</text>
        <text x="-40" y="-10" fill="#3a86ff" font-size="10">1028 hPa</text>
      </g>

      <!-- Cold Front Line (Blue Triangles) -->
      <path d="M 280,70 Q 320,180 390,320" fill="none" stroke="#3a86ff" stroke-width="3" />
      <polygon points="305,120 317,112 312,128" fill="#3a86ff" />
      <polygon points="332,190 344,182 339,198" fill="#3a86ff" />
      <polygon points="365,260 377,252 372,268" fill="#3a86ff" />

      <!-- Warm Front Line (Red Semi-circles) -->
      <path d="M 120,290 Q 200,240 280,260" fill="none" stroke="#ff0054" stroke-width="3" />
      <circle cx="180" cy="254" r="6" fill="#ff0054" />
      <circle cx="240" cy="250" r="6" fill="#ff0054" />

      <!-- Wind Vectors (Arrows) -->
      <g transform="translate(180, 110) rotate(120)">
        <line x1="0" y1="0" x2="35" y2="0" stroke="#00f0ff" stroke-width="2" />
        <polygon points="35,0 26,-4 26,4" fill="#00f0ff" />
      </g>
      <g transform="translate(480, 260) rotate(-45)">
        <line x1="0" y1="0" x2="40" y2="0" stroke="#ffbe0b" stroke-width="2" />
        <polygon points="40,0 30,-4 30,4" fill="#ffbe0b" />
      </g>
      <g transform="translate(620, 310) rotate(-30)">
        <line x1="0" y1="0" x2="32" y2="0" stroke="#ffbe0b" stroke-width="2" />
        <polygon points="32,0 23,-4 23,4" fill="#ffbe0b" />
      </g>

      <!-- Current Location Station Symbol -->
      <g transform="translate(400, 190)">
        <circle cx="0" cy="0" r="14" fill="#070d18" stroke="#00f0ff" stroke-width="2" />
        <text x="0" y="5" font-size="12" text-anchor="middle">${meta.icon}</text>
        <rect x="-65" y="22" width="130" height="24" rx="4" fill="rgba(14,23,38,0.85)" stroke="rgba(0,240,255,0.3)" />
        <text x="0" y="38" fill="#e2eafc" font-size="11" font-weight="bold" text-anchor="middle">气压观测点: ${cur.pressureHpa} hPa</text>
      </g>
    </svg>
  `;

  const stats = chartData.statistics;

  container.innerHTML = `
    <div class="met-app">
      <header class="met-header">
        <div class="met-brand">
          <div class="radar-icon">📡</div>
          <div>
            <h1>情绪天气台 · 心灵气象图系统</h1>
            <p>PSYCHOLOGICAL METEOROLOGICAL OBSERVATORY &amp; SYNOPTIC CHART</p>
          </div>
        </div>
        <div class="met-header-actions">
          <button class="btn-reset" id="btnReset" type="button">🔄 重置示例气象序列</button>
          <button class="btn-record-mood" id="btnOpenLog" type="button">✍️ 记录今日心情天气</button>
        </div>
      </header>

      ${
        chartData.isEmpty
          ? `
        <div class="empty-banner">
          <strong>🌫️ 暂无观测标本</strong>
          <span>当前心境空域处于静稳空窗，天气图 / 气压带 / 预警 / 导出已统一进入安全空态。点击「记录今日心情天气」开始观测。</span>
        </div>
      `
          : ''
      }

      ${
        !chartData.isEmpty && chartData.alerts.length > 0
          ? `
        <div class="alert-banner">
          <div class="alert-banner-left">
            <span class="alert-tag">${chartData.alerts[0].level}预警</span>
            <strong>${esc(chartData.alerts[0].title)}</strong>
            <span style="font-size:13px;color:var(--met-text);">${esc(chartData.alerts[0].triggerCause)}</span>
          </div>
          <span style="font-size:12px;color:var(--met-muted);">${esc(chartData.alerts[0].issuedTime)} 发布 · 对应当前标本 ${esc(cur.date)}</span>
        </div>
      `
          : ''
      }

      <div class="met-grid">
        <!-- Left: Synoptic Chart & Telemetry -->
        <main class="synoptic-box">
          <div class="box-title">
            <h2>🌐 个人专属情绪综观天气图 (Synoptic Chart)</h2>
            <span style="font-size:12px;color:var(--met-muted);font-family:monospace;">
              ${esc(chartData.chartId)} · ${esc(chartData.generatedDate)} · 全窗口 ${chartData.windowSize} 条
            </span>
          </div>

          <!-- Current Selection Identity (single source of truth) -->
          <div class="focus-bar ${chartData.focusIsLatest ? 'is-latest' : 'is-history'}">
            <div class="focus-bar-main">
              <span class="focus-dot">📍</span>
              <strong>${chartData.isEmpty ? '当前无真实标本（静稳占位）' : `当前标本：${esc(cur.date)} · ${esc(cur.tag)}`}</strong>
              <span class="focus-sub">
                ${
                  chartData.isEmpty
                    ? '统计窗口为空'
                    : chartData.focusIsLatest
                      ? '即全周期最新一条观测'
                      : '历史标本 · 预警与导出均针对此条；统计仍基于全窗口'
                }
              </span>
            </div>
            ${!chartData.isEmpty && !chartData.focusIsLatest ? '<button class="btn-reset" id="btnFocusLatest" type="button">↩ 返回最新标本</button>' : ''}
          </div>

          <!-- Current Telemetry -->
          <div class="current-telemetry">
            <div class="telemetry-card">
              <div class="lbl">心境气压 (Barometer)</div>
              <div class="val" style="color:var(--met-cyan);">${cur.pressureHpa} <span style="font-size:12px;">hPa</span></div>
              <div class="lbl">${cur.pressureHpa < 1000 ? '低压对流' : '高压反气旋'}</div>
            </div>
            <div class="telemetry-card">
              <div class="lbl">情绪温度 (Temperature)</div>
              <div class="val" style="color:var(--met-gold);">${cur.temperatureC} <span style="font-size:12px;">°C</span></div>
              <div class="lbl">体感适宜度良好</div>
            </div>
            <div class="telemetry-card">
              <div class="lbl">心理湿度 (Humidity)</div>
              <div class="val" style="color:var(--met-blue);">${cur.humidityPercent}%</div>
              <div class="lbl">${cur.humidityPercent > 80 ? '湿润多云' : '清爽干燥'}</div>
            </div>
            <div class="telemetry-card">
              <div class="lbl">思绪风场 (Wind Field)</div>
              <div class="val" style="color:#fff;">${esc(cur.windDirectionName)}风</div>
              <div class="lbl">${cur.windSpeedKmH} km/h</div>
            </div>
          </div>

          <!-- SVG Weather Map -->
          <div class="synoptic-map-wrap ${chartData.isEmpty ? 'is-empty' : ''}">
            ${isobarsSvg}
          </div>

          <div class="map-legend">
            <div class="legend-item"><div class="legend-color" style="background:#ff0054;"></div><span>低压中心 (L) / 气旋雨带</span></div>
            <div class="legend-item"><div class="legend-color" style="background:#3a86ff;"></div><span>高压中心 (H) / 晴朗平稳</span></div>
            <div class="legend-item"><div class="legend-color" style="background:#00f0ff;"></div><span>等压线 (Isobars)</span></div>
            <div class="legend-item"><div class="legend-color" style="background:#ffbe0b;"></div><span>风向矢量箭头</span></div>
          </div>

          <!-- Recent Days Sequence Strip -->
          <div class="timeline-section">
            <h3>📅 近期气象观测序列 (点击切换观测标本)</h3>
            <div class="window-stat">
              全窗口 ${chartData.windowSize} 条 · 平均强度 ${stats.averageIntensity.toFixed(1)} 级 · 平均气压 ${stats.averagePressure} hPa · 主导标签 ${esc(stats.dominantTag)}
            </div>
            <div class="records-strip" role="listbox" aria-label="气象观测标本">
              ${
                chartData.records.length === 0
                  ? '<div class="strip-empty">尚无观测标本</div>'
                  : chartData.records
                      .map(
                        r => `
                <button type="button" role="option" aria-selected="${r.id === chartData.focusRecordId}"
                  class="record-pill ${r.id === chartData.focusRecordId ? 'active' : ''}" data-id="${r.id}">
                  <div class="pill-date">${esc(r.date.slice(5))}</div>
                  <div class="pill-icon">${(TAG_METAS[r.tag] || TAG_METAS[DEFAULT_TAG]).icon}</div>
                  <div class="pill-tag">${esc(r.tag)}</div>
                  <div class="pill-pressure">${r.pressureHpa} hPa</div>
                </button>
              `
                      )
                      .join('')
              }
            </div>
          </div>
        </main>

        <!-- Right: Zones, Monsoon, Alerts, Export/Share -->
        <aside class="right-column">
          <!-- Barometric Zones -->
          <section class="side-panel">
            <h3>🧭 情绪气压带分布</h3>
            <div class="panel-window-note">统计口径：全窗口 ${chartData.windowSize} 条 · 平均气压 ${stats.averagePressure} hPa</div>
            <div class="zone-list">
              ${chartData.zones
                .map(
                  z => `
                <div class="zone-card">
                  <div class="zone-header">
                    <span class="zone-name">${esc(z.name)}</span>
                    <span class="zone-ratio">${z.activeRatio}% 频次</span>
                  </div>
                  <div class="zone-progress-bg">
                    <div class="zone-progress-fill" style="width: ${z.activeRatio}%"></div>
                  </div>
                  <div class="zone-desc">${esc(z.psychologicalState)}</div>
                </div>
              `
                )
                .join('')}
            </div>
          </section>

          <!-- Monsoon Trends -->
          <section class="side-panel">
            <h3>🌬️ 季风走势与大气环流</h3>
            <div class="monsoon-card">
              <div class="monsoon-vector-title">
                <span>🍃</span>
                <span>${esc(chartData.monsoon.vectorName)}</span>
              </div>
              <div class="monsoon-meta">
                <div>流场源动力：${esc(chartData.monsoon.originSource)}</div>
                <div>流动强度：${esc(chartData.monsoon.flowSpeed)} · 近 ${chartData.monsoon.frequencyDays} 日窗口</div>
              </div>
              <div class="monsoon-forecast-box">
                <strong>未来三日气象推演：</strong>
                <div>${esc(chartData.monsoon.upcomingForecast)}</div>
              </div>
            </div>
          </section>

          <!-- Extreme Weather Alerts -->
          <section class="side-panel">
            <h3>⚠️ 极端天气预警与自愈指南</h3>
            <div class="alerts-list">
              ${
                chartData.alerts.length > 0
                  ? chartData.alerts
                      .map(
                        a => `
                    <div class="alert-item ${a.level}">
                      <div class="alert-title-row">
                        <span class="alert-name">${esc(a.title)}</span>
                        <span class="alert-level-badge" style="background:rgba(255,255,255,0.1);color:#fff;">${a.level}</span>
                      </div>
                      <div class="alert-cause">${esc(a.triggerCause)}</div>
                      <div class="alert-issued">🗓️ 对应标本 ${esc(a.issuedTime)}</div>
                      <div class="defense-guide-title">🛡️ 防灾避险自愈协议：</div>
                      <ul class="defense-list">
                        ${a.defenseProtocol.map(p => `<li>${esc(p)}</li>`).join('')}
                      </ul>
                    </div>
                  `
                      )
                      .join('')
                  : `
                    <div style="font-size:13px;color:var(--met-muted);background:var(--met-card);padding:14px;border-radius:8px;">
                      ✅ ${chartData.isEmpty ? '暂无标本，无预警。' : '当前心境空域晴朗，无活动极端灾害天气警报。'}
                    </div>
                  `
              }
            </div>
          </section>

          <!-- Unified Export / Share -->
          <section class="side-panel">
            <h3>📤 导出 / 分享（与屏幕同快照）</h3>
            <div class="export-check ${exportPrep.ok ? 'ok' : 'fail'}">
              ${
                exportPrep.ok
                  ? '<span class="check-flag">✅ 校验通过</span>'
                  : '<span class="check-flag">⛔ 校验未通过</span>'
              }
              <span class="check-meta">${exportPrep.ok ? `${exportPrep.sizeBytes} 字节 · checksum ${exportPrep.payload?.checksum ?? ''}` : '已阻止导出'}</span>
            </div>
            ${
              exportPrep.errors.length > 0
                ? `<ul class="export-msgs err">${exportPrep.errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul>`
                : ''
            }
            ${
              exportPrep.warnings.length > 0
                ? `<ul class="export-msgs warn">${exportPrep.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>`
                : ''
            }
            <details class="export-preview" ${exportPrep.ok ? 'open' : ''}>
              <summary>预览分享文本</summary>
              <pre class="share-text">${esc(exportPrep.shareText)}</pre>
            </details>
            <div class="export-actions">
              <button type="button" class="btn-reset" id="btnShare" ${exportPrep.ok ? '' : 'disabled'}>🔗 复制分享文本</button>
              <button type="button" class="btn-record-mood" id="btnExport" ${exportPrep.ok ? '' : 'disabled'}>⬇️ 下载 JSON 快照</button>
            </div>
            <div class="export-status" id="exportStatus" role="status" aria-live="polite"></div>
          </section>
        </aside>
      </div>

      <!-- Modal: Record Daily Mood Weather -->
      ${
        isModalOpen
          ? `
        <div class="modal-backdrop" id="modalBackdrop">
          <div class="modal-dialog" role="dialog" aria-modal="true" aria-label="今日心情气象签到">
            <h3>✍️ 今日心情气象签到</h3>

            <label style="font-size:12px;color:var(--met-muted);display:block;margin-bottom:8px;">选择今日核心气象标签：</label>
            <div class="tag-selector-grid">
              ${Object.values(TAG_METAS)
                .map(
                  m => `
                <button type="button" class="tag-btn ${m.tag === selectedTag ? 'active' : ''}" data-tag="${m.tag}" aria-pressed="${m.tag === selectedTag}">
                  <span style="font-size:16px;">${m.icon}</span>
                  <span>${m.tag}</span>
                </button>
              `
                )
                .join('')}
            </div>

            <div class="form-group">
              <label>气象对流强度 (1 - 10 级)：<span id="intensityVal" style="color:var(--met-cyan);font-weight:bold;">${selectedIntensity}</span></label>
              <input type="range" class="form-range" id="intensityInput" min="1" max="10" value="${selectedIntensity}" />
            </div>

            <div class="form-group">
              <label>观测记录与心绪注记（最多 ${MOOD_LIMITS.noteMaxLength} 字）：</label>
              <textarea class="form-textarea" id="noteInput" maxlength="${MOOD_LIMITS.noteMaxLength}" placeholder="写下引起今天气压变化的事情或思绪...">${esc(noteText)}</textarea>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-reset" id="btnCancelModal">取消</button>
              <button type="button" class="btn-record-mood" id="btnSubmitModal">保存并更新气象图</button>
            </div>
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;

  // Attach event listeners
  container.querySelector('#btnOpenLog')?.addEventListener('click', handlers.onOpenLogModal);
  container.querySelector('#btnReset')?.addEventListener('click', handlers.onResetData);
  container.querySelector('#btnFocusLatest')?.addEventListener('click', handlers.onFocusLatest);

  container.querySelectorAll('.record-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const id = pill.getAttribute('data-id');
      const rec = chartData.records.find(r => r.id === id);
      if (rec && id !== chartData.focusRecordId) handlers.onSelectRecord(rec);
    });
  });

  // Export / share: act on the same validated snapshot rendered above
  const statusEl = container.querySelector('#exportStatus') as HTMLElement | null;
  const setStatus = (text: string, ok: boolean) => {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = `export-status ${ok ? 'ok' : 'fail'}`;
  };

  container.querySelector('#btnShare')?.addEventListener('click', async () => {
    const prep = prepareExport(chartData);
    if (!prep.ok) {
      setStatus(prep.errors[0] ?? '校验未通过，已阻止分享。', false);
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(prep.shareText);
      } else {
        const ta = document.createElement('textarea');
        ta.value = prep.shareText;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setStatus('✅ 已复制与屏幕一致的分享文本。', true);
    } catch {
      setStatus('❌ 复制失败，请手动选择预览文本复制。', false);
    }
  });

  container.querySelector('#btnExport')?.addEventListener('click', () => {
    const prep = prepareExport(chartData);
    if (!prep.ok || !prep.payload) {
      setStatus(prep.errors[0] ?? '校验未通过，已阻止导出。', false);
      return;
    }
    const blob = new Blob([JSON.stringify(prep.payload, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = prep.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus(`✅ 已导出 ${prep.fileName}（${prep.sizeBytes} 字节，校验通过）。`, true);
  });

  if (isModalOpen) {
    container.querySelectorAll('.tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag');
        if (tag) onTagChange(tag);
      });
    });

    const intensitySlider = container.querySelector('#intensityInput') as HTMLInputElement;
    if (intensitySlider) {
      intensitySlider.addEventListener('input', () => {
        onIntensityChange(parseInt(intensitySlider.value, 10));
      });
    }

    const noteBox = container.querySelector('#noteInput') as HTMLTextAreaElement;
    if (noteBox) {
      noteBox.addEventListener('input', () => {
        onNoteChange(noteBox.value);
      });
    }

    container.querySelector('#btnCancelModal')?.addEventListener('click', onCloseModal);
    container.querySelector('#modalBackdrop')?.addEventListener('click', e => {
      if (e.target === container.querySelector('#modalBackdrop')) {
        onCloseModal();
      }
    });
    // Esc 关闭，焦点在输入控件上时不吞掉字符
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseModal();
        document.removeEventListener('keydown', onKey);
      }
    };
    document.addEventListener('keydown', onKey);

    container.querySelector('#btnSubmitModal')?.addEventListener('click', () => {
      document.removeEventListener('keydown', onKey);
      handlers.onSubmitLog(selectedTag, selectedIntensity, noteText);
    });
  }
}
