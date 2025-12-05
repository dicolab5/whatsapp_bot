// src/models/Assistance.js corrigido para incluir user_id nas consultas
const db = require('../database/db');

const Assistance = {
  async findById(id, userId) {
    return db('assistances')
      .where({ id, user_id: userId })
      .first();
  },

  async findItems(assistanceId, userId) {
    return db('assistance_items as ai')
      .join('assistances as a', 'a.id', 'ai.assistance_id')
      .join('products as p', 'p.id', 'ai.product_id')
      .select('ai.*', 'p.name as product_name')
      .where('ai.assistance_id', assistanceId)
      .andWhere('a.user_id', userId);
  },

  async createWithItems(data) {
    const userId = data.user_id;

    return db.transaction(async (trx) => {
      const products_total = data.items.reduce(
        (sum, it) => sum + it.unit_price * it.quantity,
        0
      );
      const total = products_total + (data.labor_value || 0);

      const [inserted] = await trx('assistances')
        .insert({
          user_id: userId,
          ticket_id: data.ticket_id || null,
          vendor_id: data.vendor_id || null,
          customer_name: data.customer_name,
          customer_cpf: data.customer_cpf || null,
          work_description: data.work_description || null,
          labor_value: data.labor_value || 0,
          products_total,
          total,
          payment_method: data.payment_method,
        })
        .returning('id');

      const assistanceId = inserted.id;

      const itemsToInsert = data.items.map((it) => ({
        assistance_id: assistanceId,
        product_id: it.product_id,
        quantity: it.quantity,
        unit_price: it.unit_price,
        line_total: it.unit_price * it.quantity,
      }));

      if (itemsToInsert.length) {
        await trx('assistance_items').insert(itemsToInsert);
      }

      return this.findById(assistanceId, userId);
    });
  },
};

module.exports = Assistance;


// // src/models/Assistance.js 
// const db = require('../database/db');

// const Assistance = {
//   async findById(id) {
//     return db('assistances').where({ id }).first();
//   },

//   async findItems(assistanceId) {
//     return db('assistance_items as ai')
//       .join('products as p', 'p.id', 'ai.product_id')
//       .select('ai.*', 'p.name as product_name')
//       .where('ai.assistance_id', assistanceId);
//   },

//   async createWithItems(data) {
//     return db.transaction(async (trx) => {
//       const products_total = data.items.reduce(
//         (sum, it) => sum + it.unit_price * it.quantity,
//         0
//       );
//       const total = products_total + (data.labor_value || 0);

//       const [inserted] = await trx('assistances')
//         .insert({
//           ticket_id: data.ticket_id || null,
//           vendor_id: data.vendor_id || null,
//           customer_name: data.customer_name,
//           customer_cpf: data.customer_cpf || null,
//           work_description: data.work_description || null,
//           labor_value: data.labor_value || 0,
//           products_total,
//           total,
//           payment_method: data.payment_method
//         })
//         .returning('id');

//       const assistanceId = inserted.id; // pega o inteiro

//       const itemsToInsert = data.items.map((it) => ({
//         assistance_id: assistanceId,
//         product_id: it.product_id,
//         quantity: it.quantity,
//         unit_price: it.unit_price,
//         line_total: it.unit_price * it.quantity
//       }));

//       if (itemsToInsert.length) {
//         await trx('assistance_items').insert(itemsToInsert);
//       }

//       return this.findById(assistanceId);
//     });
//   }
// };

// module.exports = Assistance;
