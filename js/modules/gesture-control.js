// ============================================================
// GenApp — Module 3: Gesture Control (Clean & Functional)
// ============================================================

import { showToast } from '../app.js';
import { connectivity } from '../services/connectivity.js';
import { storage } from '../services/storage.js';

let gestureActive = false;
let sensitivity = 25;
let invertX = false;
let invertY = false;

// Custom command mapping configs
let commandMap = {
  forward: 'F',
  backward: 'B',
  left: 'L',
  right: 'R',
  stop: 'S'
};

export function renderGestureControl(container) {
  // Load custom commands from local storage if existing
  storage.get('genapp-gesture-map').then(saved => {
    if (saved) {
      try { commandMap = { ...commandMap, ...JSON.parse(saved) }; } catch {}
    }
  });

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  container.innerHTML = `
    <div class="gesture-control-page page-enter">
      <div class="page-header">
        <h1 class="page-title">Tilt & Gesture Drive</h1>
        <p class="page-subtitle">Map and trigger device commands dynamically using your mobile accelerometer sensors</p>
      </div>

      <div class="control-page" style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: var(--space-6); margin-top: var(--space-4);">
        <div class="control-main">
          <!-- Gesture Visualizer & Warning Banner -->
          <div class="card" style="padding: var(--space-6); text-align: center;">
            
            ${!isMobile ? `
              <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid var(--color-warning); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-6); text-align: left; display: flex; gap: 12px; align-items: flex-start;">
                <span style="font-size: 20px;">⚠️</span>
                <div>
                  <div style="font-weight: 700; color: var(--color-warning); font-size: var(--text-sm);">Desktop Environment Detected</div>
                  <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px;">
                    Tilt gestures require real physical device orientations. Load this app on a mobile device running iOS/Android to enable accelerometer telemetry.
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- 3D Phone Gyro Visualizer -->
            <div class="gesture-visualizer" id="gesture-viz" style="position: relative; height: 260px; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; overflow: hidden;">
              <div class="gesture-direction-indicators" style="position: absolute; top:0; left:0; right:0; bottom:0; pointer-events: none;">
                <!-- Arrows -->
                <div class="gesture-arrow up" id="arrow-up" style="position:absolute; top:20px; left:50%; transform:translateX(-50%); opacity:0.15; transition: opacity 0.2s;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 32px; height: 32px; color: var(--color-primary);"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                </div>
                <div class="gesture-arrow down" id="arrow-down" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); opacity:0.15; transition: opacity 0.2s;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 32px; height: 32px; color: var(--color-primary); transform:rotate(180deg);"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                </div>
                <div class="gesture-arrow left" id="arrow-left" style="position:absolute; left:20px; top:50%; transform:translateY(-50%); opacity:0.15; transition: opacity 0.2s;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 32px; height: 32px; color: var(--color-secondary); transform:rotate(-90deg);"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                </div>
                <div class="gesture-arrow right" id="arrow-right" style="position:absolute; right:20px; top:50%; transform:translateY(-50%); opacity:0.15; transition: opacity 0.2s;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 32px; height: 32px; color: var(--color-secondary); transform:rotate(90deg);"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                </div>
              </div>

              <!-- 3D Card Phone Representer -->
              <div id="gesture-phone" style="width: 80px; height: 150px; background: linear-gradient(135deg, var(--bg-surface-hover), var(--bg-elevated)); border: 2px solid rgba(255,255,255,0.2); border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); transform-style: preserve-3d; transform: rotateX(0deg) rotateY(0deg); transition: transform 0.1s ease-out; display:flex; flex-direction:column; justify-content:space-between; align-items:center; padding:10px 0;">
                <div style="width:30px; height:4px; background:rgba(255,255,255,0.2); border-radius:2px;"></div>
                <div style="font-size:24px;">🤚</div>
                <div style="width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,0.2);"></div>
              </div>
            </div>

            <div style="margin-top: var(--space-6);">
              <button class="btn ${gestureActive ? 'btn-danger' : 'btn-primary'} btn-lg" id="gesture-toggle" ${!isMobile ? 'disabled' : ''} style="min-width: 200px;">
                ${gestureActive ? '🛑 Deactivate Tilt Engine' : '🤚 Calibrate & Start'}
              </button>
            </div>

            <div style="margin-top: var(--space-3);">
              <span class="chip" id="gesture-status" style="background: ${gestureActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)'}; color: ${gestureActive ? 'var(--color-accent)' : 'var(--text-muted)'}; border: 1px solid ${gestureActive ? 'var(--color-accent)' : 'transparent'};">
                ${gestureActive ? '● GYRO ACTIVE' : '○ ENGINE IDLE'}
              </span>
            </div>
          </div>

          <!-- Gyroscope & Accelerometer Readings -->
          <div class="card">
            <div class="card-header"><span class="card-title">Real-time IMU Readings</span></div>
            <div class="telemetry-panel" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: var(--space-3);">
              <div class="telemetry-item" style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: var(--text-xs); color: var(--text-muted);">Tilt X (β)</div>
                <div style="font-size: var(--text-lg); font-weight:700; color:var(--color-primary); margin-top:4px;" id="tilt-x">--</div>
              </div>
              <div class="telemetry-item" style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: var(--text-xs); color: var(--text-muted);">Tilt Y (γ)</div>
                <div style="font-size: var(--text-lg); font-weight:700; color:var(--color-secondary); margin-top:4px;" id="tilt-y">--</div>
              </div>
              <div class="telemetry-item" style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: var(--text-xs); color: var(--text-muted);">Orientation</div>
                <div style="font-size: var(--text-base); font-weight:700; color:var(--color-accent); margin-top:4px;" id="tilt-heading">--</div>
              </div>
              <div class="telemetry-item" style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: var(--text-xs); color: var(--text-muted);">Link Target</div>
                <div style="font-size: var(--text-base); font-weight:700; color:var(--text-primary); margin-top:4px;" id="tilt-target">${connectivity.connectionStatus === 'connected' ? 'ONLINE' : 'OFFLINE'}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="control-sidebar" style="display:flex; flex-direction:column; gap: var(--space-5);">
          <!-- Settings -->
          <div class="card">
            <div class="card-header"><span class="card-title">Sensing Variables</span></div>
            <div class="input-group" style="margin-bottom: var(--space-4); margin-top: var(--space-2);">
              <label class="input-label" style="display:flex; justify-content:space-between;">Threshold: <span id="sens-val" style="font-weight:bold; color:var(--color-primary);">${sensitivity}°</span></label>
              <input type="range" min="10" max="60" value="${sensitivity}" class="speed-slider" id="sensitivity-slider" style="width:100%; cursor:pointer;" />
              <span style="font-size:10px; color:var(--text-tertiary); display:block; margin-top:2px;">Degrees of physical tilt required to invoke commands.</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--space-3);">
              <span class="input-label" style="font-size: var(--text-sm);">Invert Front / Back Axis</span>
              <label class="toggle-switch" style="position:relative; display:inline-block; width:36px; height:20px;"><input type="checkbox" id="invert-x" ${invertX ? 'checked' : ''} style="opacity:0; width:0; height:0;"><span style="position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(255,255,255,0.1); border-radius:34px; transition:0.2s;" class="toggle-track"></span></label>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="input-label" style="font-size: var(--text-sm);">Invert Left / Right Axis</span>
              <label class="toggle-switch" style="position:relative; display:inline-block; width:36px; height:20px;"><input type="checkbox" id="invert-y" ${invertY ? 'checked' : ''} style="opacity:0; width:0; height:0;"><span style="position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(255,255,255,0.1); border-radius:34px; transition:0.2s;" class="toggle-track"></span></label>
            </div>
          </div>

          <!-- Customizable Command Map -->
          <div class="card">
            <div class="card-header"><span class="card-title">Tilt Mappings</span></div>
            <div style="font-size: var(--text-sm); display:flex; flex-direction:column; gap: 8px; margin-top: var(--space-2);">
              <div class="flex items-center justify-between" style="display:flex; align-items:center; justify-content:space-between;">
                <span style="font-size:var(--text-xs);"><span style="color:var(--color-primary)">↑</span> Forward Tilt</span>
                <input class="input-field" type="text" id="map-fwd" value="${commandMap.forward}" style="width:60px; text-align:center; padding:4px;" />
              </div>
              <div class="flex items-center justify-between" style="display:flex; align-items:center; justify-content:space-between;">
                <span style="font-size:var(--text-xs);"><span style="color:var(--color-primary)">↓</span> Backward Tilt</span>
                <input class="input-field" type="text" id="map-bwd" value="${commandMap.backward}" style="width:60px; text-align:center; padding:4px;" />
              </div>
              <div class="flex items-center justify-between" style="display:flex; align-items:center; justify-content:space-between;">
                <span style="font-size:var(--text-xs);"><span style="color:var(--color-secondary)">←</span> Left Tilt</span>
                <input class="input-field" type="text" id="map-lft" value="${commandMap.left}" style="width:60px; text-align:center; padding:4px;" />
              </div>
              <div class="flex items-center justify-between" style="display:flex; align-items:center; justify-content:space-between;">
                <span style="font-size:var(--text-xs);"><span style="color:var(--color-secondary)">→</span> Right Tilt</span>
                <input class="input-field" type="text" id="map-rgt" value="${commandMap.right}" style="width:60px; text-align:center; padding:4px;" />
              </div>
              <div class="flex items-center justify-between" style="display:flex; align-items:center; justify-content:space-between;">
                <span style="font-size:var(--text-xs);"><span style="color:var(--color-accent)">○</span> Level / Stop</span>
                <input class="input-field" type="text" id="map-stp" value="${commandMap.stop}" style="width:60px; text-align:center; padding:4px;" />
              </div>
              <button class="btn btn-secondary btn-sm" id="save-map-btn" style="width:100%; margin-top:4px;">💾 Update Map</button>
            </div>
          </div>

          <!-- Dynamic Output Command Display -->
          <div class="card" style="text-align:center;">
            <div class="card-header" style="margin-bottom: var(--space-2);"><span class="card-title">COMMAND OUTPUT</span></div>
            <div style="font-family: var(--font-display); font-size: var(--text-2xl); font-weight: bold; color: var(--color-primary);" id="gesture-command">STOP</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach Toggle Styles Hook
  const registerTrackStyles = (checkboxId) => {
    const box = container.querySelector(checkboxId);
    if (box) {
      const track = box.nextElementSibling;
      box.addEventListener('change', () => {
        track.style.backgroundColor = box.checked ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.1)';
      });
      track.style.backgroundColor = box.checked ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.1)';
    }
  };
  registerTrackStyles('#invert-x');
  registerTrackStyles('#invert-y');

  setupGestureEvents(container);
}

