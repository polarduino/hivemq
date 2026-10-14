// Numer aktualnej wersji aplikacji – pokazywany w stopce strony
const APP_VERSION = '1.9';

// Limit czasu (w ms), po którym stan czujników zostanie uznany za nieaktualny
const WATCHDOG_TIMEOUT_MS = 60000;
let watchdogTimer = null;

// Pamięć poprzednich stanów alarmowych dla czujników (zapobiega ciągłemu powtarzaniu mowy)
// Możliwe stany: 'normal', 'warning', 'alarm'
const sensorAlertStates = {};

// Domyślnie powiadomienia głosowe wyłączone (odblokowywane przyciskiem w nagłówku)
let isVoiceEnabled = false;

document.addEventListener('DOMContentLoaded', () => {
  const statusElem = document.getElementById('status');
  const dotElem = document.getElementById('status-dot');
  const timeElem = document.getElementById('last-time');
  const versionElem = document.getElementById('app-version');
  const titleElem = document.getElementById('dashboard-title');
  const voiceBtn = document.getElementById('voice-toggle-btn');
  const voiceIcon = document.getElementById('voice-icon');
  const voiceText = document.getElementById('voice-text');

  // 1. Obsługa przycisku włączania/wyłączania mowy
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

  // 2. Wyświetlenie wersji w stopce
  if (versionElem) {
    versionElem.innerText = 'v' + APP_VERSION;
  }

  // 3. Dynamiczne ustawienie tytułu strony i karty z pliku config.js
  if (MQTT_CONFIG.dashboardTitle) {
    if (titleElem) titleElem.innerText = MQTT_CONFIG.dashboardTitle;
    document.title = MQTT_CONFIG.dashboardTitle;
  }

  // 4. Wczytanie zdefiniowanych nazw i jednostek czujników (s1..s10)
  if (MQTT_CONFIG.sensors) {
    for (let i = 1; i <= 10; i++) {
      const key = 's' + i;
      sensorAlertStates[key] = 'normal';
      const sensorCfg = MQTT_CONFIG.sensors[key];
      if (sensorCfg) {
        const nameElem = document.getElementById('name-' + key);
        const unitElem = document.getElementById('unit-' + key);
        if (nameElem && sensorCfg.name) nameElem.innerText = sensorCfg.name;
        if (unitElem && sensorCfg.unit) unitElem.innerText = sensorCfg.unit;
      }
    }
  }

  // Funkcja odtwarzająca komunikat głosowy po polsku
  function speakAlert(text) {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pl-PL';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }

// Ocena wartości czujnika pod kątem progów (warning = Próg I, alarm = Próg II)
  function evaluateSensorThresholds(key, rawValue) {
    const cardElem = document.getElementById('card-' + key);
    const cfg = MQTT_CONFIG.sensors ? MQTT_CONFIG.sensors[key] : null; //[cite: 4]
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

    // Aplikacja stylów CSS
    cardElem.classList.remove('status-warning', 'status-alarm');
    if (currentState === 'alarm') {
      cardElem.classList.add('status-alarm');
    } else if (currentState === 'warning') {
      cardElem.classList.add('status-warning');
    }

    // Komunikaty głosowe przy wejściu w dany próg
    const prevState = sensorAlertStates[key];
    const sensorName = cfg.name || key; //[cite: 4]
    const unit = cfg.unit ? (' ' + cfg.unit) : '';

    if (currentState === 'warning' && prevState !== 'warning' && prevState !== 'alarm') {
      speakAlert(`Uwaga! Przekroczenie progu pierwszego: ${sensorName}, wartość: ${numVal}${unit}`);
    } else if (currentState === 'alarm' && prevState !== 'alarm') {
      speakAlert(`Alarm! Przekroczenie progu drugiego: ${sensorName}, wartość: ${numVal}${unit}`);
    }

    sensorAlertStates[key] = currentState;
  }

  // Zmiana tekstu i diody statusu połączenia
  function setStatus(text, color) {
    if (statusElem) statusElem.innerText = text;
    if (dotElem) {
      dotElem.style.backgroundColor = color;
      dotElem.style.color = color;
    }
  }

  // Wygaszenie wartości kafelków po upływie czasu
  function markStale() {
    document.querySelectorAll('.val-box').forEach(el => { el.style.opacity = '0.4'; });
  }

  // Przywrócenie jasności kafelków po świeżych danych
  function markFresh() {
    document.querySelectorAll('.val-box').forEach(el => { el.style.opacity = '1'; });
  }

  // Archiwizacja do arkusza Google Sheets w tle
  function archiveToGoogleSheets(data) {
    if (!MQTT_CONFIG.googleSheetUrl) return;

    fetch(MQTT_CONFIG.googleSheetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(data)
    }).catch(err => {
      console.warn('Błąd podczas wysyłania do Google Sheets:', err);
    });
  }

  // Opcje połączenia MQTT.js
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
      markStale();
    }, WATCHDOG_TIMEOUT_MS);
  }

  function stopWatchdog() {
    if (watchdogTimer) clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }

  client.on('connect', () => {
    setStatus('Połączono (Oczekiwanie)', '#38bdf8');
    client.subscribe(MQTT_CONFIG.topic);
    resetWatchdog();
  });

  client.on('reconnect', () => {
    setStatus('Ponawianie połączenia...', '#f59e0b');
  });

  client.on('message', (topic, message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (err) {
      console.warn('Otrzymano nieprawidłowy format JSON:', message.toString());
      return;
    }

    if (data === null || typeof data !== 'object') return;

    let updated = false;

    // Aktualizacja kafelków i sprawdzanie progów
    for (let i = 1; i <= 10; i++) {
      const key = 's' + i;
      const valElem = document.getElementById(key);
      const cardElem = document.getElementById('card-' + key);

      if (valElem && data[key] != null) {
        valElem.innerText = data[key];
        updated = true;

        // Błysk kafelka przy aktualizacji
        if (cardElem) {
          cardElem.classList.add('flash');
          setTimeout(() => cardElem.classList.remove('flash'), 300);
        }

        // Ocena progów żółtego i czerwonego
        evaluateSensorThresholds(key, data[key]);
      }
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

  client.on('error', (err) => {
    console.warn('Błąd MQTT:', err && err.message ? err.message : err);
    stopWatchdog();
    markStale();
    setStatus('Błąd połączenia', '#ef4444');
  });

  client.on('close', () => {
    stopWatchdog();
    markStale();
    setStatus('Rozłączono', '#64748b');
  });
});
