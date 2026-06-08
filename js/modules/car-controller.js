// ============================================================
// GenApp — IoT Car Controller (Custom Commands + Help Section)
// ============================================================

import { showToast } from '../app.js';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { store } from '../store.js';
import { connectivity } from '../services/connectivity.js';

async function triggerHaptic(type = 'light') {
  if (Capacitor.isNativePlatform()) {
    try {
      if (type === 'light') {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (type === 'medium') {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (type === 'heavy') {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (type === 'vibrate') {
        await Haptics.vibrate({ duration: 300 });
      }
    } catch (err) {
      console.warn('Haptics call failed:', err);
    }
  }
}

// ── Custom Command Config ──────────────────────────────────
const DEFAULT_COMMANDS = {
  forward:    'F',
  backward:   'B',
  left:       'L',
  right:      'R',
  stop:       'S',
  hornOn:     'H_ON',
  hornOff:    'H_OFF',
  lightsOn:   'L_ON',
  lightsOff:  'L_OFF',
  turbo:      'V:100',
  speedPrefix:'V:'
};

function loadCommandConfig() {
  try {
    const saved = localStorage.getItem('genapp-car-commands');
    if (saved) {
      return { ...DEFAULT_COMMANDS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('[GenApp] Failed to load command config:', e);
  }
  return { ...DEFAULT_COMMANDS };
}

function saveCommandConfig(config) {
  try {
    localStorage.setItem('genapp-car-commands', JSON.stringify(config));
  } catch (e) {
    console.warn('[GenApp] Failed to save command config:', e);
  }
}

let commandConfig = loadCommandConfig();

// ── State ──────────────────────────────────────────────────
let activeMode = 'button';
let joystickActive = false;
let steeringAngle = 0;
let speed = 50;
let lightsOn = false;
let turboOn = false;
let isListening = false;

// ── Main Render ────────────────────────────────────────────
export function renderCarController(container) {
  const conn = store.get('connection');
  const isConnected = conn.status === 'connected';

  container.innerHTML = `
    <div class="car-controller-page page-enter">
      <div class="page-header" style="display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:var(--space-3);">
        <div>
          <h1 class="page-title">IoT Car Controller</h1>
          <p class="page-subtitle">Control your IoT vehicle with multiple input modes</p>
        </div>
        <div class="car-header-actions">
          <button class="btn btn-secondary btn-sm" id="car-settings-btn" title="Custom Commands">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            <span class="car-header-btn-text">Commands</span>
          </button>
          <button class="btn btn-secondary btn-sm" id="car-help-btn" title="Help & Guide">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span class="car-header-btn-text">Help</span>
          </button>
        </div>
      </div>

      <!-- Real connection indicator -->
      <div class="connection-bar flex items-center justify-between" style="background:var(--card-bg); padding:var(--space-3) var(--space-4); border-radius:var(--radius-md); border:1px solid var(--card-border); margin-bottom:var(--space-4); display: flex; align-items: center; justify-content: space-between; flex-wrap:wrap; gap:var(--space-2);">
        <div class="flex items-center gap-2" style="display:flex; align-items:center; gap:8px;">
          <span class="status-dot ${conn.status}"></span>
          <span style="font-weight:600; font-size:var(--text-sm);">
            ${isConnected ? `Connected: ${conn.device}` : `Status: ${conn.status.toUpperCase()}`}
          </span>
        </div>
        <div>
          ${isConnected 
            ? `<span class="chip chip-success" style="font-size: var(--text-xs); text-transform: uppercase;">Active (${conn.type})</span>`
            : `<a href="#/devices" class="btn btn-secondary btn-sm" style="padding:var(--space-1) var(--space-3); font-size:var(--text-xs); text-decoration:none;">Go Connect</a>`
          }
        </div>
      </div>

      <!-- Mode Selector -->
      <div class="tabs car-mode-tabs" style="margin: var(--space-4) 0;">
        <button class="tab-btn active" data-mode="button" id="mode-button">🎮 Buttons</button>
        <button class="tab-btn" data-mode="joystick" id="mode-joystick">🕹️ Joystick</button>
        <button class="tab-btn" data-mode="steering" id="mode-steering">🎡 Steering</button>
        <button class="tab-btn" data-mode="voice" id="mode-voice">🎤 Voice</button>
      </div>

      <div class="control-page">
        <div class="control-main">
          <!-- Control Area -->
          <div class="card" id="control-area" style="min-height: 320px;">
            ${renderButtonMode()}
          </div>

          <!-- Speed Control -->
          <div class="speed-control">
            <span class="speed-label">Speed</span>
            <input type="range" min="0" max="100" value="${speed}" class="speed-slider" id="speed-slider" />
            <span class="speed-value" id="speed-value">${speed}%</span>
            <button class="control-btn ${turboOn ? 'active' : ''}" id="turbo-btn" style="margin-left: var(--space-2)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10"/></svg>
              TURBO
            </button>
          </div>
        </div>

        <!-- Telemetry Sidebar -->
        <div class="control-sidebar">
          <!-- Speed Gauge -->
          <div class="card">
            <div class="card-header"><span class="card-title">Speed</span></div>
            <div class="gauge-container">
              <svg class="gauge-svg" viewBox="0 0 160 100">
                <path d="M 20 90 A 60 60 0 0 1 140 90" class="gauge-bg"/>
                <path d="M 20 90 A 60 60 0 0 1 140 90" class="gauge-fill" id="speed-gauge" 
                  stroke="var(--color-primary)" 
                  stroke-dasharray="188" 
                  stroke-dashoffset="${188 - (speed / 100) * 188}"/>
                <text x="80" y="80" class="gauge-value-text" id="gauge-speed-text">${speed}</text>
                <text x="80" y="95" class="gauge-label-text">km/h</text>
              </svg>
            </div>
          </div>

          <!-- Telemetry (real data only) -->
          <div class="card">
            <div class="card-header"><span class="card-title">Telemetry</span></div>
            <div class="telemetry-panel">
              <div class="telemetry-item">
                <span class="telemetry-label">Direction</span>
                <span class="telemetry-value" id="telem-direction" style="color:var(--color-primary)">STOP</span>
              </div>
              <div class="telemetry-item">
                <span class="telemetry-label">Battery</span>
                <span class="telemetry-value" id="telem-battery" style="color:var(--color-accent)">--</span>
              </div>
              <div class="telemetry-item">
                <span class="telemetry-label">Distance</span>
                <span class="telemetry-value" id="telem-distance" style="color:var(--color-secondary)">--</span>
              </div>
              <div class="telemetry-item">
                <span class="telemetry-label">Motor</span>
                <span class="telemetry-value" id="telem-motor" style="color:var(--color-warning)">--</span>
              </div>
              <div class="telemetry-item">
                <span class="telemetry-label">Last Cmd</span>
                <span class="telemetry-value" id="telem-last-cmd" style="color:var(--text-muted); font-size:var(--text-xs);">--</span>
              </div>
            </div>
          </div>

          <!-- Emergency Stop -->
          <div style="text-align:center; padding: var(--space-4);">
            <button class="emergency-stop-btn" id="emergency-stop">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              <div style="font-size:9px; margin-top:4px">E-STOP</div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div class="car-modal-overlay" id="settings-modal" style="display:none;">
      <div class="car-modal">
        <div class="car-modal-header">
          <h2 class="car-modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            Custom Commands
          </h2>
          <button class="car-modal-close" id="settings-modal-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="car-modal-body">
          <p class="car-modal-desc">Customize the commands sent to your device when each action is triggered. Change these to match your Arduino/ESP code.</p>
          <div class="cmd-config-grid" id="cmd-config-grid">
            ${renderCommandFields()}
          </div>
        </div>
        <div class="car-modal-footer">
          <button class="btn btn-secondary btn-sm" id="cmd-reset-btn">Reset Defaults</button>
          <button class="btn btn-primary btn-sm" id="cmd-save-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Save Commands
          </button>
        </div>
      </div>
    </div>

    <!-- Help Modal -->
    <div class="car-modal-overlay" id="help-modal" style="display:none;">
      <div class="car-modal car-modal-lg">
        <div class="car-modal-header">
          <h2 class="car-modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Help & Guide
          </h2>
          <button class="car-modal-close" id="help-modal-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="car-modal-body car-help-body">
          ${renderHelpContent()}
        </div>
      </div>
    </div>
  `;

  // Listen for telemetry updates from real hardware
  connectivity.onDataReceived((raw, parsed) => {
    if (parsed) {
      if (parsed.battery !== undefined || parsed.bat !== undefined) {
        const el = document.getElementById('telem-battery');
        if (el) el.textContent = (parsed.battery || parsed.bat) + '%';
      }
      if (parsed.distance !== undefined || parsed.dist !== undefined) {
        const el = document.getElementById('telem-distance');
        if (el) el.textContent = (parsed.distance || parsed.dist) + 'm';
      }
      if (parsed.motor !== undefined) {
        const el = document.getElementById('telem-motor');
        if (el) el.textContent = parsed.motor;
      }
    }
  });

  setupCarControllerEvents();
  setupSettingsModal();
  setupHelpModal();
}

// ── Command Config Fields ──────────────────────────────────
function renderCommandFields() {
  const fields = [
    { key: 'forward',    label: '⬆️ Forward',  desc: 'Sent when moving forward' },
    { key: 'backward',   label: '⬇️ Backward', desc: 'Sent when moving backward' },
    { key: 'left',       label: '⬅️ Left',     desc: 'Sent when turning left' },
    { key: 'right',      label: '➡️ Right',    desc: 'Sent when turning right' },
    { key: 'stop',       label: '🛑 Stop',     desc: 'Sent when stopping' },
    { key: 'hornOn',     label: '📢 Horn ON',  desc: 'Sent when horn pressed' },
    { key: 'hornOff',    label: '🔇 Horn OFF', desc: 'Sent when horn released' },
    { key: 'lightsOn',   label: '💡 Lights ON',  desc: 'Sent to toggle lights on' },
    { key: 'lightsOff',  label: '🔅 Lights OFF', desc: 'Sent to toggle lights off' },
    { key: 'speedPrefix',label: '⚡ Speed Prefix',desc: 'Prefix for speed value (e.g. V:50)' },
  ];

  return fields.map(f => `
    <div class="cmd-config-item">
      <div class="cmd-config-label">
        <span class="cmd-config-name">${f.label}</span>
        <span class="cmd-config-desc">${f.desc}</span>
      </div>
      <input type="text" class="input-field cmd-config-input" id="cmd-${f.key}" value="${commandConfig[f.key]}" data-cmd-key="${f.key}" placeholder="${DEFAULT_COMMANDS[f.key]}" />
    </div>
  `).join('');
}

// ── Help Content ───────────────────────────────────────────
function renderHelpContent() {
  return `
    <div class="help-section">
      <h3 class="help-section-title">🚀 Getting Started</h3>
      <div class="help-steps">
        <div class="help-step">
          <div class="help-step-number">1</div>
          <div class="help-step-content">
            <strong>Connect Your Device</strong>
            <p>Go to the <strong>Devices</strong> page from the sidebar or bottom navigation. Connect to your IoT device via Bluetooth, WiFi, or MQTT.</p>
          </div>
        </div>
        <div class="help-step">
          <div class="help-step-number">2</div>
          <div class="help-step-content">
            <strong>Choose a Control Mode</strong>
            <p>Select from <strong>Buttons</strong> (D-Pad), <strong>Joystick</strong>, <strong>Steering Wheel</strong>, or <strong>Voice Control</strong> using the tabs at the top.</p>
          </div>
        </div>
        <div class="help-step">
          <div class="help-step-number">3</div>
          <div class="help-step-content">
            <strong>Configure Commands</strong>
            <p>Click the <strong>⚙️ Commands</strong> button to customize what strings are sent to your device. For example, change Forward from "F" to "f" or "MOVE_FWD".</p>
          </div>
        </div>
        <div class="help-step">
          <div class="help-step-number">4</div>
          <div class="help-step-content">
            <strong>Start Controlling!</strong>
            <p>Press the directional buttons, drag the joystick, rotate the steering wheel, or use voice commands. The command is transmitted in real-time via your active connection.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="help-section">
      <h3 class="help-section-title">🎮 Control Modes</h3>
      <div class="help-cards-grid">
        <div class="help-card">
          <div class="help-card-icon">🎮</div>
          <strong>Button Mode (D-Pad)</strong>
          <p>Tap and hold directional buttons to move. Release to stop. Works great for precise control.</p>
        </div>
        <div class="help-card">
          <div class="help-card-icon">🕹️</div>
          <strong>Joystick Mode</strong>
          <p>Drag the joystick handle in any direction. The car moves based on joystick position. Release to auto-center and stop.</p>
        </div>
        <div class="help-card">
          <div class="help-card-icon">🎡</div>
          <strong>Steering Mode</strong>
          <p>Rotate the steering wheel to turn. Use the Gas and Brake pedals to control speed. Feels like driving!</p>
        </div>
        <div class="help-card">
          <div class="help-card-icon">🎤</div>
          <strong>Voice Mode</strong>
          <p>Tap the microphone and speak commands like "Move Forward", "Turn Left", "Stop", "Speed Up", or "Slow Down".</p>
        </div>
      </div>
    </div>

    <div class="help-section">
      <h3 class="help-section-title">⚙️ Custom Commands</h3>
      <p>By default, the app sends simple single-character commands:</p>
      <div class="help-cmd-table">
        <div class="help-cmd-row help-cmd-header">
          <span>Action</span><span>Default</span><span>Example Custom</span>
        </div>
        <div class="help-cmd-row"><span>Forward</span><span><code>F</code></span><span><code>f</code> or <code>MOVE_FWD</code></span></div>
        <div class="help-cmd-row"><span>Backward</span><span><code>B</code></span><span><code>b</code> or <code>MOVE_BWD</code></span></div>
        <div class="help-cmd-row"><span>Left</span><span><code>L</code></span><span><code>l</code> or <code>TURN_L</code></span></div>
        <div class="help-cmd-row"><span>Right</span><span><code>R</code></span><span><code>r</code> or <code>TURN_R</code></span></div>
        <div class="help-cmd-row"><span>Stop</span><span><code>S</code></span><span><code>s</code> or <code>HALT</code></span></div>
        <div class="help-cmd-row"><span>Horn ON</span><span><code>H_ON</code></span><span><code>BEEP</code></span></div>
        <div class="help-cmd-row"><span>Lights ON</span><span><code>L_ON</code></span><span><code>LED_ON</code></span></div>
        <div class="help-cmd-row"><span>Speed</span><span><code>V:50</code></span><span><code>SPD:50</code></span></div>
      </div>
      <p style="margin-top:var(--space-3);color:var(--text-muted);font-size:var(--text-sm);">To change, click <strong>⚙️ Commands</strong>, edit any field, and press <strong>Save</strong>. Changes are persisted locally.</p>
    </div>

    <div class="help-section">
      <h3 class="help-section-title">🔧 Troubleshooting</h3>
      <div class="help-faq">
        <details class="help-faq-item">
          <summary>Device not connecting via Bluetooth</summary>
          <p>Make sure Bluetooth is enabled on your phone. Go to <strong>Devices > Scan</strong> to search for nearby Bluetooth devices. Ensure your IoT device is powered on and in pairing mode.</p>
        </details>
        <details class="help-faq-item">
          <summary>Commands not reaching the device</summary>
          <p>Check the connection status indicator at the top. If it shows "Disconnected", reconnect from the Devices page. Also verify your custom command strings match what your Arduino/ESP firmware expects.</p>
        </details>
        <details class="help-faq-item">
          <summary>Voice control not working</summary>
          <p>Voice recognition requires microphone permission. Grant permission when prompted. This feature works best in Chrome/Edge. It may not be available in all browsers.</p>
        </details>
        <details class="help-faq-item">
          <summary>Joystick/Steering not responding on mobile</summary>
          <p>Make sure you're using touch gestures (drag). The controls are optimized for touch input. If stuck, try switching to Button mode which works with simple taps.</p>
        </details>
        <details class="help-faq-item">
          <summary>How to use with Arduino?</summary>
          <p>Program your Arduino to read serial/Bluetooth data. When it receives "F", move forward; "B", backward; etc. Match the commands in the Settings to your Arduino code. Example:<br>
          <code>if (Serial.read() == 'F') { moveForward(); }</code></p>
        </details>
      </div>
    </div>

    <div class="help-section">
      <h3 class="help-section-title">ℹ️ About</h3>
      <div class="help-about">
        <p><strong>GenApp — IoT Control Platform</strong></p>
        <p>Version 2.0.0</p>
        <p style="color:var(--text-muted);font-size:var(--text-sm);margin-top:var(--space-2);">
          A universal IoT controller app supporting Bluetooth, WiFi, and MQTT connections. 
          Built for controlling cars, robots, home automation devices, and any custom IoT hardware.
        </p>
      </div>
    </div>
  `;
}

// ── Button Mode ────────────────────────────────────────────
function renderButtonMode() {
  return `
    <div class="dpad-container">
      <div class="dpad-grid">
        <button class="dpad-btn dpad-btn-forward" data-dir="forward" id="btn-forward">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          FWD
        </button>
        <button class="dpad-btn dpad-btn-left" data-dir="left" id="btn-left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          LEFT
        </button>
        <button class="dpad-btn dpad-btn-stop" data-dir="stop" id="btn-stop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
        </button>
        <button class="dpad-btn dpad-btn-right" data-dir="right" id="btn-right">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          RIGHT
        </button>
        <button class="dpad-btn dpad-btn-backward" data-dir="backward" id="btn-backward">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
          REV
        </button>
      </div>
      <div class="extra-controls">
        <button class="control-btn horn-btn" id="btn-horn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
          HORN
        </button>
        <button class="control-btn ${lightsOn ? 'active' : ''}" id="btn-lights">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M9 18h6M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 019 14"/></svg>
          LIGHTS
        </button>
      </div>
    </div>
  `;
}

function renderJoystickMode() {
  return `
    <div class="joystick-container">
      <div class="joystick-wrapper" id="joystick-zone">
        <div class="joystick-base">
          <div class="joystick-crosshair"></div>
          <div class="joystick-handle" id="joystick-handle"></div>
        </div>
        <div class="joystick-info">
          <span>X: <span id="joy-x">0</span></span>
          <span>Y: <span id="joy-y">0</span></span>
          <span>Angle: <span id="joy-angle">0°</span></span>
        </div>
      </div>
    </div>
  `;
}

function renderSteeringMode() {
  return `
    <div class="steering-container">
      <div class="steering-wheel-wrapper" id="steering-zone">
        <div class="steering-wheel" id="steering-wheel">
          <div class="steering-marker"></div>
          <div class="steering-wheel-spoke spoke-h"></div>
          <div class="steering-wheel-spoke spoke-v"></div>
          <div class="steering-wheel-inner">
            <span class="steering-angle" id="steering-angle-display">0°</span>
          </div>
        </div>
      </div>
      <div class="pedals-container">
        <div class="pedal">
          <div class="pedal-bar" id="throttle-pedal">
            <div class="pedal-fill throttle" id="throttle-fill" style="height:0%"></div>
          </div>
          <span class="pedal-label" style="color:var(--color-accent)">Gas</span>
        </div>
        <div class="pedal">
          <div class="pedal-bar" id="brake-pedal">
            <div class="pedal-fill brake" id="brake-fill" style="height:0%"></div>
          </div>
          <span class="pedal-label" style="color:var(--color-danger)">Brake</span>
        </div>
      </div>
    </div>
  `;
}

function renderVoiceMode() {
  return `
    <div class="voice-mode-container">
      <button class="voice-control-btn ${isListening ? 'listening' : ''}" id="voice-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
          <path d="M19 10v2a7 7 0 01-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>
      <p class="voice-transcript" id="voice-transcript">${isListening ? 'Listening...' : 'Tap microphone to start voice control'}</p>
      <div class="voice-hints-grid">
        <div class="voice-hint-card"><div class="voice-hint-icon">⬆️</div>"Move Forward"</div>
        <div class="voice-hint-card"><div class="voice-hint-icon">⬇️</div>"Move Back"</div>
        <div class="voice-hint-card"><div class="voice-hint-icon">⬅️</div>"Turn Left"</div>
        <div class="voice-hint-card"><div class="voice-hint-icon">➡️</div>"Turn Right"</div>
        <div class="voice-hint-card"><div class="voice-hint-icon">🛑</div>"Stop"</div>
        <div class="voice-hint-card"><div class="voice-hint-icon">🚀</div>"Speed Up"</div>
      </div>
    </div>
  `;
}

// ── Settings Modal Logic ───────────────────────────────────
function setupSettingsModal() {
  const btn = document.getElementById('car-settings-btn');
  const modal = document.getElementById('settings-modal');
  const closeBtn = document.getElementById('settings-modal-close');
  const saveBtn = document.getElementById('cmd-save-btn');
  const resetBtn = document.getElementById('cmd-reset-btn');

  if (!btn || !modal) return;

  btn.addEventListener('click', () => {
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('active'));
  });

  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
  };

  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  saveBtn?.addEventListener('click', () => {
    const inputs = document.querySelectorAll('[data-cmd-key]');
    inputs.forEach(inp => {
      const key = inp.dataset.cmdKey;
      const val = inp.value.trim();
      if (val) {
        commandConfig[key] = val;
      }
    });
    saveCommandConfig(commandConfig);
    showToast('✅ Commands saved successfully!', 'success');
    closeModal();
  });

  resetBtn?.addEventListener('click', () => {
    commandConfig = { ...DEFAULT_COMMANDS };
    saveCommandConfig(commandConfig);
    // Update the input fields
    const inputs = document.querySelectorAll('[data-cmd-key]');
    inputs.forEach(inp => {
      const key = inp.dataset.cmdKey;
      inp.value = DEFAULT_COMMANDS[key] || '';
    });
    showToast('🔄 Commands reset to defaults', 'info');
  });
}

// ── Help Modal Logic ───────────────────────────────────────
function setupHelpModal() {
  const btn = document.getElementById('car-help-btn');
  const modal = document.getElementById('help-modal');
  const closeBtn = document.getElementById('help-modal-close');

  if (!btn || !modal) return;

  btn.addEventListener('click', () => {
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('active'));
  });

  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
  };

  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

// ── Event Setup ────────────────────────────────────────────
function setupCarControllerEvents() {
  // Mode switching
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeMode = btn.dataset.mode;
      
      const area = document.getElementById('control-area');
      if (!area) return;
      
      switch (activeMode) {
        case 'button': area.innerHTML = renderButtonMode(); setupDpadEvents(); break;
        case 'joystick': area.innerHTML = renderJoystickMode(); setupJoystickEvents(); break;
        case 'steering': area.innerHTML = renderSteeringMode(); setupSteeringEvents(); break;
        case 'voice': area.innerHTML = renderVoiceMode(); setupVoiceEvents(); break;
      }
    });
  });

  // Speed slider
  const speedSlider = document.getElementById('speed-slider');
  if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
      speed = parseInt(e.target.value);
      const valEl = document.getElementById('speed-value');
      if (valEl) valEl.textContent = speed + '%';
      updateGauge(speed);
      connectivity.send(`${commandConfig.speedPrefix}${speed}`);
    });
  }

  // Turbo
  const turboBtn = document.getElementById('turbo-btn');
  if (turboBtn) {
    turboBtn.addEventListener('click', () => {
      turboOn = !turboOn;
      turboBtn.classList.toggle('active', turboOn);
      if (turboOn) {
        speed = 100;
        const slider = document.getElementById('speed-slider');
        if (slider) slider.value = 100;
        const valEl = document.getElementById('speed-value');
        if (valEl) valEl.textContent = '100%';
        updateGauge(100);
        connectivity.send(commandConfig.turbo);
        showToast('🚀 Turbo Mode activated!', 'warning');
      }
    });
  }

  // Emergency stop
  const eStop = document.getElementById('emergency-stop');
  if (eStop) {
    eStop.addEventListener('click', () => {
      sendCommand('stop');
      triggerHaptic('vibrate');
      speed = 0;
      const slider = document.getElementById('speed-slider');
      if (slider) slider.value = 0;
      const valEl = document.getElementById('speed-value');
      if (valEl) valEl.textContent = '0%';
      updateGauge(0);
      turboOn = false;
      showToast('🛑 Emergency Stop activated!', 'error');
    });
  }

  // Setup initial mode events
  setupDpadEvents();
}

