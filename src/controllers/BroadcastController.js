// src/controllers/BroadcastController.js corrigido para associar user_id 
const multer = require('multer');
const path = require('path');
const { createAndSendBroadcast } = require('../services/broadcastService');
const { layout } = require('../utils/layout');
const db = require('../database/db');

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../../public/img'));
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const sanitized = file.originalname.replace(/\s+/g, '-').toLowerCase();
      cb(null, `${timestamp}-${sanitized}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/^image\/(jpeg|png|jpg)$/)) {
      return cb(new Error('Apenas imagens JPG e PNG são permitidas.'));
    }
    cb(null, true);
  }
});

// Lista campanhas do usuário logado
async function list(req, res) {
  try {
    const userId = req.session.userId;
    const broadcasts = await db('whatsapp_broadcasts')
      .select('id', 'name', 'message', 'image_url')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    res.json(broadcasts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Cria + envia campanha nova, sempre com user_id
async function sendNewCampaign({ userId, name, message, imageUrl, filters, contactIds }) {
  return await createAndSendBroadcast({
    userId,
    name,
    message,
    imageUrl,
    filters,
    contactIds,
  });
}

// Reenvia campanha existente do próprio usuário
async function sendExistingCampaign({ userId, broadcastId, filters, contactIds }) {
  const broadcast = await db('whatsapp_broadcasts')
    .select('id', 'name', 'message', 'image_url')
    .where({ id: broadcastId, user_id: userId })
    .first();

  if (!broadcast) throw new Error('Campanha salva não encontrada.');

  return await createAndSendBroadcast({
    userId,
    name: broadcast.name,
    message: broadcast.message,
    imageUrl: broadcast.image_url,
    filters,
    contactIds,
    reuseBroadcastId: broadcast.id,
  });
}

const send = [
  upload.single('image'),
  async (req, res) => {
    try {
      const userId = req.session.userId;
      const { name, message, onlyOptIn, contactIds, action, broadcastId } = req.body;

      let idsArray = [];
      if (contactIds) {
        idsArray = contactIds
          .split(',')
          .map(id => parseInt(id, 10))
          .filter(n => !isNaN(n));
      }

      let result;

      if (action === 'save_send') {
        const imageUrl = req.file ? `img/${req.file.filename}` : null;

        result = await sendNewCampaign({
          userId,
          name,
          message,
          imageUrl,
          filters: { onlyOptIn: !!onlyOptIn },
          contactIds: idsArray,
        });
      } else if (action === 'send_only') {
        if (!broadcastId) throw new Error('Selecione uma campanha salva para reutilizar.');

        result = await sendExistingCampaign({
          userId,
          broadcastId: Number(broadcastId), //antes apenas broadcastId
          filters: { onlyOptIn: !!onlyOptIn },
          contactIds: idsArray,
        });
      } else {
        throw new Error('Ação inválida');
      }

      const content = `
        <div class="alert alert-success">
          <h4>Campanha enviada com sucesso!</h4>
          <p>ID da campanha: ${result.broadcastId}</p>
          <p>Mensagens enviadas: ${result.sentCount}</p>
          <a href="/broadcast" class="btn btn-primary">Voltar</a>
        </div>
      `;
      res.send(layout({ title: 'Campanha enviada', content }));
    } catch (err) {
      const content = `
        <div class="alert alert-danger">
          <h4>Erro ao enviar campanha</h4>
          <p>${err.message}</p>
          <a href="/broadcast" class="btn btn-primary">Voltar</a>
        </div>
      `;
      res.status(500).send(layout({ title: 'Erro', content }));
    }
  },
];

module.exports = { send, list };


// // // // // src/controllers/BroadcastController.js 
// const multer = require('multer');
// const path = require('path');
// const { createAndSendBroadcast } = require('../services/broadcastService');
// const { layout } = require('../utils/layout');
// const db = require('../database/db'); // Para acessar o banco diretamente

// // Configuração multer para upload de imagem na pasta public/img
// const upload = multer({
//   storage: multer.diskStorage({
//     destination: (req, file, cb) => {
//       cb(null, path.join(__dirname, '../../public/img'));
//     },
//     filename: (req, file, cb) => {
//       const timestamp = Date.now();
//       const sanitized = file.originalname.replace(/\s+/g, '-').toLowerCase();
//       cb(null, `${timestamp}-${sanitized}`);
//     }
//   }),
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
//   fileFilter: (req, file, cb) => {
//     if (!file.mimetype.match(/^image\/(jpeg|png|jpg)$/)) {
//       return cb(new Error('Apenas imagens JPG e PNG são permitidas.'));
//     }
//     cb(null, true);
//   }
// });

// // Função para listar campanhas salvas no banco, retorna JSON
// async function list(req, res) {
//   try {
//     const broadcasts = await db('whatsapp_broadcasts')
//       .select('id', 'name', 'message', 'image_url')
//       .orderBy('created_at', 'desc');
//     res.json(broadcasts);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// }

// // Envia nova campanha salvando no banco
// async function sendNewCampaign({ name, message, imageUrl, filters, contactIds }) {
//   return await createAndSendBroadcast({ name, message, imageUrl, filters, contactIds });
// }

// // Envia campanha já salva, só faz o envio sem salvar
// async function sendExistingCampaign({ broadcastId, filters, contactIds }) {
//   const broadcast = await db('whatsapp_broadcasts')
//     .select('name', 'message', 'image_url')
//     .where('id', broadcastId)
//     .first();

//   if (!broadcast) throw new Error('Campanha salva não encontrada.');

//   return await createAndSendBroadcast({
//     name: broadcast.name,
//     message: broadcast.message,
//     imageUrl: broadcast.image_url,
//     filters,
//     contactIds,
//     reuseBroadcastId: broadcastId // IMPORTANTE: evita novo salvamento, reutiliza o registro
//   });
// }

// const send = [
//   upload.single('image'),
//   async (req, res) => {
//     try {
//       const { name, message, onlyOptIn, contactIds, action, broadcastId } = req.body;

//       let idsArray = [];
//       if (contactIds) {
//         //idsArray = contactIds.split(',').map(id => parseInt(id, 10)).filter(n => !isNaN(n));
//         idsArray = contactIds.split(',').map(id => parseInt(id, 10)).filter(n => !isNaN(n));
//       }

//       let result;

//       if (action === 'save_send') {
//         // Usa a imagem do upload, se houver
//         const imageUrl = req.file ? `img/${req.file.filename}` : null;

//         result = await sendNewCampaign({
//           name,
//           message,
//           imageUrl,
//           filters: { onlyOptIn: !!onlyOptIn },
//           contactIds: idsArray
//         });
//       } else if (action === 'send_only') {
//         if (!broadcastId) throw new Error('Selecione uma campanha salva para reutilizar.');

//         result = await sendExistingCampaign({
//           broadcastId,
//           filters: { onlyOptIn: !!onlyOptIn },
//           contactIds: idsArray
//         });
//       } else {
//         throw new Error('Ação inválida');
//       }

//       const content = `
//         <div class="alert alert-success">
//           <h4>Campanha enviada com sucesso!</h4>
//           <p>ID da campanha: ${result.broadcastId}</p>
//           <p>Mensagens enviadas: ${result.sentCount}</p>
//           <a href="/broadcast" class="btn btn-primary">Voltar</a>
//         </div>
//       `;
//       res.send(layout({ title: 'Campanha enviada', content }));
//     } catch (err) {
//       const content = `
//         <div class="alert alert-danger">
//           <h4>Erro ao enviar campanha</h4>
//           <p>${err.message}</p>
//           <a href="/broadcast" class="btn btn-primary">Voltar</a>
//         </div>
//       `;
//       res.status(500).send(layout({ title: 'Erro', content }));
//     }
//   }
// ];

// module.exports = {
//   send,
//   list
// };

