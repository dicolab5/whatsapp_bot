// src/server.js
const app = require('./app');
const runMigrations = require('./database/migrations');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'desenvolvimento';

async function start() {
  await runMigrations();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Admin rodando na porta ${PORT}`);
    console.log(`Acesso local:   http://localhost:${PORT}`);
    console.log(`Acesso externo: http://whatsappbot.ddns.net:${PORT}`);
    //console.log('RAW PAGBANK_TOKEN:', process.env.PAGBANK_TOKEN);
    console.log(`Ambiente: ${NODE_ENV}`);
  });
}

start().catch(err => console.error('Erro ao iniciar aplicação:', err));
