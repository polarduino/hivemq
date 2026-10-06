const APP_VERSION = '1.4';
const WATCHDOG_TIMEOUT_MS = 60000;
let watchdogTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  const statusElem = document.getElementById('status');
  const dotElem = document.getElementById('status-dot');
  const timeElem = document.getElementById('last-time');
  const versionElem = document.getElementById('app-version');

  if (versionElem) {
    versionElem.innerText = 'v' + APP_VERSION;
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
      setStatus('Brak danych (timeout)', '#f59e0b'); // pomarańczowy
    }, WATCHDOG_TIMEOUT_MS);
  }

  client.on('connect', () => {
    setStatus('Połączono (Oczekiwanie)', '#38bdf8'); // błękitny
    client.subscribe(MQTT_CONFIG.topic);
  });

  client.on('reconnect', () => {
    setStatus('Ponawianie połączenia...', '#f59e0b');
  });

  client.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());

      // Aktualizacja wartości s1..s10 z efektem podświetlenia
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

      setStatus('Aktywne (Dane na żywo)', '#10b981'); // zielony
      resetWatchdog();
    } catch (err) {
      console.warn('Otrzymano nieprawidłowy format JSON:', message.toString());
    }
  });

  client.on('error', (err) => {
    setStatus('Błąd połączenia', '#ef4444'); // czerwony
  });

  client.on('close', () => {
    setStatus('Rozłączono', '#64748b'); // szary
  });
});
