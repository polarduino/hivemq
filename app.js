// Czas w milisekundach, po którym uznajemy, że brak nowych danych z czujnika (np. 10 sekund)
const WATCHDOG_TIMEOUT_MS = 10000; 
let watchdogTimer = null;

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
  // Anuluj poprzedni stoper
  if (watchdogTimer) clearTimeout(watchdogTimer);

  // Ustaw nowy stoper
  watchdogTimer = setTimeout(() => {
    statusElem.innerText = 'Brak nowych danych (Czujnik milczy)';
    statusElem.style.color = 'orange';
  }, WATCHDOG_TIMEOUT_MS);
}

// Obsługa pomyślnego połączenia
client.on('connect', () => {
  statusElem.innerText = 'Połączono (Oczekiwanie na dane...)';
  statusElem.style.color = 'green';
  
  // Subskrypcja tematu z pliku config.js
  client.subscribe(MQTT_CONFIG.topic);
});

// Reakcja na nową wiadomość
client.on('message', (topic, message) => {
  // 1. Aktualizacja wartości na stronie
  valElem.innerText = message.toString();

  // 2. Aktualizacja czasu odebrania wiadomości
  const now = new Date();
  const timeFormatted = now.toLocaleTimeString('pl-PL');
  if (timeElem) {
    timeElem.innerText = timeFormatted;
  }

  // 3. Aktualizacja statusu na aktywny
  statusElem.innerText = 'Połączono (Dane na żywo)';
  statusElem.style.color = 'green';

  // 4. Odświeżenie watchdoga – resetujemy odliczanie
  resetWatchdog();
});

// Obsługa błędów połączenia
client.on('error', (err) => {
  statusElem.innerText = 'Błąd połączenia z brokerem';
  statusElem.style.color = 'red';
  console.error(err);
});

client.on('close', () => {
  statusElem.innerText = 'Rozłączono';
  statusElem.style.color = 'gray';
  if (watchdogTimer) clearTimeout(watchdogTimer);
});
