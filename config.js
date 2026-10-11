const MQTT_CONFIG = {
  // Tytuł nagłówka i zakładki przeglądarki
  dashboardTitle: 'Panel Odczytów',
  
  host: 'wss://ja7ada14.ala.eu-central-1.emqxsl.com:8084/mqtt',
  username: 'frontend_guest',
  password: '1234QR4321',
  topic: 'test/data',
  // Custom names and units for sensors s1–s10
  sensors: {
    s1:  { name: 'Temperatura Salon', unit: '°C' },
    s2:  { name: 'Wilgotność Salon',   unit: '%' },
    s3:  { name: 'Temperatura Zewnątrz', unit: '°C' },
    s4:  { name: 'Ciśnienie',          unit: 'hPa' },
    s5:  { name: 'Napięcie Zasilania', unit: 'V' },
    s6:  { name: 'Prąd Pobierany',     unit: 'A' },
    s7:  { name: 'Czujnik 7',          unit: '' },
    s8:  { name: 'Czujnik 8',          unit: '' },
    s9:  { name: 'Czujnik 9',          unit: '' },
    s10: { name: 'Czujnik 10',         unit: '' }
  }
};
