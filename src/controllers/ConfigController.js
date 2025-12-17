// src/controllers/ConfigController.js 
const bcrypt = require('bcrypt'); 
const User = require('../models/Config');

module.exports = {

    async getProfile(req, res) {
        try {
            const user = await User.findById(req.session.userId);

            if (!user)
                return res.status(404).json({ error: "Usuário não encontrado" });

            res.json(user);
        } catch (err) {
            console.error("Erro no getProfile:", err);
            res.status(500).json({ error: "Erro ao carregar perfil" });
        }
    },

    async updateEmail(req, res) {
        if (!req.body.email)
            return res.status(400).json({ error: "Email obrigatório" });

        await User.updateEmail(req.session.userId, req.body.email);
        res.json({ success: true });
    },

    async updateFullName(req, res) {
        if (!req.body.full_name) return res.status(400).json({ error: "Nome obrigatório" });

        await User.updateFullName(req.session.userId, req.body.full_name);
        res.json({ success: true });
    },

    async updatePhone(req, res) {
        if (!req.body.phone)
            return res.status(400).json({ error: "Telefone obrigatório" });

        await User.updatePhone(req.session.userId, req.body.phone);
        res.json({ success: true });
    },

    async updateCPF(req, res) {
        if (!req.body.cpf)
            return res.status(400).json({ error: "CPF obrigatório" });

        await User.updateCPF(req.session.userId, req.body.cpf);
        res.json({ success: true });
    },

    async updatePersonal(req, res) {
        const { cpf, phone } = req.body;

        if (!cpf || !phone) {
            return res.status(400).json({ error: "CPF e Telefone obrigatórios" });
        }

        try {
            await User.updateCPF(req.session.userId, cpf);
            await User.updatePhone(req.session.userId, phone);

            res.json({ success: true });
        } catch (err) {
            console.error("Erro ao atualizar dados:", err);
            res.status(500).json({ error: "Erro ao atualizar dados" });
        }
    },

    async updatePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  // validação de senha forte
  const isStrong =
    typeof newPassword === 'string' &&
    newPassword.length >= 12 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    /[^A-Za-z0-9]/.test(newPassword);

  if (!isStrong) {
    return res.status(400).json({
      error: 'Senha fraca. Use pelo menos 12 caracteres com letras maiúsculas, minúsculas, números e símbolos.'
    });
  }

  const user = await User.getPasswordHash(req.session.userId);
  if (!user)
    return res.status(404).json({ error: "Usuário não encontrado" });

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid)
    return res.status(401).json({ error: "Senha atual incorreta" });

  const hash = await bcrypt.hash(newPassword, 10);
  await User.updatePassword(req.session.userId, hash);

  res.json({ success: true });
},
    // async updatePassword(req, res) {
    //     const { currentPassword, newPassword } = req.body;

    //     const user = await User.getPasswordHash(req.session.userId);
    //     if (!user)
    //         return res.status(404).json({ error: "Usuário não encontrado" });

    //     const valid = await bcrypt.compare(currentPassword, user.password_hash);

    //     if (!valid)
    //         return res.status(401).json({ error: "Senha atual incorreta" });

    //     const hash = await bcrypt.hash(newPassword, 10);

    //     await User.updatePassword(req.session.userId, hash);

    //     res.json({ success: true });
    // },

    async subscription(req, res) {
        const data = await User.getSubscription(req.session.userId);
        res.json(data);
    }
};
