// src/services/pagbankService.js
// Serviço para integração com PagBank (PagSeguro)
// Usado para criar ordens de pagamento para assinaturas
// Autor: Vladimir Lima Amorim
// Data: 2024-12-03
// PRECISO CORRIGIR O BLOCK DO CSRF E APRIMORAR PARA MAIS FORMAS DE PAGAMENTO
const axios = require('axios');

const PAGBANK_BASE_URL = process.env.PAGBANK_BASE_URL || 'https://api.pagbank.com.br';
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
    },
    items: [
      {
        name: `Plano ${plan} - ${billing_cycle}`,
        quantity: 1,
        unit_amount: amount * 100, // R$ -> centavos
      },
    ],
    charges: [
      {
        reference_id: `charge_${referenceId}`,
        description: 'Assinatura WhatsApp Bot Manager',
        amount: {
          value: amount * 100,
          currency: 'BRL',
        },
        payment_method: {
          type: 'BOLETO', // vamos começar com boleto para simplificar
        },
      },
    ],
    notification_urls: [
      'https://SEU_DOMINIO/api/subscriptions/webhook/pagseguro',
    ],
    metadata: {
      user_id: user.id,
      plan,
      billing_cycle,
    },
  };

  const res = await axios.post(`${PAGBANK_BASE_URL}/orders`, body, {
    headers: {
      Authorization: `Bearer ${PAGBANK_TOKEN}`,
      'x-api-version': PAGBANK_API_VERSION,
      'Content-Type': 'application/json',
    },
  });

  // Em orders, normalmente vem um link de boleto / pagamento
  const order = res.data;
  let paymentUrl = null;

  if (order.charges && order.charges[0]) {
    const boleto = order.charges[0].links?.find(l => l.rel === 'PAYMENT');
    if (boleto) paymentUrl = boleto.href;
  }

  return {
    orderId: order.id,
    paymentUrl,
  };
}

module.exports = {
  createOrder,
};
