// src/routes/userRoutes.js
const express = require('express');
const UserController = require('../controllers/UserController');
const router = express.Router();

// Registro (público)
router.post('/register', UserController.register);

// Retorna dados do usuário logado
router.get('/info/:userId', UserController.getUserInfo);

module.exports = router;


// // src/routes/userRoutes.js
// const express = require('express');
// const UserController = require('../controllers/UserController');
// const db = require("../database/db");

// const router = express.Router();

// // Registrar usuário — já existe
// router.post('/register', UserController.register);

// // Novo endpoint: user info
// router.get('/info/:userId', async (req, res) => {
//   const { userId } = req.params;

//   const user = await db("users")
//     .where({ id: userId })
//     .first();

//   res.json({
//     id: user?.id,
//     name: user?.name
//   });
// });

// module.exports = router;


// // // src/routes/userRoutes.js
// // const express = require('express');
// // const UserController = require('../controllers/UserController');
// // const router = express.Router();

// // router.post('/register', UserController.register);

// // module.exports = router;
