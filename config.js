// Konfiguracja parametrów połączenia MQTT, wyglądu panelu oraz archiwizacji danych
// Wrażliwe ciągi tekstowe zostały zakodowane
const MQTT_CONFIG = {
  // Główny tytuł wyświetlany w nagłówku strony oraz na karcie przeglądarki
  dashboardTitle: 'Panel Czujników',
  
  // Zakodowane parametry brokera EMQX Cloud
  _h: 'd3NzOi8vamE3YWRhMTQuYWxhLmV1LWNlbnRyYWwtMS5lbXF4c2wuY29tOjgwODQvbXF0dA==', // host
  _u: 'ZnJvbnRlbmRfZ3Vlc3Q=',                                                     // username
  _p: 'MTIzNFFSNDMyMQ==',                                                         // password
  _t: 'dGVzdC9kYXRh',                                                             // topic

  // Zakodowany adres Web App Google Apps Script
  _g: 'aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3RWJnZWt6eHdpMHUyWloxNHYyWEJJaHNNWVQ4NEVxa3NfWW1vZkVrb3B0UjdYSzFvVVg1SkdORlJHei1qN0ozeHIvZXhlYw==', 

  // Gettery automatycznie dekodujące wartości w locie dla app.js
  get host()           { return this._h ? atob(this._h) : ''; },
  get username()       { return this._u ? atob(this._u) : ''; },
  get password()       { return this._p ? atob(this._p) : ''; },
  get topic()          { return this._t ? atob(this._t) : ''; },
  get googleSheetUrl() { return this._g ? atob(this._g) : ''; },

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
