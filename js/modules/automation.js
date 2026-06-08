// ============================================================
// GenApp — Automation Builder (Clean — No Fake Rules)
// ============================================================

import { store } from '../store.js';
import { showToast } from '../app.js';

export function renderAutomation(container) {
  const automations = store.get('automations') || [];

  container.innerHTML = `
    <div class="automation-page page-enter">
      <div class="page-header flex justify-between items-center">
        <div>
          <h1 class="page-title">Automation Builder</h1>
          <p class="page-subtitle">Create IF-THEN rules to automate your devices</p>
        </div>
        <button class="btn btn-primary btn-sm" id="new-automation-btn">+ New Rule</button>
      </div>

      ${automations.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,3 21,3 21,8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21,16 21,21 16,21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
          </div>
          <h3 class="empty-state-title">No Automation Rules</h3>
          <p class="empty-state-desc">Create IF-THEN rules to automatically control your devices based on sensor data, time, or other conditions.</p>
          <button class="btn btn-primary" id="new-automation-empty-btn">+ Create First Rule</button>
        </div>
      ` : `
        <div class="section-header">
          <h2 class="section-title">Active Rules</h2>
          <span style="font-size:var(--text-sm); color:var(--text-muted);">${automations.filter(a => a.enabled).length} active</span>
        </div>

        <div class="flex flex-col gap-4 stagger-children">
          ${automations.map(a => `
            <div class="card" id="auto-${a.id}">
              <div class="flex items-center gap-4" style="display:flex;align-items:center;gap:16px;">
                <div style="width:48px; height:48px; border-radius: var(--radius-lg); background:${a.enabled ? 'rgba(var(--color-accent-rgb),0.1)' : 'rgba(255,255,255,0.05)'}; display:flex; align-items:center; justify-content:center;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${a.enabled ? 'var(--color-accent)' : 'var(--text-tertiary)'}" stroke-width="2"><polyline points="16,3 21,3 21,8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21,16 21,21 16,21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
                </div>
                <div style="flex:1;">
                  <div style="font-weight:600; font-size: var(--text-base); margin-bottom: 2px;">${a.name}</div>
                  <div style="display:flex; gap: var(--space-3); flex-wrap:wrap;">
                    <span class="chip chip-primary" style="font-size:10px;">IF ${a.condition}</span>
                    <span style="color:var(--text-tertiary); font-size:var(--text-xs); align-self:center;">→</span>
                    <span class="chip chip-success" style="font-size:10px;">THEN ${a.action}</span>
                  </div>
                </div>
                <div class="flex items-center gap-3" style="display:flex;align-items:center;gap:12px;">
                  <button class="btn btn-ghost btn-xs" data-delete-auto="${a.id}" title="Delete">🗑️</button>
                  <label class="toggle-switch">
                    <input type="checkbox" ${a.enabled ? 'checked' : ''} data-auto-id="${a.id}">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}

      <!-- New Automation Builder -->
      <div id="automation-builder" style="display:none; margin-top: var(--space-8);">
        <div class="section-header">
          <h2 class="section-title">New Automation Rule</h2>
        </div>
        <div class="card">
          <div class="flex flex-col gap-6" style="display:flex;flex-direction:column;gap:24px;">
            <div class="input-group">
              <label class="input-label">Rule Name</label>
              <input class="input-field" placeholder="e.g., Auto Fan Control" id="rule-name" />
            </div>

            <!-- IF Section -->
            <div style="padding: var(--space-4); background: rgba(var(--color-primary-rgb), 0.05); border-radius: var(--radius-lg); border: 1px solid rgba(var(--color-primary-rgb), 0.15);">
              <div style="font-family: var(--font-display); font-size: var(--text-sm); color: var(--color-primary); margin-bottom: var(--space-3);">IF (Condition)</div>
              <div class="flex gap-3 flex-wrap" style="display:flex;gap:12px;flex-wrap:wrap;">
                <div class="select-wrapper" style="flex:1; min-width:150px;">
                  <select class="select-field" id="rule-sensor">
                    <option>Temperature</option>
                    <option>Humidity</option>
                    <option>Gas Level</option>
                    <option>Motion</option>
                    <option>Time</option>
                    <option>Device Status</option>
                  </select>
                </div>
                <div class="select-wrapper" style="width:100px;">
                  <select class="select-field" id="rule-operator">
                    <option>></option>
                    <option><</option>
                    <option>=</option>
                    <option>!=</option>
                  </select>
                </div>
                <input class="input-field" placeholder="Value" style="width:120px;" id="rule-value" />
              </div>
            </div>

            <!-- THEN Section -->
            <div style="padding: var(--space-4); background: rgba(var(--color-accent-rgb), 0.05); border-radius: var(--radius-lg); border: 1px solid rgba(var(--color-accent-rgb), 0.15);">
              <div style="font-family: var(--font-display); font-size: var(--text-sm); color: var(--color-accent); margin-bottom: var(--space-3);">THEN (Action)</div>
              <div class="flex gap-3 flex-wrap" style="display:flex;gap:12px;flex-wrap:wrap;">
                <div class="select-wrapper" style="flex:1; min-width:150px;">
                  <select class="select-field" id="rule-action">
                    <option>Send command</option>
                    <option>Send notification</option>
                    <option>Send MQTT message</option>
                    <option>Turn ON device</option>
                    <option>Turn OFF device</option>
                  </select>
                </div>
                <input class="input-field" placeholder="Command / Device / Topic" style="flex:1; min-width:150px;" id="rule-target" />
              </div>
            </div>

            <div class="flex gap-3 justify-end" style="display:flex;gap:12px;justify-content:flex-end;">
              <button class="btn btn-ghost" id="cancel-rule">Cancel</button>
              <button class="btn btn-primary" id="save-rule">💾 Save Rule</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  setupAutomationEvents(container);
}

