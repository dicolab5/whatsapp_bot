// src/controllers/TicketController.js  corrigido para associar tickets ao usuário
const Ticket = require('../models/Ticket');
const Maintenance = require('../models/Maintenance');
const { layout } = require('../utils/layout');

const TicketController = {
  async listHuman(req, res) {
    const userId = req.session.userId;
    const humanQueue = await Ticket.findHumanQueue(userId);
    res.json(humanQueue);
  },

  async resolveHuman(req, res) {
    try {
      const userId = req.session.userId;
      await Ticket.resolveHuman(req.params.id, userId);
      res.redirect(`/api/tickets/${req.params.id}/resolve-human`);
    } catch (err) {
      res.status(500).send(`Erro: ${err.message}`);
    }
  },

  async resolveHumanPage(req, res) {
    try {
      const content = `
        <div class="alert alert-success">
          <h4>Atendimento marcado como resolvido!</h4>
          <a href="/tickets" class="btn btn-primary">Voltar</a>
        </div>`;
      res.send(layout({ title: 'Sucesso', content }));
    } catch (err) {
      res.status(500).send('Erro ao exibir a página de feedback.');
    }
  },

  async listMaintenance(req, res) {
    const userId = req.session.userId;
    const maintenance = await Maintenance.findPending(userId);
    res.json(maintenance);
  },

  async resolveMaintenance(req, res) {
    try {
      const userId = req.session.userId;
      await Maintenance.resolve(req.params.id, userId);
      res.redirect(`/api/tickets/${req.params.id}/resolve-maintenance`);
    } catch (err) {
      res.status(500).send(`Erro: ${err.message}`);
    }
  },

  async resolveMaintenancePage(req, res) {
    try {
      const content = `
        <div class="alert alert-success">
          <h4>Manutenção marcado como resolvida!</h4>
          <a href="/tickets" class="btn btn-primary">Voltar</a>
        </div>`;
      res.send(layout({ title: 'Sucesso', content }));
    } catch (err) {
      res.status(500).send('Erro ao exibir a página de feedback.');
    }
  },
};

module.exports = TicketController;


// // src/controllers/TicketController.js  
// const Ticket = require('../models/Ticket');
// const Maintenance = require('../models/Maintenance');
// const { layout } = require('../utils/layout');

// const TicketController = {
//   // Fila humana
//   async listHuman(req, res) {
//     const humanQueue = await Ticket.findHumanQueue();
//     res.json(humanQueue);
//   },

//   // POST que realiza a ação e redireciona para página de feedback
//   async resolveHuman(req, res) {
//     try {
//       await Ticket.resolveHuman(req.params.id);
//       res.redirect(`/api/tickets/${req.params.id}/resolve-human`);
//     } catch (err) {
//       res.status(500).send(`Erro: ${err.message}`);
//     }
//   },

//   // Página de feedback para atendimento resolvido
//   async resolveHumanPage(req, res) {
//     try {
//       const content = `
//         <div class="alert alert-success">
//           <h4>Atendimento marcado como resolvido!</h4>
//           <a href="/tickets" class="btn btn-primary">Voltar</a>
//         </div>`;
//       res.send(layout({ title: 'Sucesso', content }));
//     } catch (err) {
//       res.status(500).send('Erro ao exibir a página de feedback.');
//     }
//   },

//   // Solicitações de manutenção
//   async listMaintenance(req, res) {
//     const maintenance = await Maintenance.findPending();
//     res.json(maintenance);
//   },

//   // POST que realiza a ação e redireciona para página de feedback
//   async resolveMaintenance(req, res) {
//     try {
//       await Maintenance.resolve(req.params.id);
//       res.redirect(`/api/tickets/${req.params.id}/resolve-maintenance`);
//     } catch (err) {
//       res.status(500).send(`Erro: ${err.message}`);
//     }
//   },

//   // Página de feedback para manutenção resolvida
//   async resolveMaintenancePage(req, res) {
//     try {
//       const content = `
//         <div class="alert alert-success">
//           <h4>Manutenção marcada como resolvida!</h4>
//           <a href="/tickets" class="btn btn-primary">Voltar</a>
//         </div>`;
//       res.send(layout({ title: 'Sucesso', content }));
//     } catch (err) {
//       res.status(500).send('Erro ao exibir a página de feedback.');
//     }
//   }
// };

// module.exports = TicketController;