function setupGestureEvents(container) {
  const toggleBtn = document.getElementById('gesture-toggle');
  const sensSlider = document.getElementById('sensitivity-slider');

  if (sensSlider) {
    sensSlider.addEventListener('input', (e) => {
      sensitivity = parseInt(e.target.value);
      const val = document.getElementById('sens-val');
      if (val) val.textContent = sensitivity + '°';
    });
  }

  // Handle axes inversion switches
  const invXBox = document.getElementById('invert-x');
  if (invXBox) {
    invXBox.addEventListener('change', () => {
      invertX = invXBox.checked;
    });
  }
  const invYBox = document.getElementById('invert-y');
  if (invYBox) {
    invYBox.addEventListener('change', () => {
      invertY = invYBox.checked;
    });
  }

  // Custom mapping saves
  document.getElementById('save-map-btn')?.addEventListener('click', () => {
    commandMap.forward = document.getElementById('map-fwd').value.trim();
    commandMap.backward = document.getElementById('map-bwd').value.trim();
    commandMap.left = document.getElementById('map-lft').value.trim();
    commandMap.right = document.getElementById('map-rgt').value.trim();
    commandMap.stop = document.getElementById('map-stp').value.trim();

    storage.set('genapp-gesture-map', JSON.stringify(commandMap));
    showToast('💾 Custom tilt command maps saved', 'success');
  });

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      gestureActive = !gestureActive;
      toggleBtn.className = `btn ${gestureActive ? 'btn-danger' : 'btn-primary'} btn-lg`;
      toggleBtn.innerHTML = gestureActive ? '🛑 Deactivate Tilt Engine' : '🤚 Calibrate & Start';
      
      const status = document.getElementById('gesture-status');
      if (status) {
        status.style.background = gestureActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)';
        status.style.borderColor = gestureActive ? 'var(--color-accent)' : 'transparent';
        status.style.color = gestureActive ? 'var(--color-accent)' : 'var(--text-muted)';
        status.textContent = gestureActive ? '● GYRO ACTIVE' : '○ ENGINE IDLE';
      }

      if (gestureActive) {
        startGestureSensing();
        showToast('🤚 Accelerometer capture started', 'success');
      } else {
        stopGestureSensing();
        showToast('Capture stopped', 'info');
      }
    });
  }
}

