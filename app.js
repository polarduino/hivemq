// Czas w milisekundach, po którym uznajemy, że brak nowych danych z czujnika (10 sekund)
const WATCHDOG_TIMEOUT_MS = 10000; 
let watchdogTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  // Pobranie elementów interfejsu z HTML
  const valElem = document.getElementById('val');
  const statusElem = document.getElementById('status');
  const timeElem = document.getElementById('last-time');

  // Opis opcji i nawiązanie połączenia z HiveMQ
  const options = {
    clientId: 'web_' + Math.random().toString(16).substr(2, 8),
    username: MQTT_CONFIG.username,
    password: MQTT_CONFIG.password,
    clean: true,
    connectTimeout: 5000
  };

  const client = mqtt.connect(MQTT_CONFIG.host, options);

  // Funkcja resetująca i uruchamiająca na nowo stoper braku danych
  function resetWatchdog() {
    if (watchdogTimer) clearTimeout(watchdogTimer);

    watchdogTimer = setTimeout(() => {
      if (statusElem) {
        statusElem.innerText = 'Brak nowych danych (Czujnik milczy)';
        statusElem.style.color = 'orange';
      }
    }, WATCHDOG_TIMEOUT_MS);
  }

  // Obsługa pomyślnego połączenia
  client.on('connect', () => {
    if (statusElem) {
      statusElem.innerText = 'Połączono (Oczekiwanie na dane...)';
      statusElem.style.color = 'green';
    }
    client.subscribe(MQTT_CONFIG.topic);
  });

  // Obsługa ponownego łączenia
  client.on('reconnect', () => {
    if (statusElem) {
      statusElem.innerText = 'Ponawianie połączenia...';
      statusElem.style.color = 'orange';
    }
  });

  // Reakcja na nową wiadomość
  client.on('message', (topic, message) => {
    const rawData = message.toString();
    
    // Obsługa tekstowa lub parsowanie JSON
    try {
      const parsedData = JSON.parse(rawData);
      // Jeśli dane są obiektem, np. { value: 25.4 }
      valElem.innerText = parsedData.value !== undefined ? parsedData.value : rawData;
    } catch (e) {
      // Jeśli dane nie są JSONem, wyświetlamy je bezpośrednio
      valElem.innerText = rawData;
    }

    // Aktualizacja czasu odebrania wiadomości
    const now = new Date();
    if (timeElem) {
      timeElem.innerText = now.toLocaleTimeString('pl-PL');
    }

    // Aktualizacja statusu
    if (statusElem) {
      statusElem.innerText = 'Połączono (Dane na żywo)';
      statusElem.style.color = 'green';
    }

    // Odświeżenie watchdoga
    resetWatchdog();
  });

  // Obsługa błędów połączenia
  client.on('error', (err) => {
    if (statusElem) {
      statusElem.innerText = 'Błąd połączenia z brokerem';
      statusElem.style.color = 'red';
    }
    console.error(err);
  });

  client.on('close', () => {
    if (statusElem) {
      statusElem.innerText = 'Rozłączono';
      statusElem.style.color = 'gray';
    }
    if (watchdogTimer) clearTimeout(watchdogTimer);
  });
});
