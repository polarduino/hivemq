// Numer wersji aplikacji
const APP_VERSION = '2.0-lic';

// Pamięć podręczna w przeglądarce
const STORAGE_KEY = 'mqtt_dashboard_license_data';

// Limit czasu (w ms), po którym stan czujników zostanie uznany za nieaktualny
const WATCHDOG_TIMEOUT_MS = 60000;
let watchdogTimer = null;

// Pamięć poprzednich stanów alarmowych dla powiadomień głosowych
const sensorAlertStates = {};
let isVoiceEnabled = false;

// Aktywna, odszyfrowana konfiguracja oraz klient MQTT
let ACTIVE_CONFIG = null;
let mqttClient = null;

// Wybrany plik w modalnym oknie
let selectedLicenseText = null;

document.addEventListener('DOMContentLoaded', () => {
  const versionElem = document.getElementById('app-version');
  const voiceBtn = document.getElementById('voice-toggle-btn');
  const voiceIcon = document.getElementById('voice-icon');
  const voiceText = document.getElementById('voice-text');
  const switchLicenseBtn = document.getElementById('license-switch-btn');

  const modal = document.getElementById('license-modal');
  const fileInput = document.getElementById('file-input');
  const dropzone = document.getElementById('dropzone');
  const dropzoneLabel = document.getElementById('dropzone-label');
  const passInput = document.getElementById('password-input');
  const rememberCheckbox = document.getElementById('remember-checkbox');
  const unlockBtn = document.getElementById('btn-unlock');
  const errorMsg = document.getElementById('modal-error-msg');

  if (versionElem) versionElem.innerText = 'v' + APP_VERSION;

  // 1. Obsługa dźwięku
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      isVoiceEnabled = !isVoiceEnabled;
      if (isVoiceEnabled) {
        voiceIcon.innerText = '🔊';
        voiceText.innerText = 'Dźwięk: Włączony';
        speakAlert('Komunikaty głosowe włączone.');
      } else {
        voiceIcon.innerText = '🔇';
        voiceText.innerText = 'Dźwięk: Wyłączony';
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      }
    });
  }

  // 2. Przycisk zmiany licencji / wylogowania
  if (switchLicenseBtn) {
    switchLicenseBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      if (mqttClient) mqttClient.end(true);
      location.reload();
    });
  }

  // 3. Obsługa przeciągania pliku .lic (Drag & Drop)
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });
    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) handleFileSelection(files[0]);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFileSelection(e.target.files[0]);
    });
  }

  function handleFileSelection(file) {
    if (!file.name.endsWith('.lic')) {
      showError('Wybierz poprawny plik licencji z rozszerzeniem .lic');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      selectedLicenseText = e.target.result;
      dropzoneLabel.innerText = '✔ ' + file.name;
      errorMsg.innerText = '';
    };
    reader.readAsText(file);
  }

  // 4. Kliknięcie odblokowania
  if (unlockBtn) {
    unlockBtn.addEventListener('click', async () => {
      if (!selectedLicenseText) {
        showError('Wybierz najpierw plik licencji (.lic)!');
        return;
      }
      const pass = passInput.value;
      if (!pass) {
        showError('Wpisz hasło deszyfrujące.');
        return;
      }

      unlockBtn.disabled = true;
      unlockBtn.innerText = 'Deszyfrowanie...';
      errorMsg.innerText = '';

      try {
        const config = await decryptLicenseData(selectedLicenseText, pass);
        
        // Zapis do localStorage, jeśli zaznaczono checkbox
        if (rememberCheckbox.checked) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        }

        modal.style.display = 'none';
        initDashboard(config);
      } catch (err) {
        console.error(err);
        showError('Błąd: Nieprawidłowe hasło lub uszkodzony plik.');
      } finally {
        unlockBtn.disabled = false;
        unlockBtn.innerText = '🔓 Odszyfruj i uruchom';
      }
    });
  }

  // Obsługa klawisza Enter w polu hasła
  passInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') unlockBtn.click();
  });

  function showError(msg) {
    errorMsg.innerText = msg;
  }

  // 5. Autologowanie, jeśli licencja jest już zapamiętana
  const savedConfigStr = localStorage.getItem(STORAGE_KEY);
  if (savedConfigStr) {
    try {
      const savedConfig = JSON.parse(savedConfigStr);
      modal.style.display = 'none';
      initDashboard(savedConfig);
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
});