let deviceOrientationHandler = null;
let lastSentCommand = '';

function startGestureSensing() {
  if (window.DeviceOrientationEvent) {
    // Request permission for orientation sensors on iOS 13+
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            bindOrientationCapture();
          } else {
            gestureActive = false;
            resetGestureUI();
            showToast('Sensor access permission denied', 'error');
          }
        })
        .catch(err => {
          console.error(err);
          showToast('Failed to acquire motion permissions', 'error');
        });
    } else {
      // Standard binding
      bindOrientationCapture();
    }
  } else {
    showToast('Accelerometer orientation not supported on this device', 'error');
  }
}

function bindOrientationCapture() {
  deviceOrientationHandler = (e) => {
    if (!gestureActive) return;
    
    // beta: front/back tilt (range [-180, 180])
    // gamma: left/right tilt (range [-90, 90])
    let beta = e.beta || 0;
    let gamma = e.gamma || 0;

    if (invertX) beta = -beta;
    if (invertY) gamma = -gamma;

    updateGestureUI(beta, gamma);
  };
  window.addEventListener('deviceorientation', deviceOrientationHandler);
}

function stopGestureSensing() {
  if (deviceOrientationHandler) {
    window.removeEventListener('deviceorientation', deviceOrientationHandler);
    deviceOrientationHandler = null;
  }
  resetGestureUI();
}

