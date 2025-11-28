// src/controllers/AuthController.js
const bcrypt = require("bcrypt");

const AuthController = {
  async login(req, res) {
    const { username, password } = req.body;

    const adminUser = process.env.ADMIN_USER;
    const adminPassHash = process.env.ADMIN_PASS_HASH;

    // Se o usuário tiver errado o nome de usuário
    if (username !== adminUser) {
      return res.redirect('/login');
    }

    // Compara a senha informada com o hash no .env
    const isMatch = await bcrypt.compare(password, adminPassHash);

    if (!isMatch) {
      return res.redirect('/login');
    }

    // Login válido
    req.session.isAdmin = true;
    return res.redirect('/painel');
  },

  logout(req, res) {
    req.session.destroy(() => res.redirect('/'));
  }
};

module.exports = AuthController;


// // src/controllers/AuthController.js
// const AuthController = {
//   login(req, res) {
//     const { username, password } = req.body;
//     const adminUser = process.env.ADMIN_USER || 'admin';
//     const adminPass = process.env.ADMIN_PASS || 'admin';
//     if (username === adminUser && password === adminPass) {
//       req.session.isAdmin = true;
//       return res.redirect('/painel');
//     }
//     return res.redirect('/login');
//   },

//   logout(req, res) {
//     req.session.destroy(() => res.redirect('/')); //antes estva /login
//   }
// };

// module.exports = AuthController;
