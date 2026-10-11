// Konfiguracja parametrów połączenia MQTT, wyglądu panelu oraz archiwizacji danych
const MQTT_CONFIG = {
  // Główny tytuł wyświetlany w nagłówku strony oraz na karcie przeglądarki
  dashboardTitle: 'Panel Czujników',
  
  // Parametry brokera EMQX Cloud (WebSocket Secure)
  host: 'wss://ja7ada14.ala.eu-central-1.emqxsl.com:8084/mqtt',
  username: 'frontend_guest',
  password: '1234QR4321',
  topic: 'test/data',

  // Adres URL aplikacji internetowej Google Apps Script (z wdrożenia jako Web App)
  // Wklej tutaj swój link https://script.google.com/macros/s/.../exec
  // Jeśli zostawisz pusty ciąg '', wysyłanie do arkusza będzie wyłączone.
  googleSheetUrl: 'https://script.google.com/macros/s/AKfycbwEbgekzxwi0u2ZZ14v2XBIhsMYT84Eqks_YmofEkoptR7XK1oUX5JGNFRGz-j7J3xr/exec',

  // Indywidualne etykiety oraz jednostki dla czujników s1–s10
  sensors: {
    s1:  { name: 'Temperatura Salon',   unit: '°C' },
    s2:  { name: 'Wilgotność Salon',     unit: '%' },
    s3:  { name: 'Temperatura Zewnątrz', unit: '°C' },
    s4:  { name: 'Ciśnienie',            unit: 'hPa' },
    s5:  { name: 'Napięcie Zasilania',   unit: 'V' },
    s6:  { name: 'Prąd Pobierany',       unit: 'A' },
    s7:  { name: 'Czujnik 7',            unit: '' },
    s8:  { name: 'Czujnik 8',            unit: '' },
    s9:  { name: 'Czujnik 9',            unit: '' },
    s10: { name: 'Czujnik 10',           unit: '' }
  }
};