function updateGestureUI(beta, gamma) {
  const phone = document.getElementById('gesture-phone');
  const tiltX = document.getElementById('tilt-x');
  const tiltY = document.getElementById('tilt-y');
  const cmdEl = document.getElementById('gesture-command');
  const headingEl = document.getElementById('tilt-heading');

  if (phone) {
    // Limit visually to 35 degrees max visual rotation representation
    const rotX = Math.max(-35, Math.min(35, beta));
    const rotY = Math.max(-35, Math.min(35, gamma));
    phone.style.transform = `rotateX(${rotX * 0.8}deg) rotateY(${rotY * 0.8}deg)`;
  }

  if (tiltX) tiltX.textContent = Math.round(beta) + '°';
  if (tiltY) tiltY.textContent = Math.round(gamma) + '°';

  const arrows = {
    up: document.getElementById('arrow-up'),
    down: document.getElementById('arrow-down'),
    left: document.getElementById('arrow-left'),
    right: document.getElementById('arrow-right')
  };

  Object.values(arrows).forEach(a => { if (a) a.style.opacity = '0.15'; });

  let command = commandMap.stop || 'S';
  let heading = 'LEVEL';

  // Determine tilt direction priorities
  if (beta < -sensitivity) {
    command = commandMap.forward || 'F';
    heading = 'FORWARD';
    if (arrows.up) arrows.up.style.opacity = '1';
  } else if (beta > sensitivity) {
    command = commandMap.backward || 'B';
    heading = 'REVERSE';
    if (arrows.down) arrows.down.style.opacity = '1';
  }

  if (gamma < -sensitivity) {
    command = command === (commandMap.stop || 'S') ? (commandMap.left || 'L') : command;
    heading = heading === 'LEVEL' ? 'LEFT' : heading + '-LEFT';
    if (arrows.left) arrows.left.style.opacity = '1';
  } else if (gamma > sensitivity) {
    command = command === (commandMap.stop || 'S') ? (commandMap.right || 'R') : command;
    heading = heading === 'LEVEL' ? 'RIGHT' : heading + '-RIGHT';
    if (arrows.right) arrows.right.style.opacity = '1';
  }

  if (cmdEl) cmdEl.textContent = command;
  if (headingEl) headingEl.textContent = heading;

  // Real-time dispatch telemetry output changes
  if (command !== lastSentCommand) {
    lastSentCommand = command;
    connectivity.send(command);
  }
}

function resetGestureUI() {
  const phone = document.getElementById('gesture-phone');
  if (phone) {
    phone.style.transform = 'rotateX(0deg) rotateY(0deg)';
  }
  const arrows = {
    up: document.getElementById('arrow-up'),
    down: document.getElementById('arrow-down'),
    left: document.getElementById('arrow-left'),
    right: document.getElementById('arrow-right')
  };
  Object.values(arrows).forEach(a => { if (a) a.style.opacity = '0.15'; });

  const cmdEl = document.getElementById('gesture-command');
  if (cmdEl) cmdEl.textContent = commandMap.stop || 'S';
  const headingEl = document.getElementById('tilt-heading');
  if (headingEl) headingEl.textContent = '--';
  const tiltX = document.getElementById('tilt-x');
  if (tiltX) tiltX.textContent = '--';
  const tiltY = document.getElementById('tilt-y');
  if (tiltY) tiltY.textContent = '--';
  
  if (lastSentCommand !== (commandMap.stop || 'S')) {
    lastSentCommand = commandMap.stop || 'S';
    connectivity.send(lastSentCommand);
  }
}
