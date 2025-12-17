// src/controllers/SummaryController.js
const Summary = require('../models/Summary');

module.exports = {
  async summary(req, res) {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ error: 'não autenticado' });

      const data = await Summary.getSummary(userId);
      res.json(data);
    } catch (err) {
      console.error('Erro em /api/summary/summary:', err);
      res.status(500).json({ error: 'Erro ao carregar resumo' });
    }
  }
};


// // src/controllers/ReportController.js
// const Report = require('../models/Summary');

// module.exports = {
//   async summary(req, res) {
//     try {
//       const userId = req.session.userId;
//       if (!userId) return res.status(401).json({ error: 'não autenticado' });

//       const data = await Report.getSummary(userId);
//       res.json(data);
//     } catch (err) {
//       console.error('Erro em /api/reports/summary:', err);
//       res.status(500).json({ error: 'Erro ao carregar resumo' });
//     }
//   }
// };
