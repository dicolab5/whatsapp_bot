// src/models/Sale.js corrigido para associar vendas ao usuário
const db = require('../database/db');

const Sale = {
  async findById(id, userId) {
    return db('sales')
      .where({ id, user_id: userId })
      .first();
  },

  async createWithItems(data) {
    const userId = data.user_id;

    return db.transaction(async (trx) => {
      const subtotal = data.items.reduce(
        (sum, it) => sum + it.unit_price * it.quantity,
        0
      );
      const discount = data.discount || 0;
      const total = subtotal - discount;

      const [inserted] = await trx('sales')
        .insert({
          user_id: userId,
          ticket_id: data.ticket_id || null,
          vendor_id: data.vendor_id || null,
          customer_name: data.customer_name,
          customer_cpf: data.customer_cpf || null,
          payment_method: data.payment_method,
          subtotal,
          discount,
          total,
        })
        .returning('id');

      const saleId = inserted.id;

      const itemsToInsert = data.items.map((it) => ({
        sale_id: saleId,
        product_id: it.product_id || null,
        quantity: it.quantity,
        unit_price: it.unit_price,
        line_total: it.unit_price * it.quantity,
      }));

      await trx('sale_items').insert(itemsToInsert);

      return this.findById(saleId, userId);
    });
  },
};

module.exports = Sale;


// // src/models/Sale.js 
// const db = require('../database/db');

// const Sale = {
//   async findById(id) {
//     return db('sales').where({ id }).first();
//   },

//   async createWithItems(data) {
//     return db.transaction(async (trx) => {
//       const subtotal = data.items.reduce(
//         (sum, it) => sum + it.unit_price * it.quantity,
//         0
//       );
//       const discount = data.discount || 0;
//       const total = subtotal - discount;

//       const [inserted] = await trx('sales')
//         .insert({
//           ticket_id: data.ticket_id || null,
//           vendor_id: data.vendor_id || null,
//           customer_name: data.customer_name,
//           customer_cpf: data.customer_cpf || null,
//           payment_method: data.payment_method,
//           subtotal,
//           discount,
//           total
//         })
//         .returning('id');

//       const saleId = inserted.id;

//       const itemsToInsert = data.items.map((it) => ({
//         sale_id: saleId,
//         product_id: it.product_id,    // pode ser null por enquanto
//         quantity: it.quantity,
//         unit_price: it.unit_price,
//         line_total: it.unit_price * it.quantity
//       }));

//       await trx('sale_items').insert(itemsToInsert);

//       return this.findById(saleId);
//     });
//   }
// };

// module.exports = Sale;