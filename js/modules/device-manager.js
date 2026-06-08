// ============================================================
// GenApp — Devices Tab & Connection Hub
// ============================================================

import { store } from '../store.js';
import { showToast } from '../app.js';
import { connectivity } from '../services/connectivity.js';

let currentTab = 'saved'; // 'saved' | 'bluetooth' | 'wifi' | 'mqtt'
let scannedDevices = [];
let isScanning = false;

export function renderDeviceManager(container) {
  const connState = store.get('connection') || { type: 'none', status: 'disconnected', device: null, logs: [] };
  const savedDevices = store.get('devices') || [];
  const logs = connState.logs || [];

  container.innerHTML = `
    <div class="device-manager-page page-enter">
      <div class="page-header">
        <h1 class="page-title">Devices & Connections</h1>
        <p class="page-subtitle">Manage paired hardware interface links via Bluetooth, WiFi, or MQTT</p>
      </div>

      <!-- Connection Status Card -->
      <div class="card status-banner-card ${connState.status === 'connected' ? 'connected-glow' : ''}" style="margin-bottom: var(--space-6);">
        <div class="flex items-center justify-between flex-wrap gap-4" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div class="flex items-center gap-3" style="display: flex; align-items: center; gap: 0.75rem;">
            <span class="status-indicator-ring ${connState.status}" style="width: 12px; height: 12px; border-radius: 50%; display: inline-block; background-color: ${
              connState.status === 'connected' ? 'var(--color-success)' : connState.status === 'connecting' ? 'var(--color-warning)' : 'var(--color-danger)'
            }; box-shadow: 0 0 10px ${
              connState.status === 'connected' ? 'var(--color-success)' : connState.status === 'connecting' ? 'var(--color-warning)' : 'var(--color-danger)'
            };"></span>
            <div>
              <div style="font-weight:700; font-size:var(--text-base); text-transform: uppercase; letter-spacing: 1px;">
                Status: ${connState.status.toUpperCase()}
              </div>
              <div style="font-size:var(--text-xs); color:var(--text-secondary); margin-top:2px;">
                ${connState.status === 'connected' 
                  ? `Connected to <strong style="color:var(--color-secondary)">${connState.device || 'Device'}</strong> via <strong>${connState.type.toUpperCase()}</strong>` 
                  : connState.status === 'connecting'
                  ? `Attempting link to <strong>${connState.device || 'Device'}</strong>...`
                  : 'No active connection. Link a device below to start monitoring telemetry.'}
              </div>
            </div>
          </div>
          ${connState.status !== 'disconnected' 
            ? `<button class="btn btn-danger btn-sm" id="global-disconnect-btn">Disconnect Link</button>` 
            : ''}
        </div>
      </div>

      <div class="connection-layout" style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: var(--space-6); align-items: start;">
        
        <!-- Left Column: Tabs & Control Panel -->
        <div class="card" style="padding: 0; overflow: hidden; background: var(--bg-surface); border: 1px solid rgba(255, 255, 255, 0.05);">
          <!-- Navigation Tabs -->
          <div class="conn-tabs flex" style="display: flex; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.05);">
            <button class="conn-tab-btn flex-1 ${currentTab === 'saved' ? 'active' : ''}" data-conn-tab="saved" style="flex: 1; padding: var(--space-4); border:none; background:none; color:${currentTab === 'saved' ? 'var(--text-primary)' : 'var(--text-muted)'}; border-bottom: 2px solid ${currentTab === 'saved' ? 'var(--color-primary)' : 'transparent'}; font-weight:600; cursor:pointer; text-align:center; transition: all 0.2s;">
              📦 Saved Devices
            </button>
            <button class="conn-tab-btn flex-1 ${currentTab === 'bluetooth' ? 'active' : ''}" data-conn-tab="bluetooth" style="flex: 1; padding: var(--space-4); border:none; background:none; color:${currentTab === 'bluetooth' ? 'var(--text-primary)' : 'var(--text-muted)'}; border-bottom: 2px solid ${currentTab === 'bluetooth' ? 'var(--color-primary)' : 'transparent'}; font-weight:600; cursor:pointer; text-align:center; transition: all 0.2s;">
              🔵 Bluetooth
            </button>
            <button class="conn-tab-btn flex-1 ${currentTab === 'wifi' ? 'active' : ''}" data-conn-tab="wifi" style="flex: 1; padding: var(--space-4); border:none; background:none; color:${currentTab === 'wifi' ? 'var(--text-primary)' : 'var(--text-muted)'}; border-bottom: 2px solid ${currentTab === 'wifi' ? 'var(--color-primary)' : 'transparent'}; font-weight:600; cursor:pointer; text-align:center; transition: all 0.2s;">
              🌐 WiFi / ESP32
            </button>
            <button class="conn-tab-btn flex-1 ${currentTab === 'mqtt' ? 'active' : ''}" data-conn-tab="mqtt" style="flex: 1; padding: var(--space-4); border:none; background:none; color:${currentTab === 'mqtt' ? 'var(--text-primary)' : 'var(--text-muted)'}; border-bottom: 2px solid ${currentTab === 'mqtt' ? 'var(--color-primary)' : 'transparent'}; font-weight:600; cursor:pointer; text-align:center; transition: all 0.2s;">
              📡 MQTT Broker
            </button>
          </div>

          <!-- Tab Contents -->
          <div class="conn-tab-content" style="padding: var(--space-5);">
            ${renderTabContent(connState, savedDevices)}
          </div>
        </div>

        <!-- Right Column: System/Network Terminal -->
        <div class="card terminal-card" style="height: 100%; display: flex; flex-direction: column; background: var(--bg-surface); border: 1px solid rgba(255, 255, 255, 0.05); padding: var(--space-4);">
          <div class="card-header flex justify-between items-center" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--space-3);">
            <span class="card-title" style="color: var(--color-secondary); font-family: var(--font-mono); font-size: var(--text-sm); font-weight: bold;">▶ SYSTEM CONNECTION LOG</span>
            <button class="btn btn-ghost btn-sm" id="clear-logs-btn" style="padding: var(--space-1) var(--space-3); font-size: var(--text-xs);">Clear</button>
          </div>
          <div class="terminal-body" id="conn-terminal-body" style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: var(--space-3); font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-secondary); height: 320px; overflow-y: auto; display: flex; flex-direction: column-reverse; gap: 6px; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">
            ${logs.length === 0 
              ? `<div style="color:var(--text-tertiary); text-align:center; padding-top:100px;">Terminal idle. System actions and telemetry packet frames will log here.</div>` 
              : logs.map(l => `<div class="log-row" style="word-break: break-all; border-bottom: 1px solid rgba(255,255,255,0.02); padding-bottom: 2px;">${escapeHtml(l)}</div>`).join('')}
          </div>
        </div>

      </div>
    </div>
  `;

  // Hook event listeners
  setupTabEvents(container);
  setupConnectionActions(container);
}

