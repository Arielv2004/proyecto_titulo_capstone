const app = require('./app');
const config = require('./config/env');
const startMaintenance = require('./services/maintenance.service');

const PORT = config.PORT;

app.listen(PORT, () => {
  startMaintenance();
  console.log(`[MyMedRecord Backend-Core] Servidor ejecutándose en puerto ${PORT}`);
  console.log(`Modo: ${config.NODE_ENV}`);
});
