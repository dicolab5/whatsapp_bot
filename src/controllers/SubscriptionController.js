//em desenvolvimento, necessita ajustes
// src/controllers/SubscriptionController.js
const db = require('../database/db');
const { createOrder } = require('../services/pagbankService');

// Valores em centavos ou reais, conforme você for integrar com o PagSeguro
const PLAN_PRICES = {
    starter: 199,
    professional: 499,
    enterprise: 899,
};

async function createCheckoutOnPagSeguro({ user, plan, billing_cycle, amount }) {
    // amount já está em reais (199, 499, 899)
    const { orderId, paymentUrl } = await createOrder({
        user,
        plan,
        billing_cycle,
        amount,
    });

    return {
        paymentUrl,
        gatewayId: orderId,
    };
}

module.exports = {
    // POST /api/subscriptions/checkout
    async createCheckout(req, res) {
        try {
            // para debug remover depois de resolvido
            console.log('--- CSRF DEBUG /api/subscriptions/checkout ---');
            console.log('Cookie _csrf:', req.cookies?._csrf);
            console.log('Header CSRF-Token:', req.headers['csrf-token']);

            const userId = req.session.userId;
            const { plan, billing_cycle = 'monthly' } = req.body;

            if (!['starter', 'professional', 'enterprise'].includes(plan)) {
                return res.status(400).json({ error: 'Plano inválido.' });
            }
            if (!['monthly', 'annual'].includes(billing_cycle)) {
                return res.status(400).json({ error: 'Ciclo inválido.' });
            }

            const user = await db('users')
                .where({ id: userId })
                .select('id', 'username', 'email')
                .first();
            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado.' });
            }

            const amount = PLAN_PRICES[plan];

            const { paymentUrl, gatewayId } = await createCheckoutOnPagSeguro({
                user,
                plan,
                billing_cycle,
                amount,
            });

            // Opcional: criar uma linha "pending" em subscriptions agora
            await db('subscriptions').insert({
                user_id: userId,
                plan,
                billing_cycle,
                amount,
                start_date: new Date(),      // pode ser ajustado depois no webhook
                expires_date: new Date(),    // idem
                status: 'pending',
                payment_method: null,
                payment_id: gatewayId,
                created_at: db.fn.now(),
            });

            return res.json({ paymentUrl });
        } catch (err) {
            console.error('Erro em createCheckout:', err);
            return res.status(500).json({ error: 'Erro ao criar checkout.' });
        }
    },

    // POST /api/subscriptions/webhook/pagseguro
    async pagSeguroWebhook(req, res) {
        try {
            const event = req.body; // PagBank envia JSON com "order" dentro

            if (!event || !event.order) {
                return res.status(400).json({ error: 'Payload inválido' });
            }

            const order = event.order;
            const metadata = order.metadata || {};
            const userId = metadata.user_id;
            const plan = metadata.plan;
            const billing_cycle = metadata.billing_cycle || 'monthly';

            const charge = (order.charges && order.charges[0]) || null;
            if (!userId || !plan || !charge) {
                return res.status(400).json({ error: 'Metadados insuficientes' });
            }

            const status = charge.status;              // e.g. "PAID", "DECLINED", "CANCELED"
            const paymentId = charge.id;              // id da cobrança (charge_id)
            const amountCents = charge.amount?.value || 0;
            const amount = amountCents / 100;

            if (status === 'PAID') {
                const now = new Date();
                const expires = new Date(now);

                if (billing_cycle === 'monthly') {
                    expires.setMonth(expires.getMonth() + 1);
                } else {
                    expires.setFullYear(expires.getFullYear() + 1);
                }

                // Atualiza usuário
                await db('users')
                    .where({ id: userId })
                    .update({
                        account_type: plan,
                        billing_cycle,
                        subscription_expires: expires,
                        updated_at: db.fn.now(),
                    });

                // Registra assinatura ativa
                await db('subscriptions').insert({
                    user_id: userId,
                    plan,
                    billing_cycle,
                    amount,
                    start_date: now,
                    expires_date: expires,
                    status: 'active',
                    payment_method: 'pagbank',
                    payment_id: paymentId,
                    created_at: db.fn.now(),
                });
            } else if (status === 'CANCELED' || status === 'DECLINED') {
                await db('subscriptions')
                    .where({ payment_id: paymentId })
                    .update({ status: 'canceled' });
            }

            res.sendStatus(200);
        } catch (err) {
            console.error('Erro no webhook PagSeguro:', err);
            res.sendStatus(500);
        }
    }

};