function setupDpadEvents() {
  document.querySelectorAll('.dpad-btn').forEach(btn => {
    const dir = btn.dataset.dir;
    
    const handlePress = (e) => {
      e.preventDefault();
      btn.classList.add('pressed');
      sendCommand(dir);
    };
    
    const handleRelease = (e) => {
      e.preventDefault();
      btn.classList.remove('pressed');
      if (dir !== 'stop') sendCommand('stop');
    };

    btn.addEventListener('mousedown', handlePress);
    btn.addEventListener('mouseup', handleRelease);
    btn.addEventListener('mouseleave', handleRelease);
    btn.addEventListener('touchstart', handlePress, { passive: false });
    btn.addEventListener('touchend', handleRelease, { passive: false });
  });

  // Lights toggle
  const lightsBtn = document.getElementById('btn-lights');
  if (lightsBtn) {
    lightsBtn.addEventListener('click', () => {
      lightsOn = !lightsOn;
      lightsBtn.classList.toggle('active', lightsOn);
      connectivity.send(lightsOn ? commandConfig.lightsOn : commandConfig.lightsOff);
      showToast(lightsOn ? '💡 Lights ON' : '💡 Lights OFF', 'info');
    });
  }

  // Horn
  const hornBtn = document.getElementById('btn-horn');
  if (hornBtn) {
    const startHorn = () => {
      hornBtn.classList.add('active');
      connectivity.send(commandConfig.hornOn);
    };
    const stopHorn = () => {
      hornBtn.classList.remove('active');
      connectivity.send(commandConfig.hornOff);
    };
    hornBtn.addEventListener('mousedown', startHorn);
    hornBtn.addEventListener('mouseup', stopHorn);
    hornBtn.addEventListener('mouseleave', stopHorn);
    hornBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startHorn(); });
    hornBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopHorn(); });
  }
}

