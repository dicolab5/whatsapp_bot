// src/controllers/BroadcastController.js
const { createAndSendBroadcast } = require('../services/broadcastService');
const { layout } = require('../utils/layout');

const BroadcastController = {
  // async send(req, res) {
  //   const { name, message, onlyOptIn, contactIds } = req.body;
  //   let idsArray = [];
  //   if (contactIds) {
  //     idsArray = contactIds.split(',').map(id => parseInt(id, 10)).filter(n => !isNaN(n));
  //   }
  //   try {
  //     const result = await createAndSendBroadcast({
  //       name,
  //       message,
  //       filters: { onlyOptIn: !!onlyOptIn },
  //       contactIds: idsArray
  //     });
  //     res.json(result);
  //   } catch (err) {
  //     res.status(500).json({ error: err.message });
  //   }
  // }


  async send(req, res) {
    const { name, message, onlyOptIn, contactIds } = req.body;
    let idsArray = [];
    if (contactIds) {
      idsArray = contactIds.split(',').map(id => parseInt(id, 10)).filter(n => !isNaN(n));
    }
    try {
      const result = await createAndSendBroadcast({
        name,
        message,
        filters: { onlyOptIn: !!onlyOptIn },
        contactIds: idsArray
      });

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
  }

};

module.exports = BroadcastController;
