// src/models/Summary.js
const db = require('../database/db');
const { getBotStatus } = require('../whatsapp/client');

async function getSummary(userId) {
  const [{ totalContacts }] = await db('whatsapp_contacts')
    .where({ user_id: userId })
    .count('* as totalContacts');

  // lê status real do bot
  const bot = getBotStatus(); // algo como { ready: boolean, ... }
  const botStatus = bot?.ready ? 'ready' : 'offline';

  const user = await db('users')
    .where({ id: userId })
    .select('account_type', 'subscription_expires')
    .first();

  return {
    botStatus, // agora dinâmico
    plan: user?.account_type || 'free',
    planExpires: user?.subscription_expires || null,
    contacts: Number(totalContacts) || 0,
    campaigns: 0,
    openTickets: 0,
    todayMessages: 0,
  };
}

module.exports = { getSummary };


// // src/models/Summary.js
// const db = require('../database/db');

// async function getSummary(userId) {
//   // contatos
//   const [{ totalContacts }] = await db('whatsapp_contacts')
//     .where({ user_id: userId })
//     .count('* as totalContacts');

//   // placeholder para campanhas / tickets / mensagens
//   const campaigns = 0;
//   const openTickets = 0;
//   const todayMessages = 0;

//   // dados do plano
//   const user = await db('users')
//     .where({ id: userId })
//     .select('account_type', 'subscription_expires')
//     .first();

//   return {
//     botStatus: 'ready', // depois você pode ler de getBotStatus()
//     plan: user?.account_type || 'free',
//     planExpires: user?.subscription_expires || null,
//     contacts: Number(totalContacts) || 0,
//     campaigns,
//     openTickets,
//     todayMessages,
//   };
// }

// module.exports = { getSummary };


// // src/models/Report.js
// const db = require('../database/db');

// async function getSummary(userId) {
//   // conta contatos do usuário
//   const [{ totalContacts }] = await db('whatsapp_contacts')
//     .where({ user_id: userId })
//     .count('* as totalContacts');

//   // conta campanhas (ajuste nome da tabela/coluna se for diferente)
//   const [{ totalCampaigns }] = await db('broadcasts')
//     .where({ user_id: userId })
//     .count('* as totalCampaigns');

//   // conta tickets em aberto
//   const [{ openTickets }] = await db('tickets')
//     .where({ user_id: userId })
//     .andWhere('status', 'open')
//     .count('* as openTickets');

//   // mensagens hoje (ajuste tabela/coluna de data)
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const tomorrow = new Date(today);
//   tomorrow.setDate(today.getDate() + 1);

//   const [{ todayMessages }] = await db('messages')
//     .where({ user_id: userId })
//     .andWhere('created_at', '>=', today)
//     .andWhere('created_at', '<', tomorrow)
//     .count('* as todayMessages');

//   // dados de plano
//   const user = await db('users')
//     .where({ id: userId })
//     .select('account_type', 'subscription_expires')
//     .first();

//   return {
//     botStatus: 'ready', // por enquanto fixo; depois você pode ler de getBotStatus()
//     plan: user?.account_type || 'free',
//     planExpires: user?.subscription_expires || null,
//     contacts: Number(totalContacts) || 0,
//     campaigns: Number(totalCampaigns) || 0,
//     openTickets: Number(openTickets) || 0,
//     todayMessages: Number(todayMessages) || 0,
//   };
// }

// module.exports = { getSummary };