function setupJoystickEvents() {
  const handle = document.getElementById('joystick-handle');
  const zone = document.getElementById('joystick-zone');
  if (!handle || !zone) return;

  const base = handle.parentElement;
  let dragging = false;

  const onMove = (clientX, clientY) => {
    if (!dragging) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxDist = rect.width / 2 - 35;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }

    handle.style.left = `calc(50% + ${dx}px)`;
    handle.style.top = `calc(50% + ${dy}px)`;

    const normX = Math.round((dx / maxDist) * 100);
    const normY = Math.round((-dy / maxDist) * 100);
    const angle = Math.round(Math.atan2(-dy, dx) * (180 / Math.PI));

    const xEl = document.getElementById('joy-x');
    const yEl = document.getElementById('joy-y');
    const aEl = document.getElementById('joy-angle');
    if (xEl) xEl.textContent = normX;
    if (yEl) yEl.textContent = normY;
    if (aEl) aEl.textContent = angle + '°';

    if (dist < maxDist * 0.15) {
      sendCommand('stop');
    } else if (normY > 50) {
      sendCommand('forward');
    } else if (normY < -50) {
      sendCommand('backward');
    } else if (normX < -50) {
      sendCommand('left');
    } else if (normX > 50) {
      sendCommand('right');
    }
  };

  handle.addEventListener('mousedown', () => { dragging = true; });
  handle.addEventListener('touchstart', (e) => { dragging = true; e.preventDefault(); }, { passive: false });
  
  window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
  window.addEventListener('touchmove', (e) => {
    if (dragging) onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  const release = () => {
    dragging = false;
    handle.style.left = '50%';
    handle.style.top = '50%';
    handle.style.transition = 'left 0.3s var(--ease-spring), top 0.3s var(--ease-spring)';
    setTimeout(() => { handle.style.transition = ''; }, 300);
    sendCommand('stop');
    const xEl = document.getElementById('joy-x');
    const yEl = document.getElementById('joy-y');
    if (xEl) xEl.textContent = '0';
    if (yEl) yEl.textContent = '0';
  };

  window.addEventListener('mouseup', release);
  window.addEventListener('touchend', release);
}

function setupSteeringEvents() {
  const wheel = document.getElementById('steering-wheel');
  if (!wheel) return;

  let rotating = false;
  let startAngle = 0;
  let currentAngle = 0;

  const getAngle = (clientX, clientY) => {
    const rect = wheel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  };

  wheel.addEventListener('mousedown', (e) => {
    rotating = true;
    startAngle = getAngle(e.clientX, e.clientY) - currentAngle;
  });

  wheel.addEventListener('touchstart', (e) => {
    rotating = true;
    startAngle = getAngle(e.touches[0].clientX, e.touches[0].clientY) - currentAngle;
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('mousemove', (e) => {
    if (!rotating) return;
    currentAngle = getAngle(e.clientX, e.clientY) - startAngle;
    currentAngle = Math.max(-180, Math.min(180, currentAngle));
    wheel.style.transform = `rotate(${currentAngle}deg)`;
    const display = document.getElementById('steering-angle-display');
    if (display) display.textContent = Math.round(currentAngle) + '°';
    
    if (currentAngle < -20) sendCommand('left');
    else if (currentAngle > 20) sendCommand('right');
    else sendCommand('stop');
  });

  window.addEventListener('touchmove', (e) => {
    if (!rotating) return;
    currentAngle = getAngle(e.touches[0].clientX, e.touches[0].clientY) - startAngle;
    currentAngle = Math.max(-180, Math.min(180, currentAngle));
    wheel.style.transform = `rotate(${currentAngle}deg)`;
    const display = document.getElementById('steering-angle-display');
    if (display) display.textContent = Math.round(currentAngle) + '°';
  }, { passive: false });

  const releaseWheel = () => {
    rotating = false;
    currentAngle = 0;
    wheel.style.transition = 'transform 0.5s var(--ease-spring)';
    wheel.style.transform = 'rotate(0deg)';
    setTimeout(() => { wheel.style.transition = ''; }, 500);
    const display = document.getElementById('steering-angle-display');
    if (display) display.textContent = '0°';
    sendCommand('stop');
  };

  window.addEventListener('mouseup', releaseWheel);
  window.addEventListener('touchend', releaseWheel);

  // Pedals
  setupPedal('throttle-pedal', 'throttle-fill');
  setupPedal('brake-pedal', 'brake-fill');
}

function setupPedal(pedalId, fillId) {
  const pedal = document.getElementById(pedalId);
  const fill = document.getElementById(fillId);
  if (!pedal || !fill) return;

  let pressing = false;

  const updateFill = (clientY) => {
    const rect = pedal.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((rect.bottom - clientY) / rect.height) * 100));
    fill.style.height = pct + '%';
  };

  pedal.addEventListener('mousedown', (e) => { pressing = true; updateFill(e.clientY); });
  pedal.addEventListener('touchstart', (e) => { pressing = true; updateFill(e.touches[0].clientY); e.preventDefault(); }, { passive: false });

  window.addEventListener('mousemove', (e) => { if (pressing) updateFill(e.clientY); });
  window.addEventListener('touchmove', (e) => { if (pressing) updateFill(e.touches[0].clientY); }, { passive: false });

  const release = () => {
    pressing = false;
    fill.style.height = '0%';
  };
  window.addEventListener('mouseup', release);
  window.addEventListener('touchend', release);
}

function setupVoiceEvents() {
  const voiceBtn = document.getElementById('voice-btn');
  if (!voiceBtn) return;

  voiceBtn.addEventListener('click', () => {
    isListening = !isListening;
    voiceBtn.classList.toggle('listening', isListening);
    const transcript = document.getElementById('voice-transcript');

    if (isListening) {
      if (transcript) transcript.textContent = 'Listening...';
      
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          const result = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
          if (transcript) transcript.textContent = `"${result}"`;
          parseVoiceCommand(result);
        };

        recognition.onerror = () => {
          if (transcript) transcript.textContent = 'Voice recognition not available on this browser.';
          isListening = false;
          voiceBtn.classList.remove('listening');
        };

        recognition.start();
        voiceBtn._recognition = recognition;
      } else {
        if (transcript) transcript.textContent = 'Voice recognition is not supported on this browser.';
        isListening = false;
        voiceBtn.classList.remove('listening');
      }
    } else {
      if (transcript) transcript.textContent = 'Tap microphone to start voice control';
      if (voiceBtn._recognition) voiceBtn._recognition.stop();
    }
  });
}

