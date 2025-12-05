// src/routes/productRoutes.js corrigido para considerar userId da sessão
const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

// LISTAR
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const rows = await Product.findAll(userId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar produtos.' });
  }
});

// CRIAR
router.post('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { name, sku, price, active } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });

    const product = await Product.create(userId, { name, sku, price, active });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar produto.' });
  }
});

// ATUALIZAR
router.put('/:id', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { name, sku, price, active } = req.body;
    const product = await Product.update(req.params.id, userId, {
      name,
      sku,
      price,
      active,
    });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar produto.' });
  }
});

// DESATIVAR / APAGAR LÓGICO
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.session.userId;
    const product = await Product.update(req.params.id, userId, { active: false });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desativar produto.' });
  }
});

module.exports = router;


// // src/routes/productRoutes.js
// const express = require('express');
// const Product = require('../models/Product');

// const router = express.Router();

// // LISTAR
// router.get('/', async (req, res) => {
//   try {
//     const rows = await Product.findAll();
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao listar produtos.' });
//   }
// });

// // CRIAR
// router.post('/', async (req, res) => {
//   try {
//     const { name, sku, price, active } = req.body;
//     if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });

//     const product = await Product.create({ name, sku, price, active });
//     res.status(201).json(product);
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao criar produto.' });
//   }
// });

// // ATUALIZAR
// router.put('/:id', async (req, res) => {
//   try {
//     const { name, sku, price, active } = req.body;
//     const product = await Product.update(req.params.id, { name, sku, price, active });
//     res.json(product);
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao atualizar produto.' });
//   }
// });

// // DESATIVAR / APAGAR LÓGICO
// router.delete('/:id', async (req, res) => {
//   try {
//     await Product.update(req.params.id, { active: false });
//     res.status(204).end();
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao desativar produto.' });
//   }
// });

// module.exports = router;
