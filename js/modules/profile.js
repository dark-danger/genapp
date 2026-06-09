// ============================================================
// GenApp — Profile Page
// ============================================================

import { store } from '../store.js';
import { showToast } from '../app.js';
import { themeManager } from '../theme.js';
import { storage } from '../services/storage.js';

export function renderProfile(container) {
  const user = store.get('user') || { name: 'User', plan: 'Free' };
  const devices = store.get('devices') || [];
  const rooms = store.get('rooms') || [];
  const automations = store.get('automations') || [];
  const isDark = themeManager.isDark();

  container.innerHTML = `
    <div class="profile-page page-enter">
      <!-- Profile Header -->
      <div class="profile-header">
        <div class="profile-logo">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:80px;height:80px;">
            <defs>
              <linearGradient id="logo-grad-profile" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#2E8B57" />
                <stop offset="100%" stop-color="#3CB371" />
              </linearGradient>
            </defs>
            <polygon points="32,4 58,18 58,46 32,60 6,46 6,18" stroke="url(#logo-grad-profile)" stroke-width="3.5" stroke-linejoin="round" />
            <path d="M44,22 C40,16 30,16 24,20 C18,25 18,35 24,40 C30,45 42,43 44,34 L32,34" stroke="url(#logo-grad-profile)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="32" cy="34" r="3.5" fill="#40E0B0" />
            <circle cx="44" cy="22" r="3.5" fill="#2E8B57" />
            <circle cx="24" cy="40" r="3.5" fill="#3CB371" />
          </svg>
        </div>
        <h1 style="font-family:var(--font-display); font-size:var(--text-2xl); font-weight:700; letter-spacing:2px; background:var(--gradient-primary); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:var(--space-1);">GenApp</h1>
        <p style="font-size:var(--text-sm); color:var(--text-muted);">IoT Control Platform</p>
        <p style="font-size:var(--text-xs); color:var(--text-disabled); margin-top:var(--space-1); font-family:var(--font-mono);">v2.0.0</p>
      </div>

      <!-- Settings Section -->
      <div class="profile-section">
        <div class="section-header">
          <h2 class="section-title">Settings</h2>
        </div>
        <div class="card" style="padding:0; overflow:hidden;">
          <div class="profile-item" id="profile-theme-toggle">
            <div class="profile-item-left">
              <div class="profile-item-icon" style="background:rgba(var(--color-warning-rgb),0.1);">
                ${isDark ? '🌙' : '☀️'}
              </div>
              <div>
                <div class="profile-item-label">Theme</div>
                <div class="profile-item-desc">${isDark ? 'Dark Mode' : 'Light Mode'}</div>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="profile-theme-switch" ${isDark ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="profile-item" id="profile-name-item">
            <div class="profile-item-left">
              <div class="profile-item-icon" style="background:rgba(var(--color-primary-rgb),0.1);">👤</div>
              <div>
                <div class="profile-item-label">Display Name</div>
                <div class="profile-item-desc" id="profile-name-display">${user.name}</div>
              </div>
            </div>
            <span class="profile-item-arrow">✏️</span>
          </div>
        </div>
      </div>

      <!-- Data Management -->
      <div class="profile-section">
        <div class="section-header">
          <h2 class="section-title">Data Management</h2>
        </div>
        <div class="card" style="padding:0; overflow:hidden;">
          <div class="profile-item" id="profile-export">
            <div class="profile-item-left">
              <div class="profile-item-icon" style="background:rgba(var(--color-accent-rgb),0.1);">📤</div>
              <div>
                <div class="profile-item-label">Export Configuration</div>
                <div class="profile-item-desc">Backup devices, rooms, automations & layouts</div>
              </div>
            </div>
            <span class="profile-item-arrow">→</span>
          </div>

          <div class="profile-item" id="profile-import">
            <div class="profile-item-left">
              <div class="profile-item-icon" style="background:rgba(var(--color-secondary-rgb),0.1);">📥</div>
              <div>
                <div class="profile-item-label">Import Configuration</div>
                <div class="profile-item-desc">Restore from a backup file</div>
              </div>
            </div>
            <span class="profile-item-arrow">→</span>
          </div>

          <div class="profile-item" id="profile-clear-data">
            <div class="profile-item-left">
              <div class="profile-item-icon" style="background:rgba(var(--color-danger-rgb),0.1);">🗑️</div>
              <div>
                <div class="profile-item-label">Clear All Data</div>
                <div class="profile-item-desc">Remove all saved devices, rooms, and rules</div>
              </div>
            </div>
            <span class="profile-item-arrow">→</span>
          </div>
        </div>
      </div>

      <!-- Statistics -->
      <div class="profile-section">
        <div class="section-header">
          <h2 class="section-title">Statistics</h2>
        </div>
        <div class="dashboard-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom:var(--space-6);">
          <div class="stat-card" style="text-align:center;">
            <div class="stat-card-value" style="color:var(--color-primary); font-size:var(--text-2xl);">${devices.length}</div>
            <span class="stat-card-label">Devices</span>
          </div>
          <div class="stat-card" style="text-align:center;">
            <div class="stat-card-value" style="color:var(--color-secondary); font-size:var(--text-2xl);">${rooms.length}</div>
            <span class="stat-card-label">Rooms</span>
          </div>
          <div class="stat-card" style="text-align:center;">
            <div class="stat-card-value" style="color:var(--color-accent); font-size:var(--text-2xl);">${automations.length}</div>
            <span class="stat-card-label">Automations</span>
          </div>
        </div>
      </div>

      <!-- About -->
      <div class="profile-section">
        <div class="section-header">
          <h2 class="section-title">About</h2>
        </div>
        <div class="card" style="padding:0; overflow:hidden;">
          <div class="profile-item" id="profile-support">
            <div class="profile-item-left">
              <div class="profile-item-icon" style="background:rgba(var(--color-primary-rgb),0.1);">💬</div>
              <div>
                <div class="profile-item-label">Support</div>
                <div class="profile-item-desc">Get help or report issues</div>
              </div>
            </div>
            <span class="profile-item-arrow">→</span>
          </div>

          <div class="profile-item" id="profile-feedback">
            <div class="profile-item-left">
              <div class="profile-item-icon" style="background:rgba(var(--color-warning-rgb),0.1);">⭐</div>
              <div>
                <div class="profile-item-label">Feedback</div>
                <div class="profile-item-desc">Share your experience</div>
              </div>
            </div>
            <span class="profile-item-arrow">→</span>
          </div>

          <div class="profile-item">
            <div class="profile-item-left">
              <div class="profile-item-icon" style="background:rgba(var(--color-secondary-rgb),0.1);">ℹ️</div>
              <div>
                <div class="profile-item-label">About GenApp</div>
                <div class="profile-item-desc">Professional IoT Control Platform v2.0.0</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Coming Soon Features -->
      <div class="profile-section" style="margin-bottom:var(--space-16);">
        <div class="section-header">
          <h2 class="section-title">Coming Soon</h2>
        </div>
        <div class="card">
          <div style="display:flex; flex-wrap:wrap; gap:var(--space-3);">
            <span class="chip">🤖 AI Assistant</span>
            <span class="chip">🛒 Marketplace</span>
            <span class="chip">☁️ Cloud Sync</span>
            <span class="chip">🔒 Security</span>
            <span class="chip">📊 Analytics</span>
            <span class="chip">📷 Camera Feed</span>
            <span class="chip">🌾 Smart Agriculture</span>
            <span class="chip">🏭 Industrial IoT</span>
          </div>
        </div>
      </div>
    </div>
  `;

  setupProfileEvents(container);
}

