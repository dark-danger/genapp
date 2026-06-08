// ============================================================
// GenApp — Reactive State Store (Clean — No Mock Data)
// ============================================================

class Store {
  constructor() {
    this.state = {
      devices: [],          // Only real discovered/saved devices
      sensors: {},           // Only real telemetry data
      rooms: [],             // User-created rooms only
      notifications: [],     // Real notifications only
      automations: [],       // User-created rules only
      user: {
        name: 'User',
        avatar: null,
        plan: 'Free'
      },
      connection: {
        type: 'none',
        status: 'disconnected',
        device: null,
        logs: []
      },
      controlBuilder: {
        layouts: [],
        currentLayout: null
      },
      analytics: {
        totalDevices: 0,
        activeDevices: 0,
        totalAutomations: 0,
        dataPoints: 0,
        uptime: 0
      }
    };
    this.listeners = {};

    // Load persisted state
    this._loadPersistedState();
  }

  get(key) {
    return key.split('.').reduce((obj, k) => obj?.[k], this.state);
  }

  set(key, value) {
    const keys = key.split('.');
    let obj = this.state;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this._notify(key, value);
    this._persistState();
  }

  subscribe(key, callback) {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(callback);
    return () => {
      this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
    };
  }

  _notify(key, value) {
    (this.listeners[key] || []).forEach(cb => cb(value));
    // Also notify parent keys
    const parts = key.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentKey = parts.slice(0, i).join('.');
      (this.listeners[parentKey] || []).forEach(cb => cb(this.get(parentKey)));
    }
  }

  _loadPersistedState() {
    try {
      const saved = localStorage.getItem('genapp-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge saved state (only user-data keys, not connection status)
        if (parsed.rooms) this.state.rooms = parsed.rooms;
        if (parsed.automations) this.state.automations = parsed.automations;
        if (parsed.user) this.state.user = { ...this.state.user, ...parsed.user };
        if (parsed.devices) this.state.devices = parsed.devices;
        if (parsed.notifications) this.state.notifications = parsed.notifications;
      }
    } catch (err) {
      console.warn('[GenApp] Failed to load persisted state:', err);
    }
  }

  _persistState() {
    try {
      const toSave = {
        rooms: this.state.rooms,
        automations: this.state.automations,
        user: this.state.user,
        devices: this.state.devices,
        notifications: this.state.notifications
      };
      localStorage.setItem('genapp-state', JSON.stringify(toSave));
    } catch (err) {
      console.warn('[GenApp] Failed to persist state:', err);
    }
  }

  // Add a saved device (from scan/manual entry)
  addDevice(device) {
    const devices = this.get('devices') || [];
    const exists = devices.find(d => d.id === device.id);
    if (!exists) {
      devices.push(device);
      this.set('devices', devices);
    }
  }

  // Remove a saved device
  removeDevice(deviceId) {
    const devices = (this.get('devices') || []).filter(d => d.id !== deviceId);
    this.set('devices', devices);
  }

  // Add a room
  addRoom(room) {
    const rooms = this.get('rooms') || [];
    rooms.push(room);
    this.set('rooms', rooms);
  }

  // Remove a room
  removeRoom(roomId) {
    const rooms = (this.get('rooms') || []).filter(r => r.id !== roomId);
    this.set('rooms', rooms);
  }

  // Add an automation rule
  addAutomation(rule) {
    const automations = this.get('automations') || [];
    automations.push(rule);
    this.set('automations', automations);
  }

  // Remove an automation rule
  removeAutomation(ruleId) {
    const automations = (this.get('automations') || []).filter(a => a.id !== ruleId);
    this.set('automations', automations);
  }

  // Push a notification
  pushNotification(type, title, message) {
    const notifications = this.get('notifications') || [];
    const newNotif = {
      id: 'n_' + Date.now(),
      type,
      title,
      message,
      time: Date.now(),
      read: false
    };
    this.set('notifications', [newNotif, ...notifications]);
    return newNotif;
  }

  // Clear all notifications
  clearNotifications() {
    this.set('notifications', []);
  }
}

export const store = new Store();
