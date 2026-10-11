// Numer aktualnej wersji aplikacji – pokazywany w stopce strony
const APP_VERSION = '1.8';

// Limit czasu (w ms), po którym stan czujników zostanie uznany za nieaktualny
const WATCHDOG_TIMEOUT_MS = 60000;
let watchdogTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  // Pobranie kluczowych elementów interfejsu
  const statusElem = document.getElementById('status');
  const dotElem = document.getElementById('status-dot');
  const timeElem = document.getElementById('last-time');
  const versionElem = document.getElementById('app-version');
  const titleElem = document.getElementById('dashboard-title');

  // 1. Wyświetlenie wersji w stopce
  if (versionElem) {
    versionElem.innerText = 'v' + APP_VERSION;
  }

  // 2. Dynamiczne ustawienie tytułu strony i karty z pliku config.js
  if (MQTT_CONFIG.dashboardTitle) {
    if (titleElem) titleElem.innerText = MQTT_CONFIG.dashboardTitle;
    document.title = MQTT_CONFIG.dashboardTitle;
  }

  // 3. Wczytanie zdefiniowanych nazw i jednostek czujników (s1..s10)
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

  // Funkcja pomocnicza: zmiana tekstu i koloru diody statusu
  function setStatus(text, color) {
    if (statusElem) statusElem.innerText = text;
    if (dotElem) {
      dotElem.style.backgroundColor = color;
      dotElem.style.color = color;
    }
  }

  // Przyciemnienie wartości na kafelkach, gdy minie czas oczekiwania (watchdog)
  function markStale() {
    document.querySelectorAll('.val-box').forEach(el => { el.style.opacity = '0.4'; });
  }

  // Przywrócenie pełnej jasności po odebraniu świeżej paczki danych
  function markFresh() {
    document.querySelectorAll('.val-box').forEach(el => { el.style.opacity = '1'; });
  }

  // Funkcja wysyłająca kopię odebranych danych do Google Sheets (Apps Script)
  function archiveToGoogleSheets(data) {
    if (!MQTT_CONFIG.googleSheetUrl) return; // Brak URL oznacza wyłączoną archiwizację

    fetch(MQTT_CONFIG.googleSheetUrl, {
      method: 'POST',
      mode: 'no-cors', // Niezbędne do ominięcia ograniczeń CORS w Apps Script
      headers: {
        'Content-Type': 'text/plain' // Zabezpiecza przed dodatkowym zapytaniem preflight OPTIONS
      },
      body: JSON.stringify(data)
    }).catch(err => {
      console.warn('Błąd podczas wysyłania do Google Sheets:', err);
    });
  }

  // Opcje połączenia klienta MQTT.js
  const options = {
    clientId: 'web_' + Math.random().toString(16).substring(2, 8),
    username: MQTT_CONFIG.username,
    password: MQTT_CONFIG.password,
    clean: true,
    connectTimeout: 5000
  };

  // Nawiązanie połączenia z brokerem EMQX Cloud
  const client = mqtt.connect(MQTT_CONFIG.host, options);

  // Restart licznika watchdoga – ostrzega w przypadku przerw w nadawaniu
  function resetWatchdog() {
    if (watchdogTimer) clearTimeout(watchdogTimer);
    watchdogTimer = setTimeout(() => {
      setStatus('Brak danych (timeout)', '#f59e0b');
      markStale();
    }, WATCHDOG_TIMEOUT_MS);
  }

  // Zatrzymanie watchdoga (np. przy rozłączeniu z brokerem)
  function stopWatchdog() {
    if (watchdogTimer) clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }

  // Zdarzenie: Połączono z brokerem
  client.on('connect', () => {
    setStatus('Połączono (Oczekiwanie)', '#38bdf8');
    client.subscribe(MQTT_CONFIG.topic);
    resetWatchdog(); // Watchdog czuwa również wtedy, gdy po połączeniu dane nigdy nie nadejdą
  });

  // Zdarzenie: Próba ponownego nawiązania zerwanego połączenia
  client.on('reconnect', () => {
    setStatus('Ponawianie połączenia...', '#f59e0b');
  });

  // Zdarzenie: Odebrano wiadomość na subskrybowanym kanale
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

    // Przeglądamy klucze s1..s10. Aktualizujemy tylko te obecne w paczce
    for (let i = 1; i <= 10; i++) {
      const key = 's' + i;
      const valElem = document.getElementById(key);
      const cardElem = document.getElementById('card-' + key);

      // Warunek != null dopuszcza zarówno liczby, jak i ciągi znaków (ignorując null i undefined)
      if (valElem && data[key] != null) {
        valElem.innerText = data[key];
        updated = true;

        // Krótki błysk kafelka sygnalizujący aktualizację pomiaru
        if (cardElem) {
          cardElem.classList.add('flash');
          setTimeout(() => cardElem.classList.remove('flash'), 300);
        }
      }
    }

    // Jeśli w wiadomości nie było żadnego z kluczy s1..s10, nie traktujemy jej jako pomiaru
    if (!updated) return;

    // Odnotowanie czasu odbioru paczki
    if (timeElem) {
      timeElem.innerText = new Date().toLocaleTimeString('pl-PL');
    }

    markFresh();
    setStatus('Aktywne (Dane na żywo)', '#10b981');
    resetWatchdog();

    // Wysłanie kopii danych do arkusza Google Sheets w tle
    archiveToGoogleSheets(data);
  });

  // Zdarzenie: Błąd sieci lub protokołu MQTT
  client.on('error', (err) => {
    console.warn('Błąd MQTT:', err && err.message ? err.message : err);
    stopWatchdog();
    markStale();
    setStatus('Błąd połączenia', '#ef4444');
  });

  // Zdarzenie: Rozłączenie z serwerem
  client.on('close', () => {
    stopWatchdog();
    markStale();
    setStatus('Rozłączono', '#64748b');
  });
});
