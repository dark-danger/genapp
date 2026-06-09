// ============================================================
// GenApp — Theme Manager
// ============================================================

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { storage } from './services/storage.js';

class ThemeManager {
  constructor() {
    this.theme = 'dark';
  }

  async init() {
    const savedTheme = await storage.get('genapp-theme');
    if (savedTheme) {
      this.theme = savedTheme;
    }
    document.documentElement.setAttribute('data-theme', this.theme);
    await this.syncNativeStatusBar();
    
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }
  }

  async toggle() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.theme);
    await storage.set('genapp-theme', this.theme);
    await this.syncNativeStatusBar();
  }

  async syncNativeStatusBar() {
    if (Capacitor.isNativePlatform()) {
      try {
        const isDark = this.theme === 'dark';
        await StatusBar.setBackgroundColor({ color: isDark ? '#0A0A0A' : '#F5F5F5' });
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
      } catch (err) {
        console.warn('Native status bar sync failed:', err);
      }
    }
  }

  get() {
    return this.theme;
  }

  isDark() {
    return this.theme === 'dark';
  }
}

export const themeManager = new ThemeManager();
