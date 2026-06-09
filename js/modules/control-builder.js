// ============================================================
// GenApp — Module 5: Custom Control Builder ⭐
// ============================================================

import { store } from '../store.js';
import { showToast } from '../app.js';
import { storage } from '../services/storage.js';
import { connectivity } from '../services/connectivity.js';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

async function triggerHaptic(type = 'light') {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}
  }
}

let widgets = [];
let selectedWidget = null;
let widgetIdCounter = 0;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let isRunMode = false;
let storeUnsubscribe = null;

const WIDGET_TYPES = [
  { type: 'button', label: 'Push Button', icon: '⬛', defaultW: 120, defaultH: 50 },
  { type: 'slider', label: 'Fader / Slider', icon: '🎚️', defaultW: 220, defaultH: 50 },
  { type: 'switch', label: 'Toggle Switch', icon: '🔘', defaultW: 90, defaultH: 50 },
  { type: 'joystick', label: 'Joystick', icon: '🕹️', defaultW: 160, defaultH: 160 },
  { type: 'gauge', label: 'Telemetry Gauge', icon: '🎯', defaultW: 160, defaultH: 120 },
  { type: 'chart', label: 'Sensor Chart', icon: '📈', defaultW: 260, defaultH: 160 },
  { type: 'sensor', label: 'Sensor Text', icon: '🌡️', defaultW: 140, defaultH: 80 },
  { type: 'label', label: 'Static Label', icon: '📝', defaultW: 120, defaultH: 40 },
  { type: 'icon', label: 'Status Icon', icon: '⭐', defaultW: 60, defaultH: 60 },
];

const COLORS = [
  '#2E8B57', // Sea Green Primary
  '#3CB371', // Medium Sea Green Secondary
  '#40E0B0', // Bright Teal-Green Accent
  '#22C55E', // Green Success
  '#10B981', // Emerald Success
  '#F59E0B', // Amber Warning
  '#EF4444', // Red Danger
  '#94A3B8', // Slate Muted
  '#FFFFFF'  // White
];