function setupAutomationEvents(container) {
  // Toggle automations
  document.querySelectorAll('[data-auto-id]').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const id = toggle.dataset.autoId;
      const automations = store.get('automations') || [];
      const automation = automations.find(a => a.id === id);
      if (automation) {
        automation.enabled = toggle.checked;
        store.set('automations', automations);
        showToast(`${automation.name} ${toggle.checked ? 'enabled' : 'disabled'}`, toggle.checked ? 'success' : 'info');
      }
    });
  });

  // Delete automation
  container.querySelectorAll('[data-delete-auto]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deleteAuto;
      if (confirm('Delete this automation rule?')) {
        store.removeAutomation(id);
        showToast('Automation deleted', 'info');
        renderAutomation(container);
      }
    });
  });

  // Show new automation form
  const showBuilder = () => {
    const builder = document.getElementById('automation-builder');
    if (builder) {
      builder.style.display = 'block';
      builder.scrollIntoView({ behavior: 'smooth' });
    }
  };

  document.getElementById('new-automation-btn')?.addEventListener('click', showBuilder);
  document.getElementById('new-automation-empty-btn')?.addEventListener('click', showBuilder);

  document.getElementById('cancel-rule')?.addEventListener('click', () => {
    document.getElementById('automation-builder').style.display = 'none';
  });

  document.getElementById('save-rule')?.addEventListener('click', () => {
    const name = document.getElementById('rule-name')?.value || 'New Rule';
    const sensor = document.getElementById('rule-sensor')?.value || 'Temperature';
    const operator = document.getElementById('rule-operator')?.value || '>';
    const value = document.getElementById('rule-value')?.value || '30';
    const action = document.getElementById('rule-action')?.value || 'Send command';
    const target = document.getElementById('rule-target')?.value || '';

    if (!name.trim()) {
      showToast('Please enter a rule name', 'warning');
      return;
    }

    store.addAutomation({
      id: 'a_' + Date.now(),
      name: name.trim(),
      condition: `${sensor} ${operator} ${value}`,
      action: `${action}${target ? ': ' + target : ''}`,
      enabled: true,
      triggers: 0
    });

    showToast(`Rule "${name.trim()}" created!`, 'success');
    document.getElementById('automation-builder').style.display = 'none';
    renderAutomation(container);
  });
}
