const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const db = require('./db');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  console.log('QR code recebido, escaneie com o WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp client pronto!');
});

client.on('auth_failure', (msg) => {
  console.error('Falha na autenticação', msg);
});

client.on('disconnected', (reason) => {
  console.error('Cliente desconectado', reason);
});

async function syncContacts() {
  const contacts = await client.getContacts();

  let imported = 0;
  let skipped = 0;

  for (const c of contacts) {
    if (!c.id || !c.id._serialized) continue;

    const waId = c.id._serialized;         // 559999999999@c.us
    const number = c.number || null;
    const name = c.name || null;
    const pushName = c.pushname || null;
    const isGroup = !!c.isGroup;
    const isBusiness = !!c.isEnterprise;

    // Ignora grupos
    if (isGroup) {
      skipped++;
      continue;
    }

    // Regra de negócio: só aceita números que começam com 5524
    // (ajuste aqui se quiser outro DDD / padrão)
    if (!number || !String(number).startsWith('5524')) {
      skipped++;
      continue;
    }

    await db('whatsapp_contacts')
      .insert({
        wa_id: waId,
        number,
        name,
        push_name: pushName,
        is_group: isGroup,
        is_business: isBusiness,
        updated_at: db.fn.now()
      })
      .onConflict('wa_id')
      .merge();

    imported++;
  }

  console.log(`Sincronizados ${imported} contatos. Ignorados ${skipped} (fora do padrão 5524 ou grupos).`);
}

module.exports = {
  client,
  syncContacts
};


// // src/whatsapp.js //fincionando com duplicações
// const { Client, LocalAuth } = require('whatsapp-web.js');
// const qrcode = require('qrcode-terminal');
// const db = require('./db');

// const client = new Client({
//   authStrategy: new LocalAuth(),
//   puppeteer: {
//     headless: true,
//     args: ['--no-sandbox', '--disable-setuid-sandbox']
//   }
// });

// // Exibe QR no terminal
// client.on('qr', (qr) => {
//   console.log('QR code recebido, escaneie com o WhatsApp:');
//   qrcode.generate(qr, { small: true });
// });

// client.on('ready', () => {
//   console.log('WhatsApp client pronto!');
// });

// client.on('auth_failure', (msg) => {
//   console.error('Falha na autenticação', msg);
// });

// client.on('disconnected', (reason) => {
//   console.error('Cliente desconectado', reason);
// });

// async function syncContacts() {
//   const contacts = await client.getContacts();

//   for (const c of contacts) {
//     if (!c.id || !c.id._serialized) continue;

//     const waId = c.id._serialized;         // 559999999999@c.us
//     const number = c.number || null;
//     const name = c.name || null;
//     const pushName = c.pushname || null;
//     const isGroup = !!c.isGroup;
//     const isBusiness = !!c.isEnterprise;

//     await db('whatsapp_contacts')
//       .insert({
//         wa_id: waId,
//         number,
//         name,
//         push_name: pushName,
//         is_group: isGroup,
//         is_business: isBusiness,
//         updated_at: db.fn.now()
//       })
//       .onConflict('wa_id')
//       .merge(); // atualiza em vez de duplicar
//   }

//   console.log(`Sincronizados ${contacts.length} contatos.`);
// }

// module.exports = {
//   client,
//   syncContacts
// };


// // const { Client, LocalAuth } = require('whatsapp-web.js');
// // const qrcode = require('qrcode-terminal');
// // const db = require('./db');

// // const client = new Client({
// //   authStrategy: new LocalAuth(),
// //   puppeteer: {
// //     headless: true,
// //     args: ['--no-sandbox', '--disable-setuid-sandbox']
// //   }
// // });

// // // Exibe QR no terminal
// // client.on('qr', (qr) => {
// //   console.log('QR code recebido, escaneie com o WhatsApp:');
// //   qrcode.generate(qr, { small: true });
// // });

// // client.on('ready', () => {
// //   console.log('WhatsApp client pronto!');
// // });

// // client.on('auth_failure', (msg) => {
// //   console.error('Falha na autenticação', msg);
// // });

// // client.on('disconnected', (reason) => {
// //   console.error('Cliente desconectado', reason);
// // });

// // async function syncContacts() {
// //   const contacts = await client.getContacts();

// //   for (const c of contacts) {
// //     if (!c.id || !c.id._serialized) continue;

// //     const waId = c.id._serialized;         // 559999999999@c.us
// //     const number = c.number || null;
// //     const name = c.name || null;
// //     const pushName = c.pushname || null;
// //     const isGroup = !!c.isGroup;
// //     const isBusiness = !!c.isEnterprise;

// //     await db('whatsapp_contacts')
// //       .insert({
// //         wa_id: waId,
// //         number,
// //         name,
// //         push_name: pushName,
// //         is_group: isGroup,
// //         is_business: isBusiness,
// //         updated_at: db.fn.now()
// //       })
// //       .onConflict('wa_id')
// //       .merge();
// //   }

// //   console.log(`Sincronizados ${contacts.length} contatos.`);
// // }

// // // Opcional: marcar opt_in true para quem já falou com você por TI, etc.
// // // Você pode criar lógicas adicionais para opt_in conforme seu fluxo de loja.

// // module.exports = {
// //   client,
// //   syncContacts
// // };
