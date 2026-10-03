// Logika połączenia i obsługi interfejsu
const options = {
  clientId: 'web_' + Math.random().toString(16).substr(2, 8),
  username: MQTT_CONFIG.username,
  password: MQTT_CONFIG.password,
  clean: true,
  reconnectPeriod: 1000
};

const valElem = document.getElementById('val');
const statusElem = document.getElementById('status');

// Nawiązanie połączenia przy użyciu zmiennej z config.js
const client = mqtt.connect(MQTT_CONFIG.host, options);

client.on('connect', () => {
  statusElem.innerText = 'Połączono';
  statusElem.style.color = 'green';
  
  // Subskrypcja tematu
  client.subscribe(MQTT_CONFIG.topic);
});

client.on('message', (topic, message) => {
  valElem.innerText = message.toString();
});

client.on('error', (err) => {
  statusElem.innerText = 'Błąd połączenia';
  statusElem.style.color = 'red';
  console.error(err);
});
