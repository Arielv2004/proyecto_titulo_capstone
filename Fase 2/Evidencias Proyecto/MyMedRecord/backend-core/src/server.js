const app = require('./app');
const config = require('./config/env');

const PORT = config.PORT;

app.listen(PORT, () => {
  console.log(`🚀 [MyMedRecord Backend-Core] Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🔒 Modo: ${config.NODE_ENV}`);
});
