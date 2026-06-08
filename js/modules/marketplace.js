// ============================================================
// GenApp — Module 11: Project Marketplace (Coming Soon)
// ============================================================

export function renderMarketplace(container) {
  container.innerHTML = `
    <div class="marketplace-page page-enter">
      <div class="page-header">
        <h1 class="page-title">Project Marketplace</h1>
        <p class="page-subtitle">Discover and integrate layouts, firmware templates, and automation rules shared by the community</p>
      </div>

      <div class="card" style="text-align: center; padding: var(--space-12) var(--space-6); background: var(--bg-surface); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: var(--radius-lg); margin-top: var(--space-6);">
        <div style="font-size: 4rem; margin-bottom: var(--space-4);">🏪</div>
        <h2 style="font-size: var(--text-xl); font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-2);">Coming Soon</h2>
        <p style="color: var(--text-muted); font-size: var(--text-sm); max-width: 480px; margin: 0 auto var(--space-8); line-height: 1.5;">
          The Project Marketplace is currently in development. Future releases will allow you to share custom dashboard JSON layouts, download pre-made Arduino/ESP32 driver files, and install community automation templates.
        </p>
        <div style="display: flex; gap: var(--space-3); justify-content: center;">
          <span class="chip" style="background: rgba(37,99,235,0.08); color: var(--color-primary-light); border: 1px solid rgba(37,99,235,0.2);">Dashboard Themes</span>
          <span class="chip" style="background: rgba(6,182,212,0.08); color: var(--color-secondary); border: 1px solid rgba(6,182,212,0.2);">Firmware Drivers</span>
          <span class="chip" style="background: rgba(34,197,94,0.08); color: var(--color-accent); border: 1px solid rgba(34,197,94,0.2);">Community Hub</span>
        </div>
      </div>
    </div>
  `;
}
