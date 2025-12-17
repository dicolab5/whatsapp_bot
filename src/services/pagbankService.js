// descontinuado 
// src/services/pagbankService.js - AMBIENTE DE DESENVOLVIMENTO
const axios = require('axios');

const PAGBANK_BASE_URL = process.env.PAGBANK_BASE_URL || 'https://sandbox.api.pagseguro.com';
const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN;
const PAGBANK_API_VERSION = process.env.PAGBANK_API_VERSION || '4.0';

if (!PAGBANK_TOKEN) {
  console.warn('ATENÇÃO: PAGBANK_TOKEN não definido no .env');
}

async function createOrder({ user, plan, billing_cycle, amount }) {
  const referenceId = `user_${user.id}_${plan}_${billing_cycle}_${Date.now()}`;

  const body = {
    reference_id: referenceId,

    customer: {
      name: user.username || 'Cliente',
      email: user.email || 'no-reply@example.com',
      // CPF/CNPJ apenas com dígitos – ajuste para o nome de campo que você tiver
      tax_id: user.cpf || user.cnpj,
      phones: [
        {
          country: '55',
          area: user.phone_ddd || '11',
          number: user.phone_number || '999999999',
        },
      ],
    },

    items: [
      {
        name: `Plano ${plan} - ${billing_cycle}`,
        quantity: 1,
        unit_amount: amount * 100, // em centavos
      },
    ],

    // endereço (recomendado para boleto)
    shipping: {
      address: {
        street: user.address_street || 'Rua Exemplo',
        number: user.address_number || '123',
        complement: user.address_complement || '',
        locality: user.address_district || 'Centro',
        city: user.address_city || 'São Paulo',
        region_code: user.address_state || 'SP',
        postal_code: user.address_zip || '01001000',
        country: 'BRA',
      },
    },

    charges: [
      {
        reference_id: `charge_${referenceId}`,
        description: 'Assinatura WhatsApp Bot Manager',
        amount: {
          value: amount * 100,
          currency: 'BRL',
        },
        payment_method: {
          type: 'BOLETO',
          // opcional: campos específicos de boleto, conforme a doc
          // boleto: {
          //   due_date: '2025-12-31',
          //   instruction_lines: { line_1: 'Instrucao 1', line_2: 'Instrucao 2' },
          // },
        },
      },
    ],

    notification_urls: [
      'https://adelaida-containable-lisette.ngrok-free.dev/api/subscriptions/webhook/pagseguro',
    ],

    metadata: {
      user_id: user.id,
      plan,
      billing_cycle,
    },
  };

  //depuração===============================================================
  console.log('=== PAGBANK DEBUG - createOrder ===');
  console.log('PAGBANK_BASE_URL:', PAGBANK_BASE_URL);
  console.log('PAGBANK_API_VERSION:', PAGBANK_API_VERSION);
  console.log('PAGBANK_TOKEN prefix:', PAGBANK_TOKEN ? PAGBANK_TOKEN.slice(0, 8) : 'NULO');
  console.log('PAGBANK_TOKEN length:', PAGBANK_TOKEN ? PAGBANK_TOKEN.length : 0);
  console.log('Request URL:', `${PAGBANK_BASE_URL}/orders`);
  console.log('Request headers:', {
    Authorization: `Bearer ${PAGBANK_TOKEN ? PAGBANK_TOKEN.slice(0, 12) + '...' : 'NULO'}`,
    'x-api-version': PAGBANK_API_VERSION,
  });
  console.log('Request body (resumido):', {
    reference_id: body.reference_id,
    customer: body.customer,
    amount: body.charges?.[0]?.amount,
    payment_method: body.charges?.[0]?.payment_method,
  });
  //depuração==============================================================


  // const res = await axios.post(`${PAGBANK_BASE_URL}/orders`, body, {
  //   headers: {
  //     Authorization: `Bearer ${PAGBANK_TOKEN}`,
  //     'x-api-version': PAGBANK_API_VERSION,
  //     'Content-Type': 'application/json',
  //   },
  // });

  // const order = res.data;

  //envolvendo o axios.post para depuração
  let order;

  try {
    const res = await axios.post(`${PAGBANK_BASE_URL}/orders`, body, {
      headers: {
        Authorization: `Bearer ${PAGBANK_TOKEN}`,
        'x-api-version': PAGBANK_API_VERSION,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });

    order = res.data;
  } catch (err) {
    console.error('=== PAGBANK ERROR RESPONSE ===');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error message:', err.message);
    }
    throw err; // mantém a lógica atual
  }
  //envolvendo o axios.post para depuração

  let paymentUrl = null;

  if (order.charges && order.charges[0]) {
    const boletoLink = order.charges[0].links?.find(l => l.rel === 'PAYMENT' || l.rel === 'BOLETO');
    if (boletoLink) paymentUrl = boletoLink.href;
  }

  return {
    orderId: order.id,
    paymentUrl,
  };
}

