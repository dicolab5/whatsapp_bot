// src/routes/vendorRoutes.js corrigido para incluir userId nas operações
const express = require('express');
const Vendor = require('../models/Vendor');

const router = express.Router();

// LISTAR
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const rows = await Vendor.findAll(userId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar vendedores.' });
  }
});

// CRIAR
router.post('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { name, cpf, phone, commission_percent, active } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });

    const vendor = await Vendor.create(userId, {
      name,
      cpf,
      phone,
      commission_percent,
      active,
    });
    res.status(201).json(vendor);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar vendedor.' });
  }
});

// ATUALIZAR
router.put('/:id', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { name, cpf, phone, commission_percent, active } = req.body;

    const vendor = await Vendor.update(req.params.id, userId, {
      name,
      cpf,
      phone,
      commission_percent,
      active,
    });
    if (!vendor) return res.status(404).json({ error: 'Vendedor não encontrado.' });

    res.json(vendor);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar vendedor.' });
  }
});

// DESATIVAR (apagamento lógico)
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.session.userId;
    const vendor = await Vendor.update(req.params.id, userId, { active: false });
    if (!vendor) return res.status(404).json({ error: 'Vendedor não encontrado.' });

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desativar vendedor.' });
  }
});

module.exports = router;


// // src/routes/vendorRoutes.js
// const express = require('express');
// const Vendor = require('../models/Vendor');

// const router = express.Router();

// router.get('/', async (req, res) => {
//   try {
//     const rows = await Vendor.findAll();
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao listar vendedores.' });
//   }
// });

// router.post('/', async (req, res) => {
//   try {
//     const { name, cpf, phone, commission_percent, active } = req.body;
//     if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });

//     const vendor = await Vendor.create({ name, cpf, phone, commission_percent, active });
//     res.status(201).json(vendor);
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao criar vendedor.' });
//   }
// });

// router.put('/:id', async (req, res) => {
//   try {
//     const { name, cpf, phone, commission_percent, active } = req.body;
//     const vendor = await Vendor.update(req.params.id, { name, cpf, phone, commission_percent, active });
//     res.json(vendor);
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao atualizar vendedor.' });
//   }
// });

// router.delete('/:id', async (req, res) => {
//   try {
//     await Vendor.update(req.params.id, { active: false });
//     res.status(204).end();
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao desativar vendedor.' });
//   }
// });

// module.exports = router;
