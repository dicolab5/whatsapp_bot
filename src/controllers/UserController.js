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

    try {
      const existingUser = await User.findByUsernameOrEmail(username, email);
      if (existingUser) {
        return res.status(409).json({ error: 'Usuário ou e-mail já existe.' });
      }

      // Cria usuário com trial PRO
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
  }

};

module.exports = UserController;

