// ============================================================
// GenApp — Dashboard (Clean — No Fake Data)
// ============================================================

import { store } from '../store.js';
import { router } from '../router.js';

export function renderDashboard(container) {
  const devices = store.get('devices') || [];
  const connState = store.get('connection');
  const isConnected = connState.status === 'connected';
  const notifications = store.get('notifications') || [];
  const unreadNotifs = notifications.filter(n => !n.read);
  const sensors = store.get('sensors') || {};
  const automations = store.get('automations') || [];
  const rooms = store.get('rooms') || [];

  container.innerHTML = `
    <div class="dashboard-page page-enter">
      <!-- Welcome Banner -->
      <div class="welcome-banner">
        <h1 class="welcome-title">Welcome to GenApp 👋</h1>
        <p class="welcome-subtitle">
          ${isConnected 
            ? `Connected to <strong style="color: var(--color-primary)">${connState.device}</strong> via ${connState.type.toUpperCase()}.`
            : 'Connect a Bluetooth or WiFi device to begin controlling your IoT ecosystem.'}
        </p>
        <div class="flex gap-3 flex-wrap">
          ${!isConnected ? `
            <a href="#/devices" class="btn btn-primary btn-sm" id="dash-connect-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              Add Device
            </a>
          ` : `
            <a href="#/controls" class="btn btn-primary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
              Open Controls
            </a>
          `}
          <a href="#/controls" class="btn btn-secondary btn-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
            Build Control
          </a>
        </div>
      </div>

      <!-- Connection Status -->
      <div class="connection-status-card" style="margin-bottom: var(--space-8);">
        <div class="flex items-center gap-4" style="display:flex; align-items:center; gap:16px;">
          <div class="connection-status-icon ${isConnected ? 'connected' : 'disconnected'}">
            ${isConnected ? '📡' : '📱'}
          </div>
          <div style="flex:1; text-align:left;">
            <div style="font-weight:700; font-size:var(--text-base); margin-bottom:4px;">
              ${isConnected ? 'Device Connected' : 'No Device Connected'}
            </div>
            <div style="font-size:var(--text-sm); color:var(--text-muted);">
              ${isConnected 
                ? `Active: ${connState.device} (${connState.type.toUpperCase()})`
                : 'Connect a Bluetooth or WiFi device to begin'}
            </div>
          </div>
          <div>
            ${isConnected
              ? `<span class="chip chip-success">● Connected</span>`
              : `<a href="#/devices" class="btn btn-primary btn-sm">Connect</a>`}
          </div>
        </div>

        ${!isConnected ? `
          <div class="connect-options" style="margin-top:var(--space-6);">
            <a href="#/devices" class="btn btn-secondary btn-sm" id="dash-bt-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/></svg>
              Bluetooth
            </a>
            <a href="#/devices" class="btn btn-secondary btn-sm" id="dash-wifi-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
              WiFi / ESP32
            </a>
            <a href="#/devices" class="btn btn-secondary btn-sm" id="dash-mqtt-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>
              MQTT
            </a>
          </div>
        ` : ''}
      </div>

      ${isConnected ? `
        <!-- Live Sensor Data (only when connected and receiving data) -->
        ${Object.keys(sensors).length > 0 ? `
          <div class="section-header">
            <h2 class="section-title">Live Sensor Data</h2>
            <a href="#/sensor-dashboard" class="section-action">View All →</a>
          </div>
          <div class="dashboard-grid stagger-children" style="margin-bottom:var(--space-8);">
            ${sensors.temperature ? `
              <div class="stat-card">
                <div class="stat-card-header">
                  <span class="stat-card-label">Temperature</span>
                  <div class="stat-card-icon card-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/></svg></div>
                </div>
                <div class="stat-card-value" style="color:var(--color-danger)">${sensors.temperature.value}°C</div>
              </div>
            ` : ''}
            ${sensors.humidity ? `
              <div class="stat-card">
                <div class="stat-card-header">
                  <span class="stat-card-label">Humidity</span>
                  <div class="stat-card-icon card-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg></div>
                </div>
                <div class="stat-card-value" style="color:var(--color-primary)">${sensors.humidity.value}%</div>
              </div>
            ` : ''}
            ${sensors.gas ? `
              <div class="stat-card">
                <div class="stat-card-header">
                  <span class="stat-card-label">Gas Level</span>
                  <div class="stat-card-icon card-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                </div>
                <div class="stat-card-value" style="color:var(--color-warning)">${sensors.gas.value} ppm</div>
              </div>
            ` : ''}
          </div>
        ` : ''}
      ` : ''}

      <!-- Quick Actions -->
      <div class="section-header">
        <h2 class="section-title">Quick Actions</h2>
      </div>
      <div class="card" style="margin-bottom:var(--space-8);">
        <div class="quick-actions">
          <button class="quick-action-btn" onclick="window.location.hash='#/car-controller'" id="qa-car">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h8l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2M5 17v2m14-2v2"/></svg>
            Car Control
          </button>
          <button class="quick-action-btn" onclick="window.location.hash='#/home-automation'" id="qa-home">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg>
            Home
          </button>
          <button class="quick-action-btn" onclick="window.location.hash='#/sensor-dashboard'" id="qa-sensors">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            Sensors
          </button>
          <button class="quick-action-btn" onclick="window.location.hash='#/gesture-control'" id="qa-gesture">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2"><path d="M18 11V6a2 2 0 00-4 0v5M14 10V4a2 2 0 00-4 0v6M10 9.5V6a2 2 0 00-4 0v8l-1.46-1.46a2 2 0 00-2.83 2.83L6 20h10a4 4 0 004-4v-5a2 2 0 00-4 0"/></svg>
            Gestures
          </button>
        </div>
      </div>

      <!-- Overview Stats -->
      <div class="section-header">
        <h2 class="section-title">System Overview</h2>
      </div>
      <div class="dashboard-grid stagger-children" style="margin-bottom:var(--space-8);">
        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-label">Saved Devices</span>
            <div class="stat-card-icon card-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h.01"/><path d="M14 12h4"/></svg></div>
          </div>
          <div class="stat-card-value" style="color:var(--color-primary)">${devices.length}</div>
          <span class="stat-card-change">${isConnected ? '1 active' : 'None active'}</span>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-label">Rooms</span>
            <div class="stat-card-icon card-icon cyan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg></div>
          </div>
          <div class="stat-card-value" style="color:var(--color-secondary)">${rooms.length}</div>
          <span class="stat-card-change">Rooms created</span>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-label">Automations</span>
            <div class="stat-card-icon card-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,3 21,3 21,8"/><line x1="4" y1="20" x2="21" y2="3"/></svg></div>
          </div>
          <div class="stat-card-value" style="color:var(--color-accent)">${automations.filter(a => a.enabled).length}</div>
          <span class="stat-card-change">Active rules</span>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-label">Notifications</span>
            <div class="stat-card-icon card-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></div>
          </div>
          <div class="stat-card-value" style="color:var(--color-warning)">${unreadNotifs.length}</div>
          <span class="stat-card-change">Unread</span>
        </div>
      </div>

      ${devices.length > 0 ? `
        <!-- Recent Devices -->
        <div class="section-header">
          <h2 class="section-title">Saved Devices</h2>
          <a href="#/devices" class="section-action">Manage →</a>
        </div>
        <div class="card">
          <div class="device-list-compact">
            ${devices.slice(0, 5).map(d => `
              <div class="device-list-item" id="device-${d.id}">
                <div class="device-avatar" style="background:rgba(var(--color-primary-rgb),0.1)">📱</div>
                <div class="device-info">
                  <div class="device-name">${d.name}</div>
                  <div class="device-type">${d.connection || d.type} · ${timeAgo(d.lastSeen)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${notifications.length > 0 ? `
        <!-- Recent Activity -->
        <div style="margin-top:var(--space-8);">
          <div class="section-header">
            <h2 class="section-title">Recent Activity</h2>
            <a href="#/notifications" class="section-action">See All →</a>
          </div>
          <div class="card">
            <div class="activity-feed">
              ${notifications.slice(0, 5).map(n => `
                <div class="activity-item" id="activity-${n.id}">
                  <div class="activity-dot" style="background:${getNotifColor(n.type)}"></div>
                  <div class="activity-text"><strong>${n.title}</strong> — ${n.message}</div>
                  <span class="activity-time">${timeAgo(n.time)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function getNotifColor(type) {
  const colors = {
    device: 'var(--color-primary)',
    sensor: 'var(--color-warning)',
    automation: 'var(--color-accent)',
    battery: 'var(--color-danger)',
    security: 'var(--color-secondary)'
  };
  return colors[type] || 'var(--color-primary)';
}

function timeAgo(timestamp) {
  if (!timestamp) return 'Unknown';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
}