function setupProfileEvents(container) {
  // Theme toggle
  document.getElementById('profile-theme-switch')?.addEventListener('change', () => {
    themeManager.toggle();
    renderProfile(container); // Re-render to update icon
  });

  // Edit name
  document.getElementById('profile-name-item')?.addEventListener('click', () => {
    const current = store.get('user').name || 'User';
    const newName = prompt('Enter your display name:', current);
    if (newName && newName.trim()) {
      store.set('user', { ...store.get('user'), name: newName.trim() });
      renderProfile(container);
      showToast('Display name updated!', 'success');
    }
  });

  // Export
  document.getElementById('profile-export')?.addEventListener('click', () => {
    const data = {
      devices: store.get('devices'),
      rooms: store.get('rooms'),
      automations: store.get('automations'),
      user: store.get('user'),
      exportedAt: new Date().toISOString(),
      version: '2.0.0'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genapp-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Configuration exported!', 'success');
  });

  // Import
  document.getElementById('profile-import')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.devices) store.set('devices', data.devices);
          if (data.rooms) store.set('rooms', data.rooms);
          if (data.automations) store.set('automations', data.automations);
          if (data.user) store.set('user', { ...store.get('user'), ...data.user });
          renderProfile(container);
          showToast('Configuration imported!', 'success');
        } catch {
          showToast('Invalid backup file', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });

  // Clear data
  document.getElementById('profile-clear-data')?.addEventListener('click', () => {
    if (confirm('This will remove all saved devices, rooms, and automation rules. Continue?')) {
      store.set('devices', []);
      store.set('rooms', []);
      store.set('automations', []);
      store.set('notifications', []);
      localStorage.removeItem('genapp-state');
      localStorage.removeItem('genapp-builder-layout');
      renderProfile(container);
      showToast('All data cleared', 'info');
    }
  });

  // Support
  document.getElementById('profile-support')?.addEventListener('click', () => {
    showToast('Support: Contact support@genapp.io', 'info');
  });

  // Feedback
  document.getElementById('profile-feedback')?.addEventListener('click', () => {
    showToast('Thank you for your interest! Feedback system coming soon.', 'info');
  });
}
