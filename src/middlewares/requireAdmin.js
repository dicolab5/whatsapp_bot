// src/middlewares/requireAdmin.js

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect('/login');
}

module.exports = requireAdmin;
