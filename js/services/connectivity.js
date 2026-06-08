// ============================================================
// GenApp — Centralized Connectivity Service (Clean — No Mocks)
// ============================================================

import { store } from '../store.js';
import { showToast } from '../app.js';
import mqtt from 'mqtt'; // Uses the installed mqtt package

class ConnectivityService {
  constructor() {
    this.connectionType = 'none'; // 'none' | 'bluetooth' | 'wifi' | 'mqtt'
    this.connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
    this.connectedDeviceName = '';
    
    // Connection configs
    this.wifiConfig = { ip: '192.168.4.1', port: '80', protocol: 'http', socket: null };
    this.bluetoothConfig = { address: '', name: '' };
    this.mqttConfig = { broker: 'broker.hivemq.com', port: '8000', topic: 'genapp/iot', client: null };

    // Listeners for incoming telemetry data
    this.dataListeners = [];
    this.logs = [];
    
    // Add initial log
    this.addLog('System', 'Connectivity Manager Initialized.');
  }

  // Add a rolling system log
  addLog(source, message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] [${source}] ${message}`;
    this.logs.unshift(logEntry);
    if (this.logs.length > 100) this.logs.pop(); // Keep last 100 logs
    
    // Notify store for real-time log rendering
    store.set('connection.logs', [...this.logs]);
    console.log(logEntry);
  }

  // Register data telemetry listener
  onDataReceived(callback) {
    this.dataListeners.push(callback);
    return () => {
      this.dataListeners = this.dataListeners.filter(cb => cb !== callback);
    };
  }

  // Distribute incoming raw telemetry to all components
  triggerDataReceived(rawData) {
    this.addLog('Incoming Data', rawData);
    
    // Try to parse as JSON or custom formats
    let parsedData = null;
    try {
      parsedData = JSON.parse(rawData);
    } catch {
      // Parse custom serial format e.g., "T:24.5,H:62,G:120"
      if (rawData.includes(':')) {
        parsedData = {};
        rawData.split(',').forEach(item => {
          const [key, val] = item.split(':');
          if (key && val) parsedData[key.trim().toLowerCase()] = parseFloat(val);
        });
      }
    }

    if (parsedData) {
      this.updateSensorStore(parsedData);
    }

    this.dataListeners.forEach(cb => cb(rawData, parsedData));
  }

  // Update store telemetry based on incoming data
  updateSensorStore(data) {
    const sensors = store.get('sensors') || {};
    
    // Update individual values dynamically
    if (data.t !== undefined || data.temperature !== undefined) {
      const tempVal = data.t !== undefined ? data.t : data.temperature;
      if (!sensors.temperature) sensors.temperature = { value: 0, unit: '°C', history: [] };
      sensors.temperature.value = tempVal;
      sensors.temperature.history.push(tempVal);
      if (sensors.temperature.history.length > 50) sensors.temperature.history.shift();
    }
    if (data.h !== undefined || data.humidity !== undefined) {
      const humVal = data.h !== undefined ? data.h : data.humidity;
      if (!sensors.humidity) sensors.humidity = { value: 0, unit: '%', history: [] };
      sensors.humidity.value = humVal;
      sensors.humidity.history.push(humVal);
      if (sensors.humidity.history.length > 50) sensors.humidity.history.shift();
    }
    if (data.g !== undefined || data.gas !== undefined) {
      const gasVal = data.g !== undefined ? data.g : data.gas;
      if (!sensors.gas) sensors.gas = { value: 0, unit: 'ppm', history: [] };
      sensors.gas.value = gasVal;
      sensors.gas.history.push(gasVal);
      if (sensors.gas.history.length > 50) sensors.gas.history.shift();
    }
    if (data.s !== undefined || data.smoke !== undefined) {
      const smokeVal = data.s !== undefined ? data.s : data.smoke;
      if (!sensors.smoke) sensors.smoke = { value: 0, unit: 'ppm', history: [] };
      sensors.smoke.value = smokeVal;
      sensors.smoke.history.push(smokeVal);
      if (sensors.smoke.history.length > 50) sensors.smoke.history.shift();
    }

    store.set('sensors', { ...sensors });
    
    // Push alerts for threshold violations
    if (sensors.temperature && sensors.temperature.value > 35) {
      store.pushNotification('sensor', 'High Temperature Alert', `Temperature is critically high at ${sensors.temperature.value}°C`);
    }
    if (sensors.gas && sensors.gas.value > 300) {
      store.pushNotification('sensor', 'Gas Leak Detected', `Gas sensor value exceeded safe limit: ${sensors.gas.value} ppm`);
    }
  }

  // Update system status in store
  updateState(status, type = this.connectionType, deviceName = this.connectedDeviceName) {
    this.connectionStatus = status;
    this.connectionType = type;
    this.connectedDeviceName = deviceName;

    store.set('connection', {
      type,
      status,
      device: deviceName,
      logs: this.logs
    });
  }

  // ==========================================
  // BLUETOOTH CLASSIC (HC-05) MANAGEMENT
  // ==========================================

  // Scan Bluetooth Classic paired/unpaired devices
  async scanBluetooth() {
    this.addLog('Bluetooth', 'Scanning for Classic Bluetooth devices...');
    
    if (window.cordova && window.bluetoothSerial) {
      return new Promise((resolve) => {
        // List paired devices
        window.bluetoothSerial.list((pairedList) => {
          this.addLog('Bluetooth', `Found ${pairedList.length} paired devices.`);
          
          // Discover unpaired devices
          window.bluetoothSerial.discoverUnpaired((unpairedList) => {
            const allDevices = [...pairedList.map(d => ({ ...d, paired: true })), ...unpairedList.map(d => ({ ...d, paired: false }))];
            resolve(allDevices);
          }, (err) => {
            this.addLog('Bluetooth Warning', `Unpaired scan failed: ${err}. Returning paired list.`);
            resolve(pairedList.map(d => ({ ...d, paired: true })));
          });
        }, (err) => {
          this.addLog('Bluetooth Error', `Scanning failed: ${err}`);
          showToast('Bluetooth scan failed', 'error');
          resolve([]);
        });
      });
    } else {
      // Not on native platform — no mock data, return empty
      this.addLog('Bluetooth', 'Bluetooth is not available on this platform.');
      showToast('Bluetooth requires a native device (Android)', 'warning');
      return [];
    }
  }

  // Connect to Bluetooth device
  connectBluetooth(macAddress, name) {
    this.addLog('Bluetooth', `Connecting to ${name} (${macAddress})...`);
    this.updateState('connecting', 'bluetooth', name);
    this.bluetoothConfig = { address: macAddress, name };

    if (window.cordova && window.bluetoothSerial) {
      window.bluetoothSerial.connect(macAddress, () => {
        this.addLog('Bluetooth', `Successfully connected to ${name}!`);
        this.updateState('connected', 'bluetooth', name);
        showToast(`Connected to ${name}`, 'success');

        // Save device to store
        store.addDevice({
          id: macAddress,
          name: name,
          type: 'bluetooth',
          connection: 'bluetooth',
          lastSeen: Date.now()
        });

        // Subscribe to incoming serial data (by newlines)
        window.bluetoothSerial.subscribe('\n', (data) => {
          this.triggerDataReceived(data.trim());
        }, (err) => {
          this.addLog('Bluetooth Error', `Subscription lost: ${err}`);
        });

      }, (err) => {
        this.addLog('Bluetooth Error', `Failed to connect: ${err}`);
        this.updateState('disconnected', 'none', '');
        showToast(`Connection failed to ${name}`, 'error');
      });
    } else {
      this.addLog('Bluetooth', 'Bluetooth not available on this platform.');
      this.updateState('disconnected', 'none', '');
      showToast('Bluetooth requires a native device', 'error');
    }
  }

  // ==========================================
  // WIFI (HTTP & WEBSOCKETS) MANAGEMENT
  // ==========================================

  // Connect/Ping WiFi Web Server or WebSockets
  connectWiFi(ip, port = '80', useWebSockets = false) {
    const protocol = useWebSockets ? 'ws' : 'http';
    this.wifiConfig = { ip, port, protocol, socket: null };
    
    this.addLog('WiFi', `Connecting to ESP32 via ${protocol.toUpperCase()} at ${ip}:${port}...`);
    this.updateState('connecting', 'wifi', `ESP32 (${ip})`);

    if (useWebSockets) {
      try {
        const wsUrl = `ws://${ip}:${port}`;
        const socket = new WebSocket(wsUrl);
        this.wifiConfig.socket = socket;