export function renderControlBuilder(container) {
  container.innerHTML = `
    <div class="control-builder-page page-enter">
      <div class="page-header flex justify-between items-center" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:var(--space-4);">
        <div>
          <h1 class="page-title">Custom Dashboard Builder</h1>
          <p class="page-subtitle">Assemble and map tactile buttons, telemetry gauges, and sliders for custom setups</p>
        </div>
        <div class="flex items-center gap-3 flex-wrap" style="display:flex; align-items:center; gap:var(--space-3); flex-wrap:wrap;">
          <!-- Run/Edit Switch -->
          <div class="flex items-center gap-2" style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); padding: 6px 14px; border-radius: var(--radius-md); display:flex; align-items:center; gap: 0.5rem;">
            <span style="font-size: var(--text-xs); font-weight:700; color:var(--text-muted); text-transform:uppercase;">🔧 Edit</span>
            <label class="toggle-switch" style="width:40px; height:22px; position:relative; display:inline-block;"><input type="checkbox" id="run-mode-toggle" ${isRunMode ? 'checked' : ''} style="opacity:0; width:0; height:0;"><span class="toggle-slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:rgba(255,255,255,0.1); transition:0.3s; border-radius:34px;"></span></label>
            <span style="font-size: var(--text-xs); font-weight:700; color:var(--color-accent); text-transform:uppercase;">▶ Run</span>
          </div>
          
          <button class="btn btn-secondary btn-sm" id="builder-clear">🗑️ Clear</button>
          <button class="btn btn-secondary btn-sm" id="builder-export">📤 Export</button>
          <button class="btn btn-secondary btn-sm" id="builder-import">📥 Import</button>
          <button class="btn btn-primary btn-sm" id="builder-save">💾 Save Layout</button>
        </div>
      </div>

      <div class="builder-layout" style="display: grid; grid-template-columns: 240px 1fr 280px; gap: var(--space-5); margin-top: var(--space-4); min-height: 500px; align-items: stretch;">
        <!-- Left Component Palette -->
        <div class="builder-palette" style="background: var(--bg-surface); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-lg); padding: var(--space-4); display:flex; flex-direction:column; gap:var(--space-4); overflow-y:auto; transition:opacity 0.2s;">
          <div>
            <div style="font-size: var(--text-xs); font-weight:600; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); margin-bottom: var(--space-2);">Palettes</div>
            <p style="font-size:var(--text-xs); color:var(--text-tertiary); margin:0;">Drag components to canvas grid</p>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${WIDGET_TYPES.map(w => `
              <div class="palette-item" draggable="true" data-widget-type="${w.type}" id="palette-${w.type}" style="display:flex; align-items:center; gap:var(--space-2); background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:var(--radius-md); padding:10px var(--space-3); cursor:grab; font-size:var(--text-sm); font-weight:500; color:var(--text-secondary); transition: all 0.2s;">
                <span style="font-size: var(--text-base);">${w.icon}</span>
                <span>${w.label}</span>
              </div>
            `).join('')}
          </div>
          
          <div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:var(--space-4);">
            <div style="font-size: var(--text-xs); font-weight:600; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); margin-bottom: var(--space-3);">Dashboard Templates</div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <div class="palette-item" id="template-car" style="cursor:pointer; display:flex; align-items:center; gap:8px; background:rgba(37,99,235,0.05); border:1px solid rgba(37,99,235,0.15); border-radius:var(--radius-md); padding:8px var(--space-3); font-size:var(--text-sm); font-weight:500;">
                <span style="font-size: var(--text-sm)">🚗</span>
                <span>Smart Car Controller</span>
              </div>
              <div class="palette-item" id="template-home" style="cursor:pointer; display:flex; align-items:center; gap:8px; background:rgba(6,182,212,0.05); border:1px solid rgba(6,182,212,0.15); border-radius:var(--radius-md); padding:8px var(--space-3); font-size:var(--text-sm); font-weight:500;">
                <span style="font-size: var(--text-sm)">🏠</span>
                <span>Home Automation</span>
              </div>
              <div class="palette-item" id="template-sensor" style="cursor:pointer; display:flex; align-items:center; gap:8px; background:rgba(34,197,94,0.05); border:1px solid rgba(34,197,94,0.15); border-radius:var(--radius-md); padding:8px var(--space-3); font-size:var(--text-sm); font-weight:500;">
                <span style="font-size: var(--text-sm)">📈</span>
                <span>Sensor Metrics Panel</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Center Canvas -->
        <div class="builder-canvas" id="builder-canvas" style="position:relative; background: var(--bg-surface); border: 2px dashed rgba(255,255,255,0.06); border-radius: var(--radius-lg); overflow:hidden; background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 20px 20px;">
          <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; color:var(--text-muted); pointer-events:none;" id="canvas-placeholder">
            <div style="font-size: 48px; margin-bottom: var(--space-4);">🎨</div>
            <div style="font-size: var(--text-lg); font-weight:600; color:var(--text-primary);">Design Layout Canvas</div>
            <p style="font-size: var(--text-sm); margin: var(--space-2) 0 0 0; color: var(--text-muted); max-width:320px; line-height:1.4;">
              Drag UI controllers from the left palette, place them on the grid, and map hardware commands.
            </p>
          </div>
        </div>

        <!-- Right Side Properties Panel -->
        <div class="builder-properties" id="builder-properties" style="background: var(--bg-surface); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-lg); padding: var(--space-4); display:flex; flex-direction:column; gap:var(--space-4); overflow-y:auto;">
          <div style="font-size: var(--text-xs); font-weight:600; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); margin-bottom: var(--space-1);">Properties Inspector</div>
          <div id="properties-content" style="color: var(--text-tertiary); font-size: var(--text-sm); flex: 1;">
            Select a widget on the canvas to configure variables.
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach Custom Toggle Slider Styles
  const sliderToggle = container.querySelector('#run-mode-toggle');
  if (sliderToggle) {
    const slideTrack = container.querySelector('.toggle-slider');
    sliderToggle.addEventListener('change', () => {
      if (sliderToggle.checked) {
        slideTrack.style.backgroundColor = 'var(--color-accent)';
      } else {
        slideTrack.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      }
    });
  }

  setupBuilderEvents(container);
  
  // Set initial run state
  isRunMode = false;
  selectedWidget = null;
  renderAllWidgets();
}

function setupBuilderEvents(container) {
  const canvas = document.getElementById('builder-canvas');
  if (!canvas) return;

  // Run / Edit Switch Action
  document.getElementById('run-mode-toggle')?.addEventListener('change', (e) => {
    isRunMode = e.target.checked;
    
    const palette = document.querySelector('.builder-palette');
    const props = document.getElementById('builder-properties');
    
    if (isRunMode) {
      canvas.classList.add('run-mode');
      canvas.style.borderColor = 'rgba(34, 197, 94, 0.2)';
      selectWidget(null);
      if (props) props.style.display = 'none';
      if (palette) {
        palette.style.opacity = '0.2';
        palette.style.pointerEvents = 'none';
      }
      showToast('▶ Live Dashboard active!', 'success');
      
      // Start listening to telemetry store
      setupTelemetryObserver();
    } else {
      canvas.classList.remove('run-mode');
      canvas.style.borderColor = 'rgba(255,255,255,0.06)';
      if (props) props.style.display = 'block';
      if (palette) {
        palette.style.opacity = '1';
        palette.style.pointerEvents = 'auto';
      }
      showToast('🔧 Design Mode active.', 'info');
      
      // Stop telemetry observer
      if (storeUnsubscribe) {
        storeUnsubscribe();
        storeUnsubscribe = null;
      }
    }
    renderAllWidgets();
  });

  // Palette Drag Operations
  document.querySelectorAll('.palette-item[draggable]').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('widget-type', item.dataset.widgetType);
    });
  });

  canvas.addEventListener('dragover', (e) => e.preventDefault());
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('widget-type');
    if (!type) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    addWidget(type, x, y);
  });

  canvas.addEventListener('click', (e) => {
    if (e.target === canvas) {
      selectWidget(null);
    }
  });

  // Templates
  document.getElementById('template-car')?.addEventListener('click', () => loadTemplate('car'));
  document.getElementById('template-home')?.addEventListener('click', () => loadTemplate('home'));
  document.getElementById('template-sensor')?.addEventListener('click', () => loadTemplate('sensor'));

  // Save/Export/Import/Clear
  document.getElementById('builder-save')?.addEventListener('click', async () => {
    await storage.set('genapp-builder-layout', JSON.stringify(widgets));
    showToast('💾 Custom dashboard layout saved', 'success');
  });

  document.getElementById('builder-export')?.addEventListener('click', () => {
    const data = JSON.stringify(widgets, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'genapp-layout.json'; a.click();
    URL.revokeObjectURL(url);
    showToast('📤 Configuration exported', 'success');
  });

  document.getElementById('builder-import')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          widgets = data;
          
          // Re-index widget ID counter based on existing
          widgets.forEach(w => {
            const num = parseInt(w.id.replace('w', ''));
            if (!isNaN(num) && num > widgetIdCounter) widgetIdCounter = num;
          });

          renderAllWidgets();
          showToast('📥 Custom dashboard imported', 'success');
        } catch { showToast('Invalid JSON config schema', 'error'); }
      };
      reader.readAsText(file);
    };
    input.click();
  });

  document.getElementById('builder-clear')?.addEventListener('click', () => {
    widgets = [];
    renderAllWidgets();
    selectWidget(null);
    showToast('Canvas cleared', 'info');
  });

  // Load Persisted Custom Dashboard Layout
  storage.get('genapp-builder-layout').then(saved => {
    if (saved) {
      try { 
        widgets = JSON.parse(saved); 
        widgets.forEach(w => {
          const num = parseInt(w.id.replace('w', ''));
          if (!isNaN(num) && num > widgetIdCounter) widgetIdCounter = num;
        });
        renderAllWidgets(); 
      } catch {}
    }
  });
}

function addWidget(type, x, y) {
  const def = WIDGET_TYPES.find(w => w.type === type);
  if (!def) return;

  const widget = {
    id: 'w' + (++widgetIdCounter),
    type,
    x: Math.round(x / 20) * 20,
    y: Math.round(y / 20) * 20,
    width: def.defaultW,
    height: def.defaultH,
    color: '#2E8B57',
    label: def.label,
    command: '',
    mqttTopic: '',
    animation: 'none',
    icon: def.icon
  };

  widgets.push(widget);
  renderWidget(widget);
  selectWidget(widget.id);
  hidePlaceholder();
}

function renderWidget(widget) {
  const canvas = document.getElementById('builder-canvas');
  if (!canvas) return;

  const el = document.createElement('div');
  el.className = `builder-widget ${isRunMode ? 'run-mode' : ''}`;
  el.id = `widget-${widget.id}`;
  el.style.position = 'absolute';
  el.style.left = widget.x + 'px';
  el.style.top = widget.y + 'px';
  el.style.width = widget.width + 'px';
  el.style.height = widget.height + 'px';
  el.style.border = isRunMode ? 'none' : '1px dashed rgba(255,255,255,0.15)';
  el.style.background = isRunMode ? 'rgba(30, 41, 59, 0.4)' : 'rgba(30, 41, 59, 0.2)';
  el.style.borderRadius = 'var(--radius-md)';
  el.style.overflow = 'hidden';
  el.style.boxShadow = isRunMode ? 'var(--shadow-sm)' : 'none';
  el.innerHTML = renderWidgetContent(widget);
  
  canvas.appendChild(el);

  if (isRunMode) {
    // RUN MODE: Interactivity Attachments
    const btn = el.querySelector('.widget-btn');
    if (btn) {
      btn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        triggerHaptic('light');
        const cmd = widget.command || `WIDGET_${widget.id}`;
        connectivity.send(cmd);
      });
    }

    const slider = el.querySelector('.widget-slider');
    if (slider) {
      slider.addEventListener('change', (e) => {
        e.stopPropagation();
        const val = e.target.value;
        const cmd = `${widget.command || `WIDGET_${widget.id}`}:${val}`;
        connectivity.send(cmd);
      });
    }

    const checkbox = el.querySelector('.widget-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        const state = e.target.checked ? 'ON' : 'OFF';
        const cmd = `${widget.command || `WIDGET_${widget.id}`}_${state}`;
        connectivity.send(cmd);
      });
    }
  } else {
    // DESIGN MODE: Drag-Move, Selection & Resize UI
    el.addEventListener('mousedown', (e) => startDrag(e, widget));
    el.addEventListener('touchstart', (e) => startDrag(e, widget), { passive: false });
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectWidget(widget.id);
    });
  }
}

function renderWidgetContent(widget) {
  const isConnected = store.get('connection.status') === 'connected';
  const sensors = store.get('sensors') || {};

  // Check matching sensor telemetry from properties mappings
  let currentVal = '--';
  let unit = '';
  
  const mappedKey = (widget.command || widget.label || '').trim().toLowerCase();
  
  if (mappedKey.includes('temp') || mappedKey === 't') {
    currentVal = sensors.temperature?.value !== undefined ? sensors.temperature.value : '--';
    unit = '°C';
  } else if (mappedKey.includes('humid') || mappedKey === 'h') {
    currentVal = sensors.humidity?.value !== undefined ? sensors.humidity.value : '--';
    unit = '%';
  } else if (mappedKey.includes('gas') || mappedKey === 'g') {
    currentVal = sensors.gas?.value !== undefined ? sensors.gas.value : '--';
    unit = ' ppm';
  } else if (mappedKey.includes('smoke') || mappedKey === 's') {
    currentVal = sensors.smoke?.value !== undefined ? sensors.smoke.value : '--';
    unit = ' ppm';
  }

  const style = `color: var(--text-primary); display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:4px; font-size:var(--text-xs); user-select:none; padding: var(--space-2); box-sizing:border-box;`;
  const pointerEvents = isRunMode ? 'auto' : 'none';
  
  switch (widget.type) {
    case 'button':
      return `<div style="${style}"><button class="widget-btn" style="background:${widget.color}; color: white; border: none; border-radius: var(--radius-sm); padding: 8px 16px; font-weight:600; font-size: var(--text-sm); width: 100%; height: 100%; cursor: pointer; pointer-events:${pointerEvents}; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);">${widget.label}</button></div>`;
    
    case 'slider':
      return `
        <div style="${style}">
          <span style="font-weight: 500; font-size:var(--text-xs); color: var(--text-secondary); margin-bottom:2px;">${widget.label}</span>
          <input type="range" class="widget-slider" min="0" max="255" value="127" style="width:95%; pointer-events:${pointerEvents}; cursor:pointer; accent-color:${widget.color};" />
        </div>
      `;
    
    case 'switch':
      return `
        <div style="${style}">
          <label style="position:relative; display:inline-block; width:46px; height:24px; pointer-events:${pointerEvents}; cursor:pointer;">
            <input type="checkbox" class="widget-checkbox" checked style="opacity:0; width:0; height:0;">
            <span style="position:absolute; top:0; left:0; right:0; bottom:0; border-radius:34px; background-color:${widget.color}; transition:0.2s;"></span>
          </label>
          <span style="font-weight:500; margin-top:4px;">${widget.label}</span>
        </div>
      `;
    
    case 'joystick':
      return `
        <div style="${style}; background:rgba(0,0,0,0.2); border-radius:50%; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
          <div style="width: 60px; height: 60px; border-radius: 50%; background: ${widget.color}; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 0 15px rgba(0,0,0,0.3);">🕹️</div>
        </div>
      `;
    
    case 'gauge':
      const numVal = typeof currentVal === 'number' ? currentVal : 0;
      const rotation = -90 + (numVal / 100) * 180;
      return `
        <div style="${style}">
          <svg width="100%" height="60%" viewBox="0 0 100 60" style="margin-bottom:2px;">
            <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6" stroke-linecap="round"/>
            <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="${widget.color}" stroke-width="6" stroke-dasharray="110" stroke-dashoffset="${110 - (numVal / 100) * 110}" stroke-linecap="round" style="transition: stroke-dashoffset 0.3s;"/>
            <text x="50" y="45" text-anchor="middle" fill="var(--text-primary)" font-size="14" font-weight="700" font-family="var(--font-mono)">${currentVal}${unit}</text>
          </svg>
          <span style="font-size:10px; color:var(--text-muted); font-weight:500;">${widget.label}</span>
        </div>
      `;
    
    case 'chart':
      return `
        <div style="${style}; background:rgba(0,0,0,0.15); border-radius:var(--radius-sm); border: 1px solid rgba(255,255,255,0.03);">
          <svg width="100%" height="70%" viewBox="0 0 200 80">
            <polyline fill="none" stroke="${widget.color}" stroke-width="2.5" stroke-linecap="round" points="${getChartPoints(widget)}" style="transition: points 0.3s;"/>
          </svg>
          <span style="font-size:10px; color:var(--text-muted); font-weight:500;">${widget.label}</span>
        </div>
      `;
    
    case 'sensor':
      return `
        <div style="${style}">
          <div style="font-family:var(--font-mono); font-size:var(--text-xl); font-weight:bold; color:${widget.color};">${currentVal}<span style="font-size:var(--text-xs); font-weight:normal; color:var(--text-muted);">${unit}</span></div>
          <span style="font-size:10px; color:var(--text-muted); font-weight:500;">${widget.label}</span>
        </div>
      `;
    
    case 'label':
      return `<div style="${style}; font-size:var(--text-base); font-weight:600; text-align:center;">${widget.label}</div>`;
    
    case 'icon':
      return `<div style="${style}; font-size:28px; color:${widget.color}">${widget.icon}</div>`;
    
    default:
      return `<div style="${style}">${widget.icon} ${widget.label}</div>`;
  }
}

function getChartPoints(widget) {
  const sensors = store.get('sensors') || {};
  const mappedKey = (widget.command || widget.label || '').trim().toLowerCase();
  
  let history = [];
  if (mappedKey.includes('temp') || mappedKey === 't') {
    history = sensors.temperature?.history || [];
  } else if (mappedKey.includes('humid') || mappedKey === 'h') {
    history = sensors.humidity?.history || [];
  } else if (mappedKey.includes('gas') || mappedKey === 'g') {
    history = sensors.gas?.history || [];
  } else if (mappedKey.includes('smoke') || mappedKey === 's') {
    history = sensors.smoke?.history || [];
  }

  if (history.length === 0) {
    return "0,40 50,40 100,40 150,40 200,40";
  }

  const maxVal = Math.max(...history, 100);
  const minVal = Math.min(...history, 0);
  const range = maxVal - minVal || 1;

  const points = history.map((val, index) => {
    const x = (index / (history.length - 1)) * 200;
    const y = 80 - ((val - minVal) / range) * 60 - 10;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return points;
}

function startDrag(e, widget) {
  if (isRunMode) return;
  e.preventDefault();
  isDragging = true;
  selectedWidget = widget.id;
  
  const el = document.getElementById(`widget-${widget.id}`);
  if (!el) return;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const rect = el.getBoundingClientRect();
  dragOffset.x = clientX - rect.left;
  dragOffset.y = clientY - rect.top;

  const onMove = (ev) => {
    if (!isDragging) return;
    const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
    const canvas = document.getElementById('builder-canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    let x = cx - canvasRect.left - dragOffset.x;
    let y = cy - canvasRect.top - dragOffset.y;
    
    // Snap to 20px grid
    x = Math.round(x / 20) * 20;
    y = Math.round(y / 20) * 20;
    
    // Boundary check
    x = Math.max(0, Math.min(canvasRect.width - widget.width, x));
    y = Math.max(0, Math.min(canvasRect.height - widget.height, y));

    el.style.left = x + 'px';
    el.style.top = y + 'px';
    widget.x = x;
    widget.y = y;
  };

  const onEnd = () => {
    isDragging = false;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onEnd);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onEnd);
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd);

  selectWidget(widget.id);
}

function selectWidget(widgetId) {
  selectedWidget = widgetId;
  
  document.querySelectorAll('.builder-widget').forEach(el => {
    el.classList.remove('selected');
    el.style.borderColor = 'rgba(255,255,255,0.15)';
  });
  
  if (widgetId) {
    const el = document.getElementById(`widget-${widgetId}`);
    if (el) {
      el.classList.add('selected');
      el.style.borderColor = 'var(--color-primary)';
    }
    renderProperties(widgetId);
  } else {
    const content = document.getElementById('properties-content');
    if (content) content.innerHTML = '<div style="color: var(--text-tertiary); font-size: var(--text-sm);">Select a widget to edit its properties</div>';
  }
}

function renderProperties(widgetId) {
  const widget = widgets.find(w => w.id === widgetId);
  if (!widget) return;

  const content = document.getElementById('properties-content');
  if (!content) return;

  content.innerHTML = `
    <div class="flex flex-col gap-4" style="display:flex; flex-direction:column; gap: var(--space-4);">
      <div class="input-group">
        <label class="input-label" style="display:block; font-size:var(--text-xs); color:var(--text-muted); margin-bottom:4px;">Display Name</label>
        <input class="input-field" value="${widget.label}" id="prop-label" style="width:100%; box-sizing:border-box;" />
      </div>
      <div class="input-group">
        <label class="input-label" style="display:block; font-size:var(--text-xs); color:var(--text-muted); margin-bottom:6px;">Accent Color</label>
        <div class="flex gap-2 flex-wrap" style="display:flex; gap:6px; flex-wrap:wrap;">
          ${COLORS.map(c => `<div style="width:24px;height:24px;border-radius:6px;background:${c};cursor:pointer;border:2px solid ${widget.color === c ? '#fff' : 'transparent'};transition:border 0.15s;" class="color-pick" data-color="${c}"></div>`).join('')}
        </div>
      </div>
      <div class="flex gap-3" style="display:flex; gap: 0.5rem;">
        <div class="input-group" style="flex:1;">
          <label class="input-label" style="display:block; font-size:var(--text-xs); color:var(--text-muted); margin-bottom:4px;">Width (px)</label>
          <input type="number" class="input-field" value="${widget.width}" id="prop-width" min="40" max="600" style="width:100%; box-sizing:border-box;" />
        </div>
        <div class="input-group" style="flex:1;">
          <label class="input-label" style="display:block; font-size:var(--text-xs); color:var(--text-muted); margin-bottom:4px;">Height (px)</label>
          <input type="number" class="input-field" value="${widget.height}" id="prop-height" min="30" max="400" style="width:100%; box-sizing:border-box;" />
        </div>
      </div>
      <div class="input-group">
        <label class="input-label" style="display:block; font-size:var(--text-xs); color:var(--text-muted); margin-bottom:4px;">Transmit Command / Telemetry Key</label>
        <input class="input-field" value="${widget.command || ''}" placeholder="e.g. temperature, light_toggle" id="prop-command" style="width:100%; box-sizing:border-box;" />
        <span style="font-size: 10px; color: var(--text-tertiary); margin-top:2px; display:block;">Maps to telemetry key (temperature, humidity, gas) or raw trigger command.</span>
      </div>
      
      <button class="btn btn-danger btn-sm" id="prop-delete" style="margin-top: var(--space-4); width:100%;">🗑️ Delete Component</button>
    </div>
  `;

  // Update actions
  document.getElementById('prop-label')?.addEventListener('input', (e) => {
    widget.label = e.target.value;
    updateWidgetEl(widget);
  });

  document.querySelectorAll('.color-pick').forEach(el => {
    el.addEventListener('click', () => {
      widget.color = el.dataset.color;
      updateWidgetEl(widget);
      renderProperties(widgetId);
    });
  });

  document.getElementById('prop-width')?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 40) {
      widget.width = val;
      const el = document.getElementById(`widget-${widget.id}`);
      if (el) el.style.width = widget.width + 'px';
    }
  });

  document.getElementById('prop-height')?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 30) {
      widget.height = val;
      const el = document.getElementById(`widget-${widget.id}`);
      if (el) el.style.height = widget.height + 'px';
    }
  });

  document.getElementById('prop-command')?.addEventListener('input', (e) => { 
    widget.command = e.target.value.trim(); 
  });

  document.getElementById('prop-delete')?.addEventListener('click', () => {
    const el = document.getElementById(`widget-${widget.id}`);
    if (el) el.remove();
    widgets = widgets.filter(w => w.id !== widget.id);
    selectWidget(null);
    if (widgets.length === 0) showPlaceholder();
  });
}

function updateWidgetEl(widget) {
  const el = document.getElementById(`widget-${widget.id}`);
  if (el) el.innerHTML = renderWidgetContent(widget);
}

function renderAllWidgets() {
  const canvas = document.getElementById('builder-canvas');
  if (!canvas) return;
  canvas.querySelectorAll('.builder-widget').forEach(el => el.remove());
  
  if (widgets.length === 0) {
    showPlaceholder();
  } else {
    hidePlaceholder();
    widgets.forEach(w => renderWidget(w));
  }
}

function hidePlaceholder() {
  const ph = document.getElementById('canvas-placeholder');
  if (ph) ph.style.display = 'none';
}

function showPlaceholder() {
  const ph = document.getElementById('canvas-placeholder');
  if (ph) ph.style.display = 'block';
}

function setupTelemetryObserver() {
  // Subscribe to changes in the telemetry sensors state, updating dynamic elements in real time
  storeUnsubscribe = store.subscribe('sensors', () => {
    if (!isRunMode) return;
    
    widgets.forEach(widget => {
      // Only gauges, sensor text, and charts need telemetry redrawing
      if (['sensor', 'gauge', 'chart'].includes(widget.type)) {
        const el = document.getElementById(`widget-${widget.id}`);
        if (el) {
          el.innerHTML = renderWidgetContent(widget);
        }
      }
    });
  });
}

function loadTemplate(name) {
  widgets = [];
  const canvas = document.getElementById('builder-canvas');
  if (canvas) canvas.querySelectorAll('.builder-widget').forEach(el => el.remove());

  const templates = {
    car: [
      { type: 'button', x: 140, y: 20, width: 100, height: 50, color: '#2E8B57', label: 'Forward', command: 'F' },
      { type: 'button', x: 20, y: 80, width: 100, height: 50, color: '#3CB371', label: 'Left', command: 'L' },
      { type: 'button', x: 140, y: 80, width: 100, height: 50, color: '#EF4444', label: 'Stop', command: 'S' },
      { type: 'button', x: 260, y: 80, width: 100, height: 50, color: '#3CB371', label: 'Right', command: 'R' },
      { type: 'button', x: 140, y: 140, width: 100, height: 50, color: '#2E8B57', label: 'Reverse', command: 'B' },
      { type: 'slider', x: 20, y: 210, width: 340, height: 50, color: '#22C55E', label: 'Motor Speed', command: 'speed' },
      { type: 'gauge', x: 390, y: 20, width: 160, height: 120, color: '#40E0B0', label: 'Temperature', command: 'temperature' },
      { type: 'switch', x: 390, y: 160, width: 100, height: 50, color: '#F59E0B', label: 'Lights', command: 'lights' },
    ],
    home: [
      { type: 'switch', x: 20, y: 20, width: 140, height: 50, color: '#F59E0B', label: 'Living Light', command: 'living_light' },
      { type: 'switch', x: 180, y: 20, width: 140, height: 50, color: '#40E0B0', label: 'Bedroom Light', command: 'bedroom_light' },
      { type: 'slider', x: 20, y: 90, width: 300, height: 50, color: '#2E8B57', label: 'Fan Speed', command: 'fan_speed' },
      { type: 'sensor', x: 20, y: 160, width: 140, height: 80, color: '#EF4444', label: 'Temp Sensor', command: 'temperature' },
      { type: 'sensor', x: 180, y: 160, width: 140, height: 80, color: '#40E0B0', label: 'Humid Sensor', command: 'humidity' },
      { type: 'button', x: 20, y: 260, width: 140, height: 50, color: '#10B981', label: 'Unlock Door', command: 'unlock' },
      { type: 'button', x: 180, y: 260, width: 140, height: 50, color: '#EF4444', label: 'Lock Door', command: 'lock' },
    ],
    sensor: [
      { type: 'gauge', x: 20, y: 20, width: 160, height: 120, color: '#EF4444', label: 'Core Temp', command: 'temperature' },
      { type: 'gauge', x: 200, y: 20, width: 160, height: 120, color: '#40E0B0', label: 'Room Humidity', command: 'humidity' },
      { type: 'gauge', x: 380, y: 20, width: 160, height: 120, color: '#F59E0B', label: 'Ambient Gas', command: 'gas' },
      { type: 'chart', x: 20, y: 160, width: 520, height: 180, color: '#22C55E', label: 'Real-time Chart', command: 'temperature' },
    ]
  };

  const template = templates[name];
  if (!template) return;

  template.forEach(t => {
    const widget = {
      id: 'w' + (++widgetIdCounter),
      ...t,
      mqttTopic: '',
      animation: 'none',
      icon: WIDGET_TYPES.find(wt => wt.type === t.type)?.icon || '📦'
    };
    widgets.push(widget);
    renderWidget(widget);
  });

  hidePlaceholder();
  showToast(`📋 ${name.charAt(0).toUpperCase() + name.slice(1)} template loaded`, 'success');
}
