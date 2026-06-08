// ============================================================
// GenApp — Application Entry Point
// ============================================================

import { router } from './router.js';
import { store } from './store.js';
import { themeManager } from './theme.js';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { renderDashboard } from './modules/dashboard.js';
import { renderCarController } from './modules/car-controller.js';
import { renderGestureControl } from './modules/gesture-control.js';
import { renderHomeAutomation } from './modules/home-automation.js';
import { renderControlBuilder } from './modules/control-builder.js';
import { renderDeviceManager } from './modules/device-manager.js';
import { renderSensorDashboard } from './modules/sensor-dashboard.js';
import { renderCamera } from './modules/camera.js';
import { renderAutomation } from './modules/automation.js';
import { renderAIAssistant } from './modules/ai-assistant.js';
import { renderMarketplace } from './modules/marketplace.js';
import { renderCloudSync } from './modules/cloud-sync.js';
import { renderSecurity } from './modules/security.js';
import { renderNotifications } from './modules/notifications.js';
import { renderAnalytics } from './modules/analytics.js';
import { renderProfile } from './modules/profile.js';

class GenApp {
  constructor() {
    this.splashDuration = 2200;
    this.knownNotificationIds = new Set();
  }

  async init() {
    // Create splash particles
    this.createSplashParticles();
    
    // Initialize theme
    themeManager.init();

    // Setup sidebar interactions
    this.setupSidebar();

    // Register routes
    this.registerRoutes();

    // Initialize router
    router.init('page-container');

    // Subscribe to global connection status to update header dot indicator
    store.subscribe('connection', (conn) => {
      const dot = document.getElementById('mobile-header-conn-dot');
      if (!dot) return;
      
      if (conn.status === 'connected') {
        dot.className = 'status-dot connected';
      } else if (conn.status === 'connecting') {
        dot.className = 'status-dot connecting';
      } else {
        dot.className = 'status-dot disconnected';
      }
    });

    // Initialize Native Android capabilities
    await this.initNativeFeatures();

    // Show app after splash
    setTimeout(() => {
      this.hideSplash();
    }, this.splashDuration);
  }

  async initNativeFeatures() {
    if (Capacitor.isNativePlatform()) {
      try {
        // Request Local Notifications permissions
        const perm = await LocalNotifications.requestPermissions();
        console.log('[GenApp] Native notifications permission status:', perm.display);

        // Pre-populate existing notifications
        const existing = store.get('notifications') || [];
        existing.forEach(n => this.knownNotificationIds.add(n.id));

        // Subscribe to store notification updates
        store.subscribe('notifications', (notifs) => {
          if (!notifs) return;
          notifs.forEach(n => {
            if (!this.knownNotificationIds.has(n.id)) {
              this.knownNotificationIds.add(n.id);
              if (!n.read) {
                this.showNativeNotification(n.title, n.message);
              }
            }
          });
        });
      } catch (err) {
        console.warn('[GenApp] Native features initialization failed:', err);
      }
    }
  }

  async showNativeNotification(title, message) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: title,
              body: message,
              id: Math.floor(Math.random() * 100000),
              schedule: { at: new Date(Date.now() + 50) }
            }
          ]
        });
      }
    } catch (err) {
      console.warn('[GenApp] Local notification schedule failed:', err);
    }
  }

  createSplashParticles() {
    const container = document.getElementById('splash-particles');
    if (!container) return;

    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'splash-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.setProperty('--tx', (Math.random() - 0.5) * 200 + 'px');
      particle.style.setProperty('--ty', (Math.random() - 0.5) * 200 + 'px');
      particle.style.setProperty('--s', (Math.random() * 2 + 0.5).toString());
      particle.style.animationDelay = Math.random() * 4 + 's';
      particle.style.animationDuration = (3 + Math.random() * 3) + 's';
      
      const colors = ['#2563EB', '#06B6D4', '#22C55E'];
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      
      container.appendChild(particle);
    }
  }

  hideSplash() {
    const splash = document.getElementById('splash-screen');
    const app = document.getElementById('app');
    
    if (splash) splash.classList.add('hidden');
    if (app) {
      app.style.display = 'flex';
      app.classList.add('animate-fade-in');
    }

    // Trigger initial route
    setTimeout(() => {
      router.handleRoute();
    }, 100);
  }

  setupSidebar() {
    // Collapse toggle
    const collapseBtn = document.getElementById('sidebar-toggle');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-collapsed');
        localStorage.setItem('genapp-sidebar-collapsed', document.body.classList.contains('sidebar-collapsed'));
      });
    }

    // Restore collapsed state
    if (localStorage.getItem('genapp-sidebar-collapsed') === 'true') {
      document.body.classList.add('sidebar-collapsed');
    }

    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (mobileMenuBtn && sidebar && overlay) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.add('mobile-open');
        overlay.classList.add('active');
        overlay.style.display = 'block';
      });

      overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
      });
    }
  }

  registerRoutes() {
    // Primary 5-tab routes
    router.register('dashboard', renderDashboard);
    router.register('devices', renderDeviceManager);
    router.register('controls', renderControlBuilder);
    router.register('automation', renderAutomation);
    router.register('profile', renderProfile);

    // Sub-routes accessible from sidebar/within pages
    router.register('car-controller', renderCarController);
    router.register('gesture-control', renderGestureControl);
    router.register('home-automation', renderHomeAutomation);
    router.register('sensor-dashboard', renderSensorDashboard);
    router.register('notifications', renderNotifications);

    // Coming Soon modules
    router.register('camera', renderCamera);
    router.register('ai-assistant', renderAIAssistant);
    router.register('marketplace', renderMarketplace);
    router.register('cloud-sync', renderCloudSync);
    router.register('security', renderSecurity);
    router.register('analytics', renderAnalytics);
  }
}

// Toast utility
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('exit');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Ripple effect utility
export function addRipple(e, element) {
  const rect = element.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple-effect';
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
  element.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

// Initialize app
const app = new GenApp();
app.init();
