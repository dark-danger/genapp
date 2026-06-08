// ============================================================
// GenApp — Module 14: Notifications Center
// ============================================================

import { store } from '../store.js';
import { showToast } from '../app.js';

let activeFilter = 'all';

export function renderNotifications(container) {
  const notifications = store.get('notifications') || [];
  const filtered = activeFilter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === activeFilter);

  const filters = [
    { key: 'all', label: 'All', icon: '📋' },
    { key: 'device', label: 'Device', icon: '📱' },
    { key: 'sensor', label: 'Sensor', icon: '🌡️' },
    { key: 'battery', label: 'Battery', icon: '🔋' },
    { key: 'automation', label: 'Automation', icon: '⚡' },
    { key: 'security', label: 'Security', icon: '🔒' },
  ];

  container.innerHTML = `
    <div class="notifications-page page-enter">
      <div class="page-header flex justify-between items-center" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:var(--space-4);">
        <div>
          <h1 class="page-title">Notification Hub</h1>
          <p class="page-subtitle">${notifications.filter(n => !n.read).length} unread alerts from connected device nodes</p>
        </div>
        <div class="flex gap-3" style="display:flex; gap: var(--space-2);">
          <button class="btn btn-secondary btn-sm" id="mark-all-read">✓ Mark All Read</button>
          <button class="btn btn-ghost btn-sm" id="clear-all-notifs">Clear All</button>
        </div>
      </div>

      <!-- Filter Chips -->
      <div class="flex gap-2" style="display:flex; gap: 6px; margin-top: var(--space-4); margin-bottom: var(--space-6); overflow-x:auto; padding-bottom: var(--space-2);">
        ${filters.map(f => `
          <button class="chip ${activeFilter === f.key ? 'chip-primary' : ''}" data-filter="${f.key}" id="notif-filter-${f.key}" style="white-space:nowrap;">
            ${f.icon} ${f.label}
          </button>
        `).join('')}
      </div>

      <!-- Push Toggle Card -->
      <div class="card" style="margin-bottom: var(--space-6); background: var(--bg-surface); border: 1px solid rgba(255,255,255,0.05); padding: var(--space-4);">
        <div class="flex items-center justify-between" style="display:flex; justify-content:space-between; align-items:center;">
          <div class="flex items-center gap-3" style="display:flex; align-items:center; gap: 0.75rem;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg>
            <div>
              <div style="font-weight:600; font-size:var(--text-sm);">Hardware Event Alerts</div>
              <div style="font-size:var(--text-xs); color:var(--text-muted);">Dispatch native OS system push banner notifications</div>
            </div>
          </div>
          <label class="toggle-switch" style="position:relative; display:inline-block; width:36px; height:20px;">
            <input type="checkbox" checked id="push-toggle" style="opacity:0; width:0; height:0;">
            <span class="toggle-slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:var(--color-primary); border-radius:34px; transition:0.2s;"></span>
          </label>
        </div>
      </div>

      <!-- Notification List -->
      <div class="flex flex-col gap-3 stagger-children" style="display:flex; flex-direction:column; gap: var(--space-3);">
        ${filtered.length === 0 ? `
          <div class="card" style="text-align:center; padding: var(--space-12) var(--space-6); background: var(--bg-surface); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-lg);">
            <div style="font-size:48px; margin-bottom: var(--space-4);">🔔</div>
            <div style="color:var(--text-muted); font-size:var(--text-sm);">No notifications found under this filter category.</div>
          </div>
        ` : filtered.map(n => `
          <div class="card notif-item-card" data-id="${n.id}" style="cursor:pointer; position:relative; background: var(--bg-surface); border: 1px solid rgba(255,255,255,0.05); border-left: 4px solid ${!n.read ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}; padding: var(--space-4); opacity: ${n.read ? '0.65' : '1'}; transition: opacity 0.2s;" id="notif-${n.id}">
            <div class="flex items-center gap-4" style="display:flex; align-items:center; gap: 1rem;">
              <div style="width:40px; height:40px; border-radius: var(--radius-md); background:${getNotifBg(n.type)}; display:flex; align-items:center; justify-content:center; font-size:var(--text-base); flex-shrink:0;">
                ${getNotifIcon(n.type)}
              </div>
              <div style="flex:1;">
                <div class="flex items-center gap-2" style="display:flex; align-items:center; gap: 6px;">
                  <span style="font-weight:600; font-size:var(--text-sm);">${escapeHtml(n.title)}</span>
                  ${!n.read ? '<span style="width:6px;height:6px;border-radius:50%;background:var(--color-primary);flex-shrink:0;"></span>' : ''}
                </div>
                <div style="font-size:var(--text-xs); color:var(--text-secondary); margin-top:2px;">${escapeHtml(n.message)}</div>
              </div>
              <span style="font-size:var(--text-xs); color:var(--text-tertiary); white-space:nowrap;">${timeAgo(n.time)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Attach toggle-switch track background updates
  const pushBox = container.querySelector('#push-toggle');
  if (pushBox) {
    const pushSlider = pushBox.nextElementSibling;
    pushBox.addEventListener('change', () => {
      pushSlider.style.backgroundColor = pushBox.checked ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.1)';
    });
    pushSlider.style.backgroundColor = pushBox.checked ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.1)';
  }

  // Filter click events
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      renderNotifications(container);
    });
  });

  // Mark individual as read
  container.querySelectorAll('.notif-item-card').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const index = notifications.findIndex(x => x.id === id);
      if (index !== -1 && !notifications[index].read) {
        notifications[index].read = true;
        store.set('notifications', [...notifications]);
        renderNotifications(container);
      }
    });
  });

  // Mark all read
  document.getElementById('mark-all-read')?.addEventListener('click', () => {
    let changed = false;
    notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
        changed = true;
      }
    });
    if (changed) {
      store.set('notifications', [...notifications]);
      renderNotifications(container);
      showToast('✓ All alerts marked as read', 'success');
    }
  });

  // Clear all
  document.getElementById('clear-all-notifs')?.addEventListener('click', () => {
    if (notifications.length > 0) {
      store.set('notifications', []);
      renderNotifications(container);
      showToast('🗑️ All notifications cleared', 'info');
    }
  });
}

function getNotifIcon(type) {
  const m = { device: '📱', sensor: '🌡️', automation: '⚡', battery: '🔋', security: '🔒' };
  return m[type] || '🔔';
}

function getNotifBg(type) {
  const m = { 
    device: 'rgba(37,99,235,0.12)', 
    sensor: 'rgba(6,182,212,0.12)', 
    automation: 'rgba(34,197,94,0.12)', 
    battery: 'rgba(245,158,11,0.12)', 
    security: 'rgba(239,68,68,0.12)' 
  };
  return m[type] || 'rgba(255,255,255,0.05)';
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'Just now';
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
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
