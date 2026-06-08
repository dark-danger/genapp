// ============================================================
// GenApp — Storage Service (Web & Native Fallback)
// ============================================================

import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export const storage = {
  /**
   * Store a value by key
   * @param {string} key
   * @param {any} value
   */
  async set(key, value) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (Capacitor.isNativePlatform()) {
      try {
        await Preferences.set({ key, value: stringValue });
      } catch (err) {
        console.warn('Native preferences set failed:', err);
        localStorage.setItem(key, stringValue);
      }
    } else {
      localStorage.setItem(key, stringValue);
    }
  },

  /**
   * Retrieve a value by key
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    if (Capacitor.isNativePlatform()) {
      try {
        const { value } = await Preferences.get({ key });
        return value;
      } catch (err) {
        console.warn('Native preferences get failed:', err);
        return localStorage.getItem(key);
      }
    } else {
      return localStorage.getItem(key);
    }
  },

  /**
   * Delete a value by key
   * @param {string} key
   */
  async remove(key) {
    if (Capacitor.isNativePlatform()) {
      try {
        await Preferences.remove({ key });
      } catch (err) {
        console.warn('Native preferences remove failed:', err);
        localStorage.removeItem(key);
      }
    } else {
      localStorage.removeItem(key);
    }
  }
};