module.exports = {
  createOrder,
};


// // src/services/pagbankService.js - AMBIENTE DE PRODUÇÃO
// // Serviço para integração com PagBank (PagSeguro) 
// // Usado para criar ordens de pagamento para assinaturas
// // Autor: Vladimir Lima Amorim
// // Data: 2024-12-03
// // PRECISO CORRIGIR O BLOCK DO CSRF E APRIMORAR PARA MAIS FORMAS DE PAGAMENTO
// const axios = require('axios');

// const PAGBANK_BASE_URL = process.env.PAGBANK_BASE_URL || 'https://api.pagbank.com.br';
// const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN;
// const PAGBANK_API_VERSION = process.env.PAGBANK_API_VERSION || '4.0';

// if (!PAGBANK_TOKEN) {
//   console.warn('ATENÇÃO: PAGBANK_TOKEN não definido no .env');
// }

// async function createOrder({ user, plan, billing_cycle, amount }) {
//   const referenceId = `user_${user.id}_${plan}_${billing_cycle}_${Date.now()}`;

//   const body = {
//     reference_id: referenceId,
//     customer: {
//       name: user.username || 'Cliente',
//       email: user.email || 'no-reply@example.com',
//     },
//     items: [
//       {
//         name: `Plano ${plan} - ${billing_cycle}`,
//         quantity: 1,
//         unit_amount: amount * 100, // R$ -> centavos
//       },
//     ],
//     charges: [
//       {
//         reference_id: `charge_${referenceId}`,
//         description: 'Assinatura WhatsApp Bot Manager',
//         amount: {
//           value: amount * 100,
//           currency: 'BRL',
//         },
//         payment_method: {
//           type: 'BOLETO', // vamos começar com boleto para simplificar
//         },
//       },
//     ],
//     notification_urls: [
//       'https://adelaida-containable-lisette.ngrok-free.dev/api/subscriptions/webhook/pagseguro',
//     ],

//     // notification_urls: [
//     //   'https://SEU_DOMINIO/api/subscriptions/webhook/pagseguro',
//     // ],
//     metadata: {
//       user_id: user.id,
//       plan,
//       billing_cycle,
//     },
//   };

//   const res = await axios.post(`${PAGBANK_BASE_URL}/orders`, body, {
//     headers: {
//       Authorization: `Bearer ${PAGBANK_TOKEN}`,
//       'x-api-version': PAGBANK_API_VERSION,
//       'Content-Type': 'application/json',
//     },
//   });

//   // Em orders, normalmente vem um link de boleto / pagamento
//   const order = res.data;
//   let paymentUrl = null;

//   if (order.charges && order.charges[0]) {
//     const boleto = order.charges[0].links?.find(l => l.rel === 'PAYMENT');
//     if (boleto) paymentUrl = boleto.href;
//   }

//   return {
//     orderId: order.id,
//     paymentUrl,
//   };
// }

// module.exports = {
//   createOrder,
// };
