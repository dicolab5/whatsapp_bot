// src/whatsapp/whatsapp.js 
const WhatsAppManager = require("./manager");
const { normalizeText, isGreeting, isOptOut, normalizeWaId } = require("./utils");
const { handleOptIn, handleOptOut, handleDailyPromotions, handleHumanSupport } = require("./optHandlers");
const { pendingMaintenanceUsers, handleMaintenanceSchedule, processMaintenanceStep } = require("./maintenanceHandler");

const activeBots = {}; // userId => ready

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

async function startWhatsApp(userId) {
  if (activeBots[userId]) return; // evita listeners duplicados

  const client = await WhatsAppManager.getClient(userId);

  client.on("ready", () => {
    console.log(`✔️ WhatsApp pronto para userId = ${userId}`);
    activeBots[userId] = true;
  });

  client.on("message", async (msg) => {
    if (!activeBots[userId]) return;

    const chat = await msg.getChat();
    if (chat.isGroup) return;

    const from = normalizeWaId(msg.from);
    const text = msg.body.trim();
    const normalized = normalizeText(text);

    if (isOptOut(text)) return handleOptOut(from, userId);

    if (isGreeting(text))
      return client.sendMessage(from, getMainMenuText());

    if (pendingMaintenanceUsers[from])
      return processMaintenanceStep(msg, userId);

    switch (normalized) {
      case "1": return handleOptIn(from, userId);
      case "2": return handleDailyPromotions(from, userId);
      case "3": return handleHumanSupport(from, userId);
      case "4": return handleMaintenanceSchedule(from, userId);
      default:
        if (/^[0-9]$/.test(normalized))
          return client.sendMessage(from, "Opção inválida.\n\n" + getMainMenuText());
    }
  });
}


module.exports = { startWhatsApp };
