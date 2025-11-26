// // src/whatsapp/whatsapp.js
const { client, startClient, stopClient, getQrStatus, getBotStatus } = require('./client');
const { normalizeText, isGreeting, isOptOut, normalizeWaId } = require('./utils');
const { handleOptIn, handleOptOut, handleDailyPromotions, handleHumanSupport } = require('./optHandlers');
const { pendingMaintenanceUsers, handleMaintenanceSchedule, processMaintenanceStep } = require('./maintenanceHandler');

function getMainMenuText() {
  return (
    'Olá! 👋 Seja bem-vindo ao atendente virtual da SuperTI.\n\n' +
    '1️⃣ Para receber ofertas, novidades e promoções diárias (opt-in).\n' +
    '2️⃣ Para saber as promoções de hoje.\n' +
    '3️⃣ Para falar com um atendente humano.\n' +
    '4️⃣ Para agendar uma visita de manutenção.\n\n' +
    'Responda apenas com o número da opção desejada.\n\n' +
    'Se quiser parar de receber ofertas, envie "SAIR".'
  );
}

// Inicialize o client assim que este módulo for carregado
startClient().catch(console.error);

client.on('message', async (msg) => {
  try {
    console.log(`Mensagem recebida de ${msg.from}: ${msg.body}`);

    if (!client.isReady) {
      console.log('Cliente não está pronto. Ignorando mensagem.');
      return;
    }

    const chat = await msg.getChat();
    if (chat.isGroup) return;

    const from = normalizeWaId(msg.from);  // Uso consistente
    const body = (msg.body || '').trim();
    const normalized = normalizeText(body);

    if (isOptOut(body)) {
      await handleOptOut(from);
      return;
    }

    if (isGreeting(body)) {
      await client.sendMessage(from, getMainMenuText());
      return;
    }

    if (pendingMaintenanceUsers[from]) {
      await processMaintenanceStep(msg);
      return;
    }

    const choice = normalized.replace(/\s+/g, '');

    if (choice === '1') {
      await handleOptIn(from);
      return;
    }

    if (choice === '2') {
      await handleDailyPromotions(from);
      return;
    }

    if (choice === '3') {
      await handleHumanSupport(from);
      return;
    }

    if (choice === '4') {
      await handleMaintenanceSchedule(from);
      return;
    }

    // Opção inválida
    if (/^[0-9]$/.test(choice)) {
      await client.sendMessage(from, 'Não entendi a opção digitada.\n\n' + getMainMenuText());
    }
  } catch (err) {
    console.error('Erro no listener de mensagem:', err);
  }
});

module.exports = {
  client,
  startClient,
  stopClient,
  syncContacts: async function () {
    // Sua função original de syncContacts pode ficar aqui ou em módulo próprio
  },
  getQrStatus,
  getBotStatus,
};
