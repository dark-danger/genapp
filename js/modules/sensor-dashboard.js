// ============================================================
// GenApp — Module 7: Live Sensor Dashboard
// ============================================================

import { store } from '../store.js';
import { showToast } from '../app.js';
import { router } from '../router.js';

let charts = {};
let storeUnsubscribe = null;

export function renderSensorDashboard(container) {
  const sensors = store.get('sensors') || {};
  const sensorKeys = Object.keys(sensors);

  if (sensorKeys.length === 0) {
    container.innerHTML = `
      <div class="sensor-dashboard-page page-enter">
        <div class="page-header">
          <h1 class="page-title">Live Telemetry Monitor</h1>
          <p class="page-subtitle">Real-time analytical graphs of your device sensors</p>
        </div>
        
        <div class="card" style="text-align: center; padding: var(--space-12) var(--space-6); background: var(--bg-surface); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: var(--radius-lg); margin-top: var(--space-6);">
          <div style="font-size: 4rem; margin-bottom: var(--space-4);">📊</div>
          <h2 style="font-size: var(--text-xl); font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-2);">No Live Sensor Telemetry</h2>
          <p style="color: var(--text-muted); font-size: var(--text-sm); max-width: 420px; margin: 0 auto var(--space-8); line-height:1.5;">
            There are no active data streams. Connect a Bluetooth, WiFi, or MQTT controller transmitting formatted telemetry packets to populate graphs.
          </p>
          <button class="btn btn-primary" id="dashboard-redirect-devices-btn">Connect Device</button>
        </div>
      </div>
    `;

    document.getElementById('dashboard-redirect-devices-btn')?.addEventListener('click', () => {
      router.navigate('devices');
    });
    return;
  }

  container.innerHTML = `
    <div class="sensor-dashboard-page page-enter">
      <div class="page-header flex justify-between items-center" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:var(--space-4);">
        <div>
          <h1 class="page-title">Live Telemetry Monitor</h1>
          <p class="page-subtitle">Real-time numerical values and historical wave-charts of hardware telemetry</p>
        </div>
        <div class="flex gap-3" style="display:flex; gap:var(--space-2);">
          <button class="btn btn-secondary btn-sm" id="export-csv">📄 Export CSV</button>
          <button class="btn btn-secondary btn-sm" id="export-json">📋 Export JSON</button>
        </div>
      </div>

      <!-- Sensor Cards Grid -->
      <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-5); margin-top: var(--space-6); margin-bottom: var(--space-8);">
        ${sensorKeys.map(key => {
          const s = sensors[key];
          const color = getSensorColor(key);
          const minVal = s.min !== undefined ? s.min : 0;
          const maxVal = s.max !== undefined ? s.max : 100;
          const pct = Math.max(0, Math.min(100, ((s.value - minVal) / (maxVal - minVal || 1)) * 100));

          return `
            <div class="card stat-card" id="sensor-card-${key}" style="border-left: 4px solid ${color}; padding: var(--space-4); background: var(--bg-surface); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
              <div class="stat-card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-2);">
                <span class="stat-card-label" style="font-size:var(--text-xs); color:var(--text-muted); font-weight:600; text-transform:uppercase;">${formatName(key)}</span>
                <span class="chip" style="font-size: 8px; padding: 2px 6px; background: rgba(34,197,94,0.12); color: var(--color-accent); border: 1px solid var(--color-accent); border-radius: var(--radius-sm);">LIVE</span>
              </div>
              <div class="stat-card-value" style="color: var(--text-primary); font-size: var(--text-2xl); font-weight: 700; display:flex; align-items:baseline; gap:2px;">
                <span id="sensor-val-${key}">${s.value}</span>
                <span style="font-size: var(--text-xs); color: var(--text-muted); font-weight: 500;">${s.unit || ''}</span>
              </div>
              <div class="progress-bar" style="height: 6px; background: rgba(255,255,255,0.06); border-radius: var(--radius-full); margin-top: var(--space-3); overflow:hidden;">
                <div class="progress-bar-fill" style="width: ${pct}%; height:100%; background: ${color}; transition: width 0.3s; border-radius: var(--radius-full);" id="sensor-bar-${key}"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Historical Graphs -->
      <div class="section-header" style="margin-bottom: var(--space-4);">
        <h2 class="section-title" style="font-size: var(--text-lg); font-weight:700;">Sensor Waveform History</h2>
      </div>
      <div class="dashboard-grid-wide" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-5);">
        ${sensorKeys.map(key => {
          return `
            <div class="card" id="chart-card-${key}" style="background: var(--bg-surface); border: 1px solid rgba(255,255,255,0.05); padding: var(--space-4); border-radius: var(--radius-lg);">
              <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-4);">
                <span class="card-title" style="font-weight:600; font-size:var(--text-sm);">${formatName(key)} History</span>
                <span style="font-size:var(--text-xs); color:var(--text-tertiary);">Recent telemetry packets</span>
              </div>
              <div style="height: 180px; position:relative;">
                <canvas id="chart-${key}"></canvas>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Draw Charts
  setTimeout(() => renderCharts(sensors), 100);

  // Bind export operations
  document.getElementById('export-csv')?.addEventListener('click', () => {
    let csv = 'Timestamp,Sensor,Value,Unit\n';
    const currentSensors = store.get('sensors') || {};
    const now = new Date().toISOString();
    Object.entries(currentSensors).forEach(([k, s]) => {
      csv += `${now},${k},${s.value},${s.unit || ''}\n`;
    });
    downloadFile(csv, 'telemetry.csv', 'text/csv');
    showToast('📄 Telemetry CSV exported', 'success');
  });

  document.getElementById('export-json')?.addEventListener('click', () => {
    const currentSensors = store.get('sensors') || {};
    downloadFile(JSON.stringify(currentSensors, null, 2), 'telemetry.json', 'application/json');
    showToast('📋 Telemetry JSON exported', 'success');
  });

  // Telemetry real-time updates observer
  setupTelemetryObserver();
}

function renderCharts(sensors) {
  Object.entries(sensors).forEach(([key, s]) => {
    const canvas = document.getElementById(`chart-${key}`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    
    // Safety check for hidden/collapsed page elements
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    const history = s.history || [];
    const minVal = s.min !== undefined ? s.min : (Math.min(...history, 0) - 5);
    const maxVal = s.max !== undefined ? s.max : (Math.max(...history, 100) + 5);

    drawChart(ctx, rect.width, rect.height, history, getSensorColor(key), minVal, maxVal);
    charts[key] = { ctx, w: rect.width, h: rect.height, color: getSensorColor(key), min: minVal, max: maxVal };
  });
}

function drawChart(ctx, w, h, data, color, min, max) {
  ctx.clearRect(0, 0, w, h);
  const range = max - min || 1;
  const padding = { top: 15, bottom: 25, left: 10, right: 10 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  // Render network lines
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
  }

  if (data.length === 0) {
    ctx.fillStyle = 'var(--text-tertiary)';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Awaiting sensor packet frame...', w / 2, h / 2);
    return;
  }

  // Draw graph line
  ctx.beginPath();
  data.forEach((val, i) => {
    const x = padding.left + (i / Math.max(1, data.length - 1)) * chartW;
    const y = padding.top + chartH - ((val - min) / range) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Gradient area fill
  const lastX = padding.left + chartW;
  const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
  gradient.addColorStop(0, color + '15');
  gradient.addColorStop(1, color + '00');
  ctx.lineTo(lastX, h - padding.bottom);
  ctx.lineTo(padding.left, h - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Bottom timeline/labels
  ctx.fillStyle = 'var(--text-tertiary)';
  ctx.font = '10px Inter';
  ctx.textAlign = 'center';
  
  const labelCount = Math.min(data.length, 5);
  for (let i = 0; i < labelCount; i++) {
    const dataIndex = Math.floor((i / (labelCount - 1 || 1)) * (data.length - 1));
    const x = padding.left + (dataIndex / Math.max(1, data.length - 1)) * chartW;
    ctx.fillText(`-${data.length - 1 - dataIndex}s`, x, h - 5);
  }
}

function setupTelemetryObserver() {
  if (storeUnsubscribe) {
    storeUnsubscribe();
  }

  storeUnsubscribe = store.subscribe('sensors', (sensors = {}) => {
    Object.entries(sensors).forEach(([key, s]) => {
      // 1. Update card value
      const valEl = document.getElementById(`sensor-val-${key}`);
      if (valEl) valEl.textContent = s.value;

      // 2. Update progress bar fill
      const barEl = document.getElementById(`sensor-bar-${key}`);
      if (barEl) {
        const minVal = s.min !== undefined ? s.min : 0;
        const maxVal = s.max !== undefined ? s.max : 100;
        const pct = Math.max(0, Math.min(100, ((s.value - minVal) / (maxVal - minVal || 1)) * 100));
        barEl.style.width = pct + '%';
      }

      // 3. Redraw chart context
      if (charts[key]) {
        const c = charts[key];
        const history = s.history || [];
        const minVal = s.min !== undefined ? s.min : (Math.min(...history, 0) - 5);
        const maxVal = s.max !== undefined ? s.max : (Math.max(...history, 100) + 5);
        c.min = minVal;
        c.max = maxVal;
        drawChart(c.ctx, c.w, c.h, history, c.color, minVal, maxVal);
      }
    });
  });
}

function formatName(key) {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
}

function getSensorColor(key) {
  const colors = {
    temperature: '#EF4444', // Red Danger
    humidity: '#06B6D4',    // Cyan Secondary
    gas: '#F59E0B',         // Amber Warning
    smoke: '#EF4444',       // Red Danger
    ultrasonic: '#3B82F6',  // Blue Light
    voltage: '#22C55E',     // Green Accent
    current: '#10B981',     // Emerald Success
    ir: '#6366F1'           // Indigo
  };
  return colors[key] || '#2563EB';
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
