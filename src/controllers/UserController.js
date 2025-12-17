// src/controllers/UserController.js
const User = require('../models/User');
const db = require('../database/db'); // <-- você esqueceu isso no seu exemplo

// Controller agrupado
const UserController = { 

  // ---- REGISTRO ----
  async register(req, res) {
    const { username, email, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha obrigatórios.' });
    }

    // Validação de senha forte
    const isStrong = (
      typeof password === 'string' &&
      password.length >= 12 &&
      /[A-Z]/.test(password) &&   // maiúscula
      /[a-z]/.test(password) &&   // minúscula
      /[0-9]/.test(password) &&   // número
      /[^A-Za-z0-9]/.test(password) // símbolo
    );

    if (!isStrong) {
      return res.status(400).json({
        error: 'Senha fraca. Use pelo menos 12 caracteres com letras maiúsculas, minúsculas, números e símbolos.'
      });
    }

    try {
      const existingUser = await User.findByUsernameOrEmail(username, email);
      if (existingUser) {
        return res.status(409).json({ error: 'Usuário ou e-mail já existe.' });
      }

      await User.createTrialUser({ username, email, password });

      return res.status(201).json({ success: true });

    } catch (err) {
      console.error('Erro ao registrar:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // ---- INFO DO USUÁRIO ----
  async getUserInfo(req, res) {
    try {
      const { userId } = req.params;

      const user = await db('users')
        .where({ id: userId })
        .select('id', 'username', 'email')
        .first();

      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      return res.json(user);

    } catch (err) {
      console.error('Erro getUserInfo:', err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Dados de cobrança do usuário logado (inclui CPF)
  async getMyBilling(req, res) {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const user = await db('users')
        .where({ id: userId })
        .select('id', 'username', 'email', 'cpf')
        .first();

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        cpf: user.cpf, // pode ser null se ainda não cadastrado
      });
    } catch (err) {
      console.error('Erro getMyBilling:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

};

module.exports = UserController;

