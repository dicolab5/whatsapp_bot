// src/controllers/ReportController.js corrigido para filtrar por usuário
const db = require('../database/db');

const ReportController = {
  async getReport(req, res) {
    try {
      const userId = req.session.userId;
      const { dataInicio, dataFim, tipo, pagamento, vendedor, cpf } = req.query;

      // VENDAS do usuário
      let queryVendas = db('sales as s')
        .leftJoin('vendors as v', function () {
          this.on('v.id', '=', 's.vendor_id')
              .andOn('v.user_id', '=', 's.user_id');
        })
        .select(
          's.id',
          db.raw("'venda' as tipo"),
          's.customer_name',
          's.customer_cpf',
          'v.name as vendor_name',
          's.total',
          's.payment_method',
          's.sale_date as data'
        )
        .where('s.user_id', userId);

      if (dataInicio && dataFim) {
        queryVendas.whereBetween('s.sale_date', [
          dataInicio + ' 00:00:00',
          dataFim + ' 23:59:59',
        ]);
      }
      if (pagamento) queryVendas.where('s.payment_method', pagamento);
      if (vendedor) queryVendas.where('s.vendor_id', vendedor);
      if (cpf) queryVendas.where('s.customer_cpf', 'like', `%${cpf}%`);

      // ASSISTÊNCIAS do usuário
      let queryAssist = db('assistances as a')
        .leftJoin('vendors as v', function () {
          this.on('v.id', '=', 'a.vendor_id')
              .andOn('v.user_id', '=', 'a.user_id');
        })
        .select(
          'a.id',
          db.raw("'assistencia' as tipo"),
          'a.customer_name',
          'a.customer_cpf',
          'v.name as vendor_name',
          'a.total',
          'a.payment_method',
          'a.closed_at as data'
        )
        .where('a.user_id', userId);

      if (dataInicio && dataFim) {
        queryAssist.whereBetween('a.closed_at', [
          dataInicio + ' 00:00:00',
          dataFim + ' 23:59:59',
        ]);
      }
      if (pagamento) queryAssist.where('a.payment_method', pagamento);
      if (vendedor) queryAssist.where('a.vendor_id', vendedor);
      if (cpf) queryAssist.where('a.customer_cpf', 'like', `%${cpf}%`);

      let registros = [];
      if (!tipo || tipo === 'venda') {
        const vendas = await queryVendas;
        registros = registros.concat(vendas);
      }
      if (!tipo || tipo === 'assistencia') {
        const assistencias = await queryAssist;
        registros = registros.concat(assistencias);
      }

      const totalGeral = registros.reduce((sum, r) => sum + Number(r.total), 0);
      const totalVendas = registros
        .filter((r) => r.tipo === 'venda')
        .reduce((sum, r) => sum + Number(r.total), 0);
      const totalAssistencias = registros
        .filter((r) => r.tipo === 'assistencia')
        .reduce((sum, r) => sum + Number(r.total), 0);
      const ticketMedio = registros.length > 0 ? totalGeral / registros.length : 0;

      const pagamentosCount = {};
      const tiposCount = { Vendas: 0, Assistências: 0 };

      registros.forEach((r) => {
        const pm = r.payment_method || 'Não informado';
        pagamentosCount[pm] = (pagamentosCount[pm] || 0) + Number(r.total);

        if (r.tipo === 'venda') tiposCount.Vendas += Number(r.total);
        else tiposCount.Assistências += Number(r.total);
      });

      res.json({
        resumo: {
          totalGeral,
          totalVendas,
          totalAssistencias,
          ticketMedio,
        },
        graficos: {
          pagamento: pagamentosCount,
          tipo: tiposCount,
        },
        registros,
      });
    } catch (err) {
      console.error('Erro no relatório:', err);
      res.status(500).json({ error: 'Erro ao gerar relatório.' });
    }
  },
};

module.exports = ReportController;


// // src/controllers/ReportController.js 
// const db = require('../database/db');

// const ReportController = {
//   async getReport(req, res) {
//     try {
//       const { dataInicio, dataFim, tipo, pagamento, vendedor, cpf } = req.query;

//       // Query vendas
//       let queryVendas = db('sales as s')
//         .leftJoin('vendors as v', 'v.id', 's.vendor_id')
//         .select(
//           's.id', 
//           db.raw("'venda' as tipo"),
//           's.customer_name',
//           's.customer_cpf',
//           'v.name as vendor_name',
//           's.total',
//           's.payment_method',
//           's.sale_date as data'
//         );

//       if (dataInicio && dataFim) {
//         queryVendas.whereBetween('s.sale_date', [dataInicio + ' 00:00:00', dataFim + ' 23:59:59']);
//       }
//       if (pagamento) queryVendas.where('s.payment_method', pagamento);
//       if (vendedor) queryVendas.where('s.vendor_id', vendedor);
//       if (cpf) queryVendas.where('s.customer_cpf', 'like', `%${cpf}%`);

//       // Query assistências
//       let queryAssist = db('assistances as a')
//         .leftJoin('vendors as v', 'v.id', 'a.vendor_id')
//         .select(
//           'a.id',
//           db.raw("'assistencia' as tipo"),
//           'a.customer_name',
//           'a.customer_cpf',
//           'v.name as vendor_name',
//           'a.total',
//           'a.payment_method',
//           'a.closed_at as data'
//         );

//       if (dataInicio && dataFim) {
//         queryAssist.whereBetween('a.closed_at', [dataInicio + ' 00:00:00', dataFim + ' 23:59:59']);
//       }
//       if (pagamento) queryAssist.where('a.payment_method', pagamento);
//       if (vendedor) queryAssist.where('a.vendor_id', vendedor);
//       if (cpf) queryAssist.where('a.customer_cpf', 'like', `%${cpf}%`);

//       let registros = [];
//       if (!tipo || tipo === 'venda') {
//         const vendas = await queryVendas;
//         registros = registros.concat(vendas);
//       }
//       if (!tipo || tipo === 'assistencia') {
//         const assistencias = await queryAssist;
//         registros = registros.concat(assistencias);
//       }

//       // Resumo
//       const totalGeral = registros.reduce((sum, r) => sum + Number(r.total), 0);
//       const totalVendas = registros
//         .filter(r => r.tipo === 'venda')
//         .reduce((sum, r) => sum + Number(r.total), 0);
//       const totalAssistencias = registros
//         .filter(r => r.tipo === 'assistencia')
//         .reduce((sum, r) => sum + Number(r.total), 0);
//       const ticketMedio = registros.length > 0 ? totalGeral / registros.length : 0;

//       // Gráficos
//       const pagamentosCount = {};
//       const tiposCount = { Vendas: 0, Assistências: 0 };

//       registros.forEach(r => {
//         const pm = r.payment_method || 'Não informado';
//         pagamentosCount[pm] = (pagamentosCount[pm] || 0) + Number(r.total);

//         if (r.tipo === 'venda') tiposCount.Vendas += Number(r.total);
//         else tiposCount.Assistências += Number(r.total);
//       });

//       res.json({
//         resumo: {
//           totalGeral,
//           totalVendas,
//           totalAssistencias,
//           ticketMedio
//         },
//         graficos: {
//           pagamento: pagamentosCount,
//           tipo: tiposCount
//         },
//         registros
//       });
//     } catch (err) {
//       console.error('Erro no relatório:', err);
//       res.status(500).json({ error: 'Erro ao gerar relatório.' });
//     }
//   }
// };

// module.exports = ReportController;