// Deszyfracja strumienia AES-256-GCM z użyciem Web Crypto API
async function decryptLicenseData(base64Payload, password) {
  const cleanStr = base64Payload.trim();
  const binary = atob(cleanStr);
  const len = binary.length;
  const combined = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    combined[i] = binary.charCodeAt(i);
  }

  if (combined.byteLength < 29) {
    throw new Error('Za krótki plik.');
  }

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decryptedBuffer));
}

// Inicjalizacja widoku i połączenia MQTT po udanej deszyfracji
function initDashboard(config) {
  ACTIVE_CONFIG = config;

  // Ustawienie tytułu strony
  const titleElem = document.getElementById('dashboard-title');
  if (config.dashboardTitle) {
    if (titleElem) titleElem.innerText = config.dashboardTitle;
    document.title = config.dashboardTitle;
  }

  // Dynamiczne zbudowanie siatki kafelków (1 do 32)
  buildSensorsGrid(config.sensors);

  // Uruchomienie połączenia MQTT
  startMqttClient(config);
}

// Dynamiczne generowanie kart czujników w siatce
function buildSensorsGrid(sensorsObj) {
  const grid = document.getElementById('sensors-grid');
  if (!grid || !sensorsObj) return;
  grid.innerHTML = '';

  Object.keys(sensorsObj).forEach(key => {
    sensorAlertStates[key] = 'normal';
    const cfg = sensorsObj[key];

    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'card-' + key;

    card.innerHTML = `
      <h3 id="name-${key}" title="${escapeHtml(cfg.name || key)}">${escapeHtml(cfg.name || key)}</h3>
      <div class="val-wrapper">
        <span class="val-box" id="${key}">--</span>
        <span class="unit" id="unit-${key}">${escapeHtml(cfg.unit || '')}</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function speakAlert(text) {
  if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pl-PL';
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
}

function evaluateSensorThresholds(key, rawValue) {
  const cardElem = document.getElementById('card-' + key);
  const cfg = ACTIVE_CONFIG.sensors ? ACTIVE_CONFIG.sensors[key] : null;
  if (!cardElem || !cfg) return;

  const numVal = parseFloat(rawValue);
  if (isNaN(numVal)) return;

  let currentState = 'normal';

  // 1. Sprawdzenie progu II (czerwony / alarm)
  const isAlarmMax = cfg.alarmMax != null && numVal >= cfg.alarmMax;
  const isAlarmMin = cfg.alarmMin != null && numVal <= cfg.alarmMin;

  // 2. Sprawdzenie progu I (żółty / ostrzeżenie)
  const isWarnMax = cfg.warnMax != null && numVal >= cfg.warnMax;
  const isWarnMin = cfg.warnMin != null && numVal <= cfg.warnMin;

  if (isAlarmMax || isAlarmMin) {
    currentState = 'alarm';
  } else if (isWarnMax || isWarnMin) {
    currentState = 'warning';
  }

  cardElem.classList.remove('status-warning', 'status-alarm');
  if (currentState === 'alarm') {
    cardElem.classList.add('status-alarm');
  } else if (currentState === 'warning') {
    cardElem.classList.add('status-warning');
  }

  const prevState = sensorAlertStates[key];
  const sensorName = cfg.name || key;
  const unit = cfg.unit ? (' ' + cfg.unit) : '';

  if (currentState === 'warning' && prevState !== 'warning' && prevState !== 'alarm') {
    speakAlert(`Uwaga! Przekroczenie progu pierwszego: ${sensorName}, wartość: ${numVal}${unit}`);
  } else if (currentState === 'alarm' && prevState !== 'alarm') {
    speakAlert(`Alarm! Przekroczenie progu drugiego: ${sensorName}, wartość: ${numVal}${unit}`);
  }

  sensorAlertStates[key] = currentState;
}

function setStatus(text, color) {
  const statusElem = document.getElementById('status');
  const dotElem = document.getElementById('status-dot');
  if (statusElem) statusElem.innerText = text;
  if (dotElem) {
    dotElem.style.backgroundColor = color;
    dotElem.style.color = color;
  }
}

function markStale() {
  document.querySelectorAll('.val-box').forEach(el => { el.style.opacity = '0.4'; });
}

function markFresh() {
  document.querySelectorAll('.val-box').forEach(el => { el.style.opacity = '1'; });
}

function archiveToGoogleSheets(data) {
  if (!ACTIVE_CONFIG || !ACTIVE_CONFIG.googleSheetUrl) return;

  fetch(ACTIVE_CONFIG.googleSheetUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(data)
  }).catch(err => {
    console.warn('Błąd wysyłania do Google Sheets:', err);
  });
}

// Uruchomienie klienta MQTT
function startMqttClient(config) {
  const timeElem = document.getElementById('last-time');

  const options = {
    clientId: 'web_' + Math.random().toString(16).substring(2, 8),
    username: config.username,
    password: config.password,
    clean: true,
    connectTimeout: 5000
  };

  setStatus('Łączenie...', '#f59e0b');
  mqttClient = mqtt.connect(config.host, options);

  function resetWatchdog() {
    if (watchdogTimer) clearTimeout(watchdogTimer);
    watchdogTimer = setTimeout(() => {
      setStatus('Brak danych (timeout)', '#f59e0b');
      markStale();
    }, WATCHDOG_TIMEOUT_MS);
  }

  function stopWatchdog() {
    if (watchdogTimer) clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }

  mqttClient.on('connect', () => {
    setStatus('Połączono (Oczekiwanie)', '#38bdf8');
    mqttClient.subscribe(config.topic);
    resetWatchdog();
  });

  mqttClient.on('reconnect', () => {
    setStatus('Ponawianie połączenia...', '#f59e0b');
  });

  mqttClient.on('message', (topic, message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (err) {
      console.warn('Nieprawidłowy JSON:', message.toString());
      return;
    }

    if (data === null || typeof data !== 'object') return;

    let updated = false;

    // Przelatujemy po wszystkich czujnikach skonfigurowanych w licencji
    if (ACTIVE_CONFIG.sensors) {
      Object.keys(ACTIVE_CONFIG.sensors).forEach(key => {
        const valElem = document.getElementById(key);
        const cardElem = document.getElementById('card-' + key);

        if (valElem && data[key] != null) {
          valElem.innerText = data[key];
          updated = true;

          if (cardElem) {
            cardElem.classList.add('flash');
            setTimeout(() => cardElem.classList.remove('flash'), 300);
          }

          evaluateSensorThresholds(key, data[key]);
        }
      });
    }

    if (!updated) return;

    if (timeElem) {
      timeElem.innerText = new Date().toLocaleTimeString('pl-PL');
    }

    markFresh();
    setStatus('Aktywne (Dane na żywo)', '#10b981');
    resetWatchdog();

    archiveToGoogleSheets(data);
  });

  mqttClient.on('error', (err) => {
    console.warn('Błąd MQTT:', err && err.message ? err.message : err);
    stopWatchdog();
    markStale();
    setStatus('Błąd połączenia', '#ef4444');
  });

  mqttClient.on('close', () => {
    stopWatchdog();
    markStale();
    setStatus('Rozłączono', '#64748b');
  });
}
