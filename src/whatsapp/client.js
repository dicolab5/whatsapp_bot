// src/whatsapp/client.js  
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('node:fs').promises;
const path = require('node:path');

let lastQr = null;
let _isReady = false;
let clientInitialized = false;

// configura o client do WhatsApp
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './session' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--single-process',
      '--no-zygote'
    ]
  },
  webVersion: '2.2412.54',
  webVersionCache: { type: 'local', path: './wwebjs_cache.json' }
});

// eventos do client
client.on('qr', (qr) => {
  console.log('QR code atualizado (use /qr no painel para escanear).');
  lastQr = qr;
  _isReady = false;
});

// Evento de ready
client.on('ready', () => {
  console.log('WhatsApp client pronto!');
  _isReady = true;
  lastQr = null;
});

// Evento de auth_failure
client.on('auth_failure', (msg) => {
  console.error('Falha na autenticação', msg);
  _isReady = false;
});

// Evento de disconnected
client.on('disconnected', (reason) => {
  console.error('Cliente desconectado', reason);
  _isReady = false;
});

// Getter para isReady para usar em outro arquivos
Object.defineProperty(client, 'isReady', {
  get() {
    return _isReady;
  }
});

// inicia o client
async function startClient() {
  if (!clientInitialized) {
    clientInitialized = true;
    await client.initialize();
  }
}

// para o client
async function stopClient() {
  if (clientInitialized) {
    try {
      await client.destroy();
      clientInitialized = false;
      _isReady = false;
      lastQr = null;
      
      // ✅ CAMINHO CORRETO para RAIZ do projeto
      const rootDir = path.dirname(path.dirname(__dirname)); // src/whatsapp -> src -> RAIZ
      const sessionPath = path.join(rootDir, 'session');
      const cachePath = path.join(rootDir, 'wwebjs_cache.json');
      
      // ❌ Excluir pasta session/
      try {
        await fs.rm(sessionPath, { recursive: true, force: true });
        console.log('🗑️ Pasta session/ excluída com sucesso!');
      } catch (fsErr) {
        console.warn('⚠️ Pasta session/ não encontrada ou erro:', fsErr.message);
      }
      
      // ❌ Excluir pasta .wwebjs_cache/
      try {
        await fs.rm(cachePath, { recursive: true, force: true });
        console.log('🗑️ Pasta .wwebjs_cache/ excluída com sucesso!');
      } catch (fsErr) {
        console.warn('⚠️ Pasta .wwebjs_cache/ não encontrada ou erro:', fsErr.message);
      }
      
      console.log('✅ Client WhatsApp parado!');
    } catch (err) {
      console.error('❌ Erro ao parar client:', err);
    }
  }
}

// obtém o status do QR code e readiness
function getQrStatus() {
  return { qr: lastQr, ready: _isReady };
}

// obtém o status do bot
function getBotStatus() {
  return { ready: _isReady };
}

// exporta o client e funções
module.exports = {
  client,
  startClient,
  stopClient,
  getQrStatus,
  getBotStatus,
};
