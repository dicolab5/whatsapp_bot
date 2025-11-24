// src/controllers/AuthController.js
const AuthController = {
  login(req, res) {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'admin';
    if (username === adminUser && password === adminPass) {
      req.session.isAdmin = true;
      return res.redirect('/');
    }
    return res.redirect('/login');
  },

  logout(req, res) {
    req.session.destroy(() => res.redirect('/login'));
  }
};

module.exports = AuthController;
