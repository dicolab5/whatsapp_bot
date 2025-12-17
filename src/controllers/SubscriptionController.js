// src/controllers/SubscriptionController.js 
const Subscription = require('../models/Subscription');
const { generatePix } = require('../services/pixGenerator');

module.exports = {
    async createCheckout(req, res) {
        try {
            const userId = req.session?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            const { plan, billing_cycle, fullName, cpf, email } = req.body;

            if (!fullName || !cpf || !email) {
                return res.status(400).json({ error: 'Dados do cliente faltando' });
            }

            const pricing = {
                starter: { monthly: 1, annual: 1 * 12 }, // valores de teste R$1,00
                professional: { monthly: 499, annual: 499 * 12 },
                enterprise: { monthly: 899, annual: 899 * 12 }
            };

            if (!pricing[plan]) {
                return res.status(400).json({ error: 'Plano inválido' });
            }

            const amount = pricing[plan][billing_cycle];
            if (!amount) {
                return res.status(400).json({ error: 'Ciclo inválido' });
            }

            // 🟢 gerar pix COM SEU GERADOR
            const pix = await generatePix({
                amount
            });

            // 🟢 salvar tudo no BD
            await Subscription.create({
                user_id: userId,
                plan,
                billing_cycle,
                amount,
                txid: pix.txid,
                payload: pix.payload,
                full_name: fullName,
                cpf,
                email,
                created_at: new Date(),
                start_date: new Date()
            });

            // 🟢 retornar QR
            return res.json({
                success: true,
                amount,
                txid: pix.txid,
                payload: pix.payload,
                qrCodeImage: pix.qrCodeImage
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao gerar pagamento PIX' });
        }
    },

    async getStatusByTxid(req, res) {
        try {
            const userId = req.session?.userId;
            if (!userId) return res.status(401).json({ ok: false, error: 'Usuário não autenticado' });

            const txid = String(req.query.txid || '').trim();
            if (!txid) return res.status(400).json({ ok: false, error: 'txid obrigatório' });

            const sub = await Subscription.findByTxid(txid);
            if (!sub) return res.status(404).json({ ok: false, error: 'txid não encontrado' });

            // segurança: impede consultar txid de outro usuário
            if (Number(sub.user_id) !== Number(userId)) return res.sendStatus(403);

            return res.json({ ok: true, txid, status: sub.status });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ ok: false, error: 'Erro ao consultar status' });
        }
    },


    async manualConfirm(req, res) {
        try {
            if (!req.session?.isAdmin) {
                return res.status(403).json({ error: 'Acesso negado' });
            }

            const { txid } = req.body;
            if (!txid) return res.status(400).json({ error: 'txid obrigatório' });

            await Subscription.updateStatus(txid, 'paid');

            return res.json({ success: true });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Erro ao confirmar pagamento' });
        }
    }
};
