const WATCHDOG_TIMEOUT_MS = 10000;
let watchdogTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  const statusElem = document.getElementById('status');
  const timeElem = document.getElementById('last-time');

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
      statusElem.innerText = 'Brak danych z urządzenia';
      statusElem.style.color = 'orange';
    }, WATCHDOG_TIMEOUT_MS);
  }

  client.on('connect', () => {
    statusElem.innerText = 'Połączono (Oczekiwanie)';
    statusElem.style.color = 'green';
    client.subscribe(MQTT_CONFIG.topic);
  });

  client.on('message', (topic, message) => {
    try {
      // Rozpakowanie JSONa bezpośrednio w przeglądarce
      const data = JSON.parse(message.toString());

      // Aktualizacja wszystkich 10 kafelków po ich kluczach s1..s10
      for (let i = 1; i <= 10; i++) {
        const key = 's' + i;
        const elem = document.getElementById(key);
        if (elem && data[key] !== undefined) {
          elem.innerText = data[key];
        }
      }

      // Czas odbioru
      if (timeElem) {
        timeElem.innerText = new Date().toLocaleTimeString('pl-PL');
      }

      statusElem.innerText = 'Aktywne (Dane na żywo)';
      statusElem.style.color = 'green';
      resetWatchdog();
    } catch (err) {
      console.warn('Otrzymano dane niebędące formatem JSON:', message.toString());
    }
  });

  client.on('error', (err) => {
    statusElem.innerText = 'Błąd połączenia';
    statusElem.style.color = 'red';
  });

  client.on('close', () => {
    statusElem.innerText = 'Rozłączono';
    statusElem.style.color = 'gray';
  });
});
