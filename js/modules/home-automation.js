// ============================================================
// GenApp — Home Automation (Clean — No Fake Rooms)
// ============================================================

import { store } from '../store.js';
import { showToast } from '../app.js';
import { connectivity } from '../services/connectivity.js';

export function renderHomeAutomation(container) {
  const rooms = store.get('rooms') || [];

  container.innerHTML = `
    <div class="home-automation-page page-enter">
      <div class="page-header flex justify-between items-center">
        <div>
          <h1 class="page-title">Home Automation</h1>
          <p class="page-subtitle">Control your smart home devices by room</p>
        </div>
        <button class="btn btn-primary btn-sm" id="add-room-btn">+ Add Room</button>
      </div>

      ${rooms.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
          </div>
          <h3 class="empty-state-title">No Rooms Yet</h3>
          <p class="empty-state-desc">Create your first room to start organizing and controlling your smart home devices.</p>
          <button class="btn btn-primary" id="add-room-empty-btn">+ Create Room</button>
        </div>
      ` : `
        <div class="room-grid stagger-children">
          ${rooms.map(room => renderRoom(room)).join('')}
        </div>
      `}
    </div>
  `;

  setupHomeAutomationEvents(container, rooms);
}

function renderRoom(room) {
  const devices = room.devices || [];
  const activeCount = devices.filter(d => d.status).length;
  return `
    <div class="room-card" id="room-${room.id}">
      <div class="room-card-header">
        <div>
          <span style="font-size: var(--text-2xl); margin-right: var(--space-2);">${room.icon}</span>
          <span class="room-name">${room.name}</span>
        </div>
        <div class="flex items-center gap-2" style="display:flex;align-items:center;gap:8px;">
          <span class="room-device-count">${activeCount}/${devices.length} active</span>
          <button class="btn btn-ghost btn-xs" data-delete-room="${room.id}" title="Delete Room">🗑️</button>
        </div>
      </div>
      ${devices.length === 0 ? `
        <div style="text-align:center; padding:var(--space-6); color:var(--text-muted); font-size:var(--text-sm);">
          No devices in this room yet.<br>
          <button class="btn btn-secondary btn-xs" data-add-device-room="${room.id}" style="margin-top:var(--space-3);">+ Add Device</button>
        </div>
      ` : `
        <div class="room-devices">
          ${devices.map(d => renderRoomDevice(d)).join('')}
        </div>
      `}
    </div>
  `;
}

function renderRoomDevice(device) {
  const icons = {
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 019 14"/></svg>',
    fan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 12c-3-3-6-3-8-1s-1 6 1 8M12 12c3 3 6 3 8 1s1-6-1-8M12 12c-3 3-3 6-1 8s6 1 8-1M12 12c3-3 3-6 1-8s-6-1-8 1"/><circle cx="12" cy="12" r="1"/></svg>',
    plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22v-4M8 18h8"/><rect x="6" y="10" width="12" height="8" rx="2"/><line x1="10" y1="2" x2="10" y2="6"/><line x1="14" y1="2" x2="14" y2="6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
    sensor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  };

  return `
    <div class="room-device ${device.status ? 'active' : ''}" data-device-id="${device.id}" id="homedev-${device.id}">
      <div class="room-device-icon">${icons[device.type] || icons.plug}</div>
      <span class="room-device-name">${device.name}</span>
    </div>
  `;
}

function setupHomeAutomationEvents(container, rooms) {
  // Add room button
  const addRoomHandler = () => {
    const name = prompt('Enter room name (e.g., Bedroom, Kitchen, Office):');
    if (!name || !name.trim()) return;

    const icons = ['🛋️', '🛏️', '🍳', '🚗', '💼', '🏠', '🎮', '🌿'];
    const icon = icons[Math.floor(Math.random() * icons.length)];

    store.addRoom({
      id: 'r_' + Date.now(),
      name: name.trim(),
      icon: icon,
      devices: []
    });

    showToast(`Room "${name.trim()}" created!`, 'success');
    renderHomeAutomation(container);
  };

  document.getElementById('add-room-btn')?.addEventListener('click', addRoomHandler);
  document.getElementById('add-room-empty-btn')?.addEventListener('click', addRoomHandler);

  // Delete room
  container.querySelectorAll('[data-delete-room]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const roomId = btn.dataset.deleteRoom;
      if (confirm('Delete this room and all its devices?')) {
        store.removeRoom(roomId);
        showToast('Room deleted', 'info');
        renderHomeAutomation(container);
      }
    });
  });

  // Add device to room
  container.querySelectorAll('[data-add-device-room]').forEach(btn => {
    btn.addEventListener('click', () => {
      const roomId = btn.dataset.addDeviceRoom;
      const name = prompt('Enter device name (e.g., Main Light, Ceiling Fan):');
      if (!name || !name.trim()) return;

      const type = prompt('Enter device type (light, fan, plug, lock, sensor):') || 'plug';
      const command = prompt('Enter ON command to send (e.g., LIGHT_ON):') || '';

      const rooms = store.get('rooms') || [];
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        room.devices.push({
          id: 'rd_' + Date.now(),
          name: name.trim(),
          type: type.trim().toLowerCase(),
          status: false,
          command: command.trim()
        });
        store.set('rooms', rooms);
        showToast(`${name.trim()} added to room!`, 'success');
        renderHomeAutomation(container);
      }
    });
  });

  // Toggle room devices
  document.querySelectorAll('.room-device').forEach(el => {
    el.addEventListener('click', () => {
      const deviceId = el.dataset.deviceId;
      const rooms = store.get('rooms') || [];
      
      for (const room of rooms) {
        const device = (room.devices || []).find(d => d.id === deviceId);
        if (device) {
          device.status = !device.status;
          el.classList.toggle('active', device.status);
          
          // Send command via connectivity
          if (device.command) {
            const cmd = device.status ? device.command : device.command.replace('ON', 'OFF');
            connectivity.send(cmd);
          }

          // Update room count
          const roomCard = document.getElementById(`room-${room.id}`);
          if (roomCard) {
            const activeCount = room.devices.filter(d => d.status).length;
            const countEl = roomCard.querySelector('.room-device-count');
            if (countEl) countEl.textContent = `${activeCount}/${room.devices.length} active`;
          }
          
          store.set('rooms', rooms);
          showToast(`${device.name} turned ${device.status ? 'ON' : 'OFF'}`, device.status ? 'success' : 'info');
          break;
        }
      }
    });
  });
}
