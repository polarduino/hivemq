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

  // Indywidualne etykiety, jednostki oraz progi progowe (warning = żółty, alarm = czerwony)
  // Możesz podać max (przekroczenie w górę) lub min (spadek w dół)
  sensors: {
    s1:  { name: 'Salon O2',             unit: '% O2',   warnMin: 19.0,  alarmMin: 18.0 },
    s2:  { name: 'Salon CO2',            unit: '% CO2',    warnMax: 0.5,  alarmMax: 1.5 },
    s3:  { name: 'Salon Temp.',          unit: '°C',   warnMin: 19.0,  alarmMin: 17.0 },
    s4:  { name: 'Ciśnienie',            unit: 'hPa',  warnMin: 990.0, alarmMin: 970.0 },
    s5:  { name: 'Napięcie Zasilania',   unit: 'V',    warnMin: 11.5,  alarmMin: 10.8 },
    s6:  { name: 'Prąd Pobierany',       unit: 'A',    warnMax: 8.0,   alarmMax: 10.0 },
    s7:  { name: 'Czujnik 7',            unit: 'ppm',  warnMax: 1000,  alarmMax: 1500 },
    s8:  { name: 'Czujnik 8',            unit: 'V/V',  warnMax: 50.0,  alarmMax: 80.0 },
    s9:  { name: 'Czujnik 9',            unit: '%DGW', warnMax: 10.0,  alarmMax: 20.0 },
    s10: { name: 'Czujnik 10',           unit: 'W',    warnMax: 2000,  alarmMax: 2500 }
  }
};
