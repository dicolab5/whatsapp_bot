// src/whatsapp/client.js
const { Client, LocalAuth } = require('whatsapp-web.js');

let lastQr = null;
let _isReady = false;
let clientInitialized = false;

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

client.on('qr', (qr) => {
  console.log('QR code atualizado (use /qr no painel para escanear).');
  lastQr = qr;
  _isReady = false;
});

client.on('ready', () => {
  console.log('WhatsApp client pronto!');
  _isReady = true;
  lastQr = null;
});

client.on('auth_failure', (msg) => {
  console.error('Falha na autenticação', msg);
  _isReady = false;
});

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

async function startClient() {
  if (!clientInitialized) {
    clientInitialized = true;
    await client.initialize();
  }
}

async function stopClient() {
  if (clientInitialized) {
    try {
      await client.destroy();
      clientInitialized = false;
      _isReady = false;
      lastQr = null;
      console.log('Client WhatsApp parado!');
    } catch (err) {
      console.error('Erro ao parar client:', err);
    }
  }
}

function getQrStatus() {
  return { qr: lastQr, ready: _isReady };
}

function getBotStatus() {
  return { ready: _isReady };
}

module.exports = {
  client,
  startClient,
  stopClient,
  getQrStatus,
  getBotStatus,
};
