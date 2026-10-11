const APP_VERSION = '1.6';
const WATCHDOG_TIMEOUT_MS = 60000;
let watchdogTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  const statusElem = document.getElementById('status');
  const dotElem = document.getElementById('status-dot');
  const timeElem = document.getElementById('last-time');
  const versionElem = document.getElementById('app-version');
  const titleElem = document.getElementById('dashboard-title');

  // Ustawienie wersji w stopce
  if (versionElem) {
    versionElem.innerText = 'v' + APP_VERSION;
  }

  // Ustawienie tytułu panelu i zakładki z config.js
  if (MQTT_CONFIG.dashboardTitle) {
    if (titleElem) titleElem.innerText = MQTT_CONFIG.dashboardTitle;
    document.title = MQTT_CONFIG.dashboardTitle;
  }

  // Wczytanie zdefiniowanych nazw i jednostek z pliku konfiguracyjnego
  if (MQTT_CONFIG.sensors) {
    for (let i = 1; i <= 10; i++) {
      const key = 's' + i;
      const sensorCfg = MQTT_CONFIG.sensors[key];
      if (sensorCfg) {
        const nameElem = document.getElementById('name-' + key);
        const unitElem = document.getElementById('unit-' + key);
        if (nameElem && sensorCfg.name) nameElem.innerText = sensorCfg.name;
        if (unitElem && sensorCfg.unit) unitElem.innerText = sensorCfg.unit;
      }
    }
  }

  function setStatus(text, color) {
    if (statusElem) statusElem.innerText = text;
    if (dotElem) {
      dotElem.style.backgroundColor = color;
      dotElem.style.color = color;
    }
  }

  const options = {
    clientId: 'web_' + Math.random().toString(16).substring(2, 8),
    username: MQTT_CONFIG.username,
    password: MQTT_CONFIG.password,
    clean: true,
    connectTimeout: 5000
  };

  const client = mqtt.connect(MQTT_CONFIG.host, options);

  function resetWatchdog() {
    if (watchdogTimer) clearTimeout(watchdogTimer);
    watchdogTimer = setTimeout(() => {
      setStatus('Brak danych (timeout)', '#f59e0b');
    }, WATCHDOG_TIMEOUT_MS);
  }

  client.on('connect', () => {
    setStatus('Połączono (Oczekiwanie)', '#38bdf8');
    client.subscribe(MQTT_CONFIG.topic);
  });

  client.on('reconnect', () => {
    setStatus('Ponawianie połączenia...', '#f59e0b');
  });

  client.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());

      for (let i = 1; i <= 10; i++) {
        const key = 's' + i;
        const valElem = document.getElementById(key);
        const cardElem = document.getElementById('card-' + key);

        if (valElem && data[key] !== undefined) {
          valElem.innerText = data[key];

          if (cardElem) {
            cardElem.classList.add('flash');
            setTimeout(() => cardElem.classList.remove('flash'), 300);
          }
        }
      }

      if (timeElem) {
        timeElem.innerText = new Date().toLocaleTimeString('pl-PL');
      }

      setStatus('Aktywne (Dane na żywo)', '#10b981');
      resetWatchdog();
    } catch (err) {
      console.warn('Otrzymano nieprawidłowy format JSON:', message.toString());
    }
  });

  client.on('error', (err) => {
    setStatus('Błąd połączenia', '#ef4444');
  });

  client.on('close', () => {
    setStatus('Rozłączono', '#64748b');
  });
});
