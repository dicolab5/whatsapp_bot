// src/server.js
const app = require('./app');
const runMigrations = require('./database/migrations');

const PORT = process.env.PORT || 3000;

async function start() {
  await runMigrations();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Admin rodando na porta ${PORT}`);
    console.log(`Acesso local:   http://localhost:${PORT}`);
    console.log(`Acesso externo: http://whatsappbot.ddns.net:${PORT}`);
  });
}

start().catch(err => console.error('Erro ao iniciar aplicação:', err));