function renderTabContent(connState, savedDevices) {
  if (currentTab === 'saved') {
    if (savedDevices.length === 0) {
      return `
        <div style="text-align: center; padding: var(--space-8) var(--space-4);">
          <div style="font-size: 3rem; margin-bottom: var(--space-4);">📦</div>
          <h3 style="font-weight: 600; font-size: var(--text-lg); margin-bottom: var(--space-2);">No Saved Devices</h3>
          <p style="color: var(--text-muted); font-size: var(--text-sm); max-width: 340px; margin: 0 auto var(--space-6);">
            No hardware profiles are saved. Connect via Bluetooth, WiFi or MQTT to register a device.
          </p>
          <div style="display: flex; gap: var(--space-3); justify-content: center;">
            <button class="btn btn-primary btn-sm" id="goto-bt-btn">Bluetooth Scan</button>
            <button class="btn btn-secondary btn-sm" id="goto-wifi-btn">WiFi Config</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="flex flex-col gap-4" style="display:flex; flex-direction:column; gap: 1rem;">
        <div>
          <div style="font-weight:600; font-size: var(--text-base);">Your Saved Configurations</div>
          <div style="font-size: var(--text-xs); color:var(--text-tertiary);">Re-establish links quickly with previously connected physical interfaces</div>
        </div>

        <div class="saved-device-list" style="border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-md); max-height: 280px; overflow-y: auto; background: rgba(0,0,0,0.15);">
          ${savedDevices.map(dev => {
            const isCurrent = connState.status === 'connected' && connState.device === dev.name;
            return `
              <div class="flex items-center justify-between" style="display:flex; align-items:center; justify-content:space-between; padding: var(--space-3) var(--space-4); border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div>
                  <div style="display:flex; align-items:center; gap: 0.5rem;">
                    <span style="font-weight:600; font-size:var(--text-sm);">${escapeHtml(dev.name)}</span>
                    <span class="chip" style="font-size: var(--text-xs); padding: 1px 6px; background: rgba(255,255,255,0.05); border-radius: var(--radius-sm); text-transform: uppercase;">${dev.type}</span>
                  </div>
                  <div style="font-size:var(--text-xs); color:var(--text-muted); font-family:var(--font-mono); margin-top:2px;">
                    ${dev.id} ${dev.lastSeen ? `• Seen ${new Date(dev.lastSeen).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap: 0.5rem;">
                  ${isCurrent 
                    ? `<button class="btn btn-danger btn-xs disconnect-saved-btn" data-id="${dev.id}">Disconnect</button>` 
                    : `<button class="btn btn-primary btn-xs connect-saved-btn" data-id="${dev.id}" data-type="${dev.type}" data-name="${dev.name}">Connect</button>`
                  }
                  <button class="btn btn-ghost btn-xs rename-saved-btn" data-id="${dev.id}" data-name="${dev.name}" style="padding: 2px var(--space-2);">✏️</button>
                  <button class="btn btn-ghost btn-xs remove-saved-btn" data-id="${dev.id}" style="padding: 2px var(--space-2); color: var(--color-danger);">🗑️</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  if (currentTab === 'bluetooth') {
    return `
      <div class="flex flex-col gap-4" style="display:flex; flex-direction:column; gap: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight:600; font-size: var(--text-base);">Bluetooth Serial Interface</div>
            <div style="font-size: var(--text-xs); color:var(--text-tertiary);">Scan and bind Classic Bluetooth serial profiles (e.g. HC-05 / HC-06 module integrations)</div>
          </div>
          <button class="btn btn-primary btn-sm ${isScanning ? 'loading' : ''}" id="bt-scan-btn">
            ${isScanning ? 'Scanning...' : '🔍 Scan Bluetooth'}
          </button>
        </div>

        <div class="bt-device-list" style="border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-md); max-height: 220px; overflow-y: auto; background: rgba(0,0,0,0.15);">
          ${isScanning 
            ? `<div style="text-align:center; padding: var(--space-6); color:var(--text-muted); font-size: var(--text-sm);">Searching for physical Bluetooth Classic beacons...</div>`
            : scannedDevices.length === 0 
              ? `<div style="text-align:center; padding: var(--space-6); color:var(--text-muted); font-size: var(--text-sm);">No devices found. Tap Scan to search. (Requires native Android runner)</div>`
              : scannedDevices.map(dev => {
                  const isCurrent = connState.status === 'connected' && connState.device === dev.name;
                  return `
                    <div class="flex items-center justify-between" style="display:flex; align-items:center; justify-content:space-between; padding: var(--space-3); border-bottom: 1px solid rgba(255,255,255,0.03);">
                      <div>
                        <div style="font-weight:600; font-size:var(--text-sm);">${escapeHtml(dev.name || 'Unknown Device')}</div>
                        <div style="font-size:var(--text-xs); color:var(--text-muted); font-family:var(--font-mono);">${dev.id}</div>
                      </div>
                      <div class="flex items-center gap-2" style="display:flex; align-items:center; gap: 0.5rem;">
                        ${dev.paired ? '<span class="chip chip-success" style="font-size:9px; padding:2px 6px; background: rgba(34,197,94,0.15); border: 1px solid var(--color-success); border-radius: 4px; color: var(--color-success);">Paired</span>' : ''}
                        ${isCurrent
                          ? `<button class="btn btn-danger btn-xs disconnect-device-btn" data-address="${dev.id}">Disconnect</button>`
                          : `<button class="btn btn-primary btn-xs connect-device-btn" data-address="${dev.id}" data-name="${dev.name}" ${connState.status === 'connecting' ? 'disabled' : ''}>Connect</button>`
                        }
                      </div>
                    </div>
                  `;
                }).join('')}
        </div>
      </div>
    `;
  }

  if (currentTab === 'wifi') {
    return `
      <div class="flex flex-col gap-4" style="display:flex; flex-direction:column; gap: 1rem;">
        <div>
          <div style="font-weight:600; font-size: var(--text-base);">WiFi Socket & REST Client</div>
          <div style="font-size: var(--text-xs); color:var(--text-tertiary);">Direct HTTP/REST or WebSocket endpoint hook for networked ESP8266/ESP32 hosts</div>
        </div>

        <div class="input-group">
          <label class="input-label" style="display:block; font-size:var(--text-xs); color:var(--text-muted); margin-bottom:4px;">ESP32 Node IP Address</label>
          <input class="input-field" type="text" id="wifi-ip-input" value="${connectivity.wifiConfig.ip}" placeholder="e.g. 192.168.4.1" style="width:100%; box-sizing:border-box;" />
        </div>

        <div class="flex gap-4" style="display:flex; gap: 1rem;">
          <div class="input-group" style="flex:1;">
            <label class="input-label" style="display:block; font-size:var(--text-xs); color:var(--text-muted); margin-bottom:4px;">Port</label>
            <input class="input-field" type="number" id="wifi-port-input" value="${connectivity.wifiConfig.port}" placeholder="80" style="width:100%; box-sizing:border-box;" />
          </div>
          <div class="input-group" style="flex:1.5;">
            <label class="input-label" style="display:block; font-size:var(--text-xs); color:var(--text-muted); margin-bottom:4px;">Protocol Hook</label>
            <div class="select-wrapper">
              <select class="select-field" id="wifi-protocol-select" style="width:100%; background: var(--bg-surface-hover); color: var(--text-primary); border:1px solid rgba(255,255,255,0.08); padding:8px; border-radius:var(--radius-sm);">
                <option value="http" ${connectivity.wifiConfig.protocol === 'http' ? 'selected' : ''}>HTTP REST Poller</option>
                <option value="ws" ${connectivity.wifiConfig.protocol === 'ws' ? 'selected' : ''}>WebSocket Client (Real-time)</option>
              </select>
            </div>
          </div>
        </div>

        <div style="margin-top: var(--space-2);">
          ${connState.status === 'connected' && connState.type === 'wifi'
            ? `<button class="btn btn-danger w-full" id="wifi-disconnect-btn" style="width:100%;">Disconnect WiFi Link</button>`
            : `<button class="btn btn-primary w-full" id="wifi-connect-btn" style="width:100%;" ${connState.status === 'connecting' ? 'disabled' : ''}>
                ${connState.status === 'connecting' ? 'Connecting to ESP32 Node...' : 'Establish Network Link'}
               </button>`
          }
        </div>
      </div>
    `;
  }

  if (currentTab === 'mqtt') {
    return `
      <div class="flex flex-col gap-4" style="display:flex; flex-direction:column; gap: 1rem;">
        <div>
          <div style="font-weight:600; font-size: var(--text-base);">MQTT Pub/Sub Broker Hub</div>
          <div style="font-size: var(--text-xs); color:var(--text-tertiary);">Listen/Publish raw byte streams using standard MQTT brokers (Cloud or Local server)</div>
        </div>

        <div class="input-group">
          <label class="input-label" style="display:block; font-size:var(--text-xs); color:var(--text-muted); margin-bottom:4px;">Broker Endpoint Hostname</label>
          <input class="input-field" type="text" id="mqtt-host-input" value="${connectivity.mqttConfig.broker}" placeholder="e.g. broker.hivemq.com" style="width:100%; box-sizing:border-box;" />
        </div>

        <div class="flex gap-4" style="display:flex; gap: 1rem;">
          <div class="input-group" style="flex:1;">
            <label class="input-label" style="display:block; font-size:var(--text-xs); color:var(--text-muted); margin-bottom:4px;">WebSocket Port</label>
            <input class="input-field" type="number" id="mqtt-port-input" value="${connectivity.mqttConfig.port}" placeholder="e.g. 8000" style="width:100%; box-sizing:border-box;" />
          </div>
          <div class="input-group" style="flex:2;">
            <label class="input-label" style="display:block; font-size:var(--text-xs); color:var(--text-muted); margin-bottom:4px;">Telemetry Channel Topic</label>
            <input class="input-field" type="text" id="mqtt-topic-input" value="${connectivity.mqttConfig.topic}" placeholder="genapp/iot" style="width:100%; box-sizing:border-box;" />
          </div>
        </div>

        <div style="margin-top: var(--space-2);">
          ${connState.status === 'connected' && connState.type === 'mqtt'
            ? `<button class="btn btn-danger w-full" id="mqtt-disconnect-btn" style="width:100%;">Disconnect MQTT Broker</button>`
            : `<button class="btn btn-primary w-full" id="mqtt-connect-btn" style="width:100%;" ${connState.status === 'connecting' ? 'disabled' : ''}>
                ${connState.status === 'connecting' ? 'Binding MQTT Client...' : 'Connect to MQTT Broker'}
               </button>`
          }
        </div>
      </div>
    `;
  }
}

function setupTabEvents(container) {
  container.querySelectorAll('[data-conn-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.connTab;
      renderDeviceManager(container);
    });
  });
}

function setupConnectionActions(container) {
  // Global Disconnect Action
  document.getElementById('global-disconnect-btn')?.addEventListener('click', () => {
    connectivity.disconnect();
    renderDeviceManager(container);
  });

  // Clear Terminal Log Console
  document.getElementById('clear-logs-btn')?.addEventListener('click', () => {
    connectivity.logs = [];
    store.set('connection.logs', []);
    renderDeviceManager(container);
    showToast('Terminal logs cleared', 'info');
  });

  // Saved Device List Actions
  container.querySelectorAll('.connect-saved-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const type = btn.dataset.type;
      const name = btn.dataset.name;

      if (type === 'bluetooth') {
        connectivity.connectBluetooth(id, name);
      } else if (type === 'wifi') {
        const parts = id.split(':');
        connectivity.connectWiFi(parts[0], parts[1] || '80', false); // Assume HTTP fallback or load details
      } else if (type === 'mqtt') {
        connectivity.connectMQTT(id, '8000', 'genapp/iot');
      }
      renderDeviceManager(container);
    });
  });

  container.querySelectorAll('.disconnect-saved-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      connectivity.disconnect();
      renderDeviceManager(container);
    });
  });

  container.querySelectorAll('.rename-saved-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const oldName = btn.dataset.name;
      const newName = prompt('Enter a new friendly name for this device:', oldName);
      if (newName && newName.trim() !== '') {
        const devices = store.get('devices') || [];
        const devIndex = devices.findIndex(d => d.id === id);
        if (devIndex !== -1) {
          devices[devIndex].name = newName.trim();
          store.set('devices', [...devices]);
          renderDeviceManager(container);
          showToast('Device renamed successfully', 'success');
        }
      }
    });
  });

  container.querySelectorAll('.remove-saved-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (confirm('Are you sure you want to delete this device configuration?')) {
        store.removeDevice(id);
        renderDeviceManager(container);
        showToast('Device configuration deleted', 'info');
      }
    });
  });

  // Navigation CTAs inside the Empty State
  document.getElementById('goto-bt-btn')?.addEventListener('click', () => {
    currentTab = 'bluetooth';
    renderDeviceManager(container);
  });

  document.getElementById('goto-wifi-btn')?.addEventListener('click', () => {
    currentTab = 'wifi';
    renderDeviceManager(container);
  });

  // Bluetooth Actions
  document.getElementById('bt-scan-btn')?.addEventListener('click', async () => {
    if (isScanning) return;
    isScanning = true;
    renderDeviceManager(container);
    
    try {
      scannedDevices = await connectivity.scanBluetooth();
    } catch (err) {
      console.error(err);
    }
    
    isScanning = false;
    renderDeviceManager(container);
  });

  container.querySelectorAll('.connect-device-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const addr = btn.dataset.address;
      const name = btn.dataset.name;
      connectivity.connectBluetooth(addr, name);
      renderDeviceManager(container);
    });
  });

  container.querySelectorAll('.disconnect-device-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      connectivity.disconnect();
      renderDeviceManager(container);
    });
  });

  // WiFi Actions
  document.getElementById('wifi-connect-btn')?.addEventListener('click', () => {
    const ip = document.getElementById('wifi-ip-input').value;
    const port = document.getElementById('wifi-port-input').value;
    const protocol = document.getElementById('wifi-protocol-select').value;
    
    connectivity.connectWiFi(ip, port, protocol === 'ws');
    renderDeviceManager(container);
  });

  document.getElementById('wifi-disconnect-btn')?.addEventListener('click', () => {
    connectivity.disconnect();
    renderDeviceManager(container);
  });

  // MQTT Actions
  document.getElementById('mqtt-connect-btn')?.addEventListener('click', () => {
    const host = document.getElementById('mqtt-host-input').value;
    const port = document.getElementById('mqtt-port-input').value;
    const topic = document.getElementById('mqtt-topic-input').value;
    
    connectivity.connectMQTT(host, port, topic);
    renderDeviceManager(container);
  });

  document.getElementById('mqtt-disconnect-btn')?.addEventListener('click', () => {
    connectivity.disconnect();
    renderDeviceManager(container);
  });

  // Live Logger Stream Observer
  const unsubscribe = store.subscribe('connection', () => {
    const term = document.getElementById('conn-terminal-body');
    const updatedConn = store.get('connection') || {};
    const updatedLogs = updatedConn.logs || [];
    if (term) {
      if (updatedLogs.length === 0) {
        term.innerHTML = `<div style="color:var(--text-tertiary); text-align:center; padding-top:100px;">Terminal idle. System actions and telemetry packet frames will log here.</div>`;
      } else {
        term.innerHTML = updatedLogs.map(l => `<div class="log-row" style="word-break: break-all; border-bottom: 1px solid rgba(255,255,255,0.02); padding-bottom: 2px;">${escapeHtml(l)}</div>`).join('');
      }
    }
  });

  container._unsubscribeConn = unsubscribe;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