function parseVoiceCommand(text) {
  if (text.includes('forward') || text.includes('ahead')) sendCommand('forward');
  else if (text.includes('back') || text.includes('reverse')) sendCommand('backward');
  else if (text.includes('left')) sendCommand('left');
  else if (text.includes('right')) sendCommand('right');
  else if (text.includes('stop') || text.includes('halt')) sendCommand('stop');
  else if (text.includes('speed up') || text.includes('faster')) {
    speed = Math.min(100, speed + 20);
    updateGauge(speed);
  }
  else if (text.includes('slow') || text.includes('slower')) {
    speed = Math.max(0, speed - 20);
    updateGauge(speed);
  }
}

// ── Core Command Sender ────────────────────────────────────
let lastCommand = '';

function sendCommand(dirKey) {
  const cmd = commandConfig[dirKey] || dirKey;

  if (cmd !== lastCommand) {
    if (dirKey === 'stop') {
      triggerHaptic('medium');
    } else {
      triggerHaptic('light');
    }
    lastCommand = cmd;
    
    // Transmit over active connection (Bluetooth/WiFi/MQTT)
    connectivity.send(cmd);
  }

  const dirMap = {
    forward: 'FORWARD',
    backward: 'BACKWARD',
    left: 'LEFT',
    right: 'RIGHT',
    stop: 'STOP'
  };
  const dirEl = document.getElementById('telem-direction');
  if (dirEl) dirEl.textContent = dirMap[dirKey] || dirKey.toUpperCase();

  // Show actual command sent in telemetry
  const cmdEl = document.getElementById('telem-last-cmd');
  if (cmdEl) cmdEl.textContent = cmd;
  
  console.log(`[GenApp] Command: ${cmd} (${dirKey}) | Speed: ${speed}`);
}

function updateGauge(value) {
  const gauge = document.getElementById('speed-gauge');
  const text = document.getElementById('gauge-speed-text');
  if (gauge) gauge.setAttribute('stroke-dashoffset', 188 - (value / 100) * 188);
  if (text) text.textContent = value;
}
