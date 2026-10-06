const APP_VERSION = '1.1'; // Zmień numer tutaj przy kolejnej aktualizacji
const WATCHDOG_TIMEOUT_MS = 60000; // zmiana z 10000
let watchdogTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  const statusElem = document.getElementById('status');
  const timeElem = document.getElementById('last-time');
  const versionElem = document.getElementById('app-version');

  // Wyświetlenie wersji w stopce
  if (versionElem) {
    versionElem.innerText = 'v' + APP_VERSION;
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
      if (statusElem) {
        statusElem.innerText = 'Brak danych z urządzenia';
        statusElem.style.color = 'orange';
      }
    }, WATCHDOG_TIMEOUT_MS);
  }

  client.on('connect', () => {
    if (statusElem) {
      statusElem.innerText = 'Połączono (Oczekiwanie)';
      statusElem.style.color = 'green';
    }
    client.subscribe(MQTT_CONFIG.topic);
  });

  client.on('reconnect', () => {
    if (statusElem) {
      statusElem.innerText = 'Ponawianie połączenia...';
      statusElem.style.color = 'orange';
    }
  });

  client.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());

      // Aktualizacja wartości pól s1..s10
      for (let i = 1; i <= 10; i++) {
        const key = 's' + i;
        const elem = document.getElementById(key);
        if (elem && data[key] !== undefined) {
          elem.innerText = data[key];
        }
      }

      if (timeElem) {
        timeElem.innerText = new Date().toLocaleTimeString('pl-PL');
      }

      if (statusElem) {
        statusElem.innerText = 'Aktywne (Dane na żywo)';
        statusElem.style.color = 'green';
      }

      resetWatchdog();
    } catch (err) {
      console.warn('Otrzymano nieprawidłowy format JSON:', message.toString());
    }
  });

  client.on('error', (err) => {
    if (statusElem) {
      statusElem.innerText = 'Błąd połączenia';
      statusElem.style.color = 'red';
    }
  });

  client.on('close', () => {
    if (statusElem) {
      statusElem.innerText = 'Rozłączono';
      statusElem.style.color = 'gray';
    }
  });
});