        socket.onopen = () => {
          this.addLog('WiFi WS', `WebSocket Connection opened to ${wsUrl}`);
          this.updateState('connected', 'wifi', `ESP32-WS (${ip})`);
          showToast(`Connected to ESP32 WebSocket`, 'success');

          // Save device
          store.addDevice({
            id: `ws_${ip}_${port}`,
            name: `ESP32-WS (${ip})`,
            type: 'esp32',
            connection: 'wifi',
            lastSeen: Date.now()
          });
        };

        socket.onmessage = (event) => {
          this.triggerDataReceived(event.data);
        };

        socket.onerror = () => {
          this.addLog('WiFi WS Error', 'WebSocket encountered an error.');
          this.updateState('disconnected', 'none', '');
          showToast('WebSocket connection failed', 'error');
        };

        socket.onclose = () => {
          this.addLog('WiFi WS', 'WebSocket Connection closed.');
          this.updateState('disconnected', 'none', '');
        };
      } catch (err) {
        this.addLog('WiFi WS Error', err.message);
        this.updateState('disconnected', 'none', '');
        showToast('WebSocket connection failed', 'error');
      }
    } else {
      // HTTP GET ping check
      const pingUrl = `http://${ip}:${port}/ping`;
      this.addLog('WiFi HTTP', `Pinging ${pingUrl}...`);
      
      fetch(pingUrl, { mode: 'no-cors', signal: AbortSignal.timeout(5000) })
        .then(() => {
          this.addLog('WiFi HTTP', `ESP32 responded at ${ip}:${port}`);
          this.updateState('connected', 'wifi', `ESP32-HTTP (${ip})`);
          showToast(`Connected to ESP32 Server`, 'success');

          // Save device
          store.addDevice({
            id: `http_${ip}_${port}`,
            name: `ESP32-HTTP (${ip})`,
            type: 'esp32',
            connection: 'wifi',
            lastSeen: Date.now()
          });
        })
        .catch((err) => {
          this.addLog('WiFi HTTP Error', `Connection failed: ${err.message}`);
          this.updateState('disconnected', 'none', '');
          showToast('Could not reach ESP32. Check IP and ensure device is on.', 'error');
        });
    }
  }

  // ==========================================
  // MQTT CONNECTIONS MANAGEMENT
  // ==========================================

  connectMQTT(broker, port = '8000', topic = 'genapp/iot') {
    this.mqttConfig = { broker, port, topic, client: null };
    
    // Connect over WebSockets (ws://broker:port/mqtt)
    const brokerUrl = `ws://${broker}:${port}/mqtt`;
    this.addLog('MQTT', `Connecting to MQTT Broker at ${brokerUrl}...`);
    this.updateState('connecting', 'mqtt', `MQTT: ${broker}`);

    try {
      const client = mqtt.connect(brokerUrl, {
        connectTimeout: 5000,
        clientId: 'genapp_' + Math.random().toString(16).substring(2, 8),
        keepalive: 60,
      });

      this.mqttConfig.client = client;

      client.on('connect', () => {
        this.addLog('MQTT', `Connected to Broker! Subscribing to: ${topic}`);
        this.updateState('connected', 'mqtt', `MQTT: ${broker}`);
        showToast('Connected to MQTT Broker', 'success');
        client.subscribe(topic);

        // Save device
        store.addDevice({
          id: `mqtt_${broker}_${topic}`,
          name: `MQTT: ${broker}`,
          type: 'mqtt',
          connection: 'mqtt',
          lastSeen: Date.now()
        });
      });

      client.on('message', (receivedTopic, message) => {
        const rawStr = message.toString();
        this.addLog(`MQTT In [${receivedTopic}]`, rawStr);
        this.triggerDataReceived(rawStr);
      });

      client.on('error', (err) => {
        this.addLog('MQTT Error', err.message);
        this.updateState('disconnected', 'none', '');
        showToast('MQTT Connection Error', 'error');
        client.end();
      });

      client.on('close', () => {
        this.addLog('MQTT', 'MQTT connection closed.');
        this.updateState('disconnected', 'none', '');
      });
    } catch (err) {
      this.addLog('MQTT Connection Error', err.message);
      this.updateState('disconnected', 'none', '');
    }
  }

  // Disconnect active connection
  disconnect() {
    this.addLog('System', `Disconnecting active ${this.connectionType.toUpperCase()} connection...`);
    
    // 1. Bluetooth
    if (this.connectionType === 'bluetooth' && window.cordova && window.bluetoothSerial) {
      window.bluetoothSerial.disconnect();
    }

    // 2. WiFi WebSocket
    if (this.wifiConfig.socket) {
      this.wifiConfig.socket.close();
      this.wifiConfig.socket = null;
    }

    // 3. MQTT
    if (this.mqttConfig.client) {
      this.mqttConfig.client.end();
      this.mqttConfig.client = null;
    }

    this.addLog('System', 'Disconnected from device.');
    this.updateState('disconnected', 'none', '');
    showToast('Device disconnected', 'info');
  }

  // ==========================================
  // SEND COMMANDS (TRANSMISSION BRIDGE)
  // ==========================================

  // Broadcast command to whichever connection is active
  send(command) {
    if (this.connectionStatus !== 'connected') {
      console.log(`[Connectivity (OFFLINE)] Command suppressed: ${command}`);
      return;
    }

    const commandStr = command + '\n';
    this.addLog('Transmission Out', command);

    switch (this.connectionType) {
      case 'bluetooth':
        if (window.cordova && window.bluetoothSerial) {
          window.bluetoothSerial.write(commandStr, () => {
            // Write success
          }, (err) => {
            this.addLog('Bluetooth Send Error', err);
          });
        }
        break;

      case 'wifi':
        if (this.wifiConfig.protocol === 'ws' && this.wifiConfig.socket) {
          this.wifiConfig.socket.send(command);
        } else {
          // HTTP GET command mode
          const sendUrl = `http://${this.wifiConfig.ip}:${this.wifiConfig.port}/cmd?val=${encodeURIComponent(command)}`;
          fetch(sendUrl, { mode: 'no-cors' }).catch(err => {
            console.warn('HTTP Send fetched (CORS expected):', err);
          });
        }
        break;

      case 'mqtt':
        if (this.mqttConfig.client) {
          this.mqttConfig.client.publish(this.mqttConfig.topic + '/cmd', command);
        }
        break;
    }
  }
}

export const connectivity = new ConnectivityService();
