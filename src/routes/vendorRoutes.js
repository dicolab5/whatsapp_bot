// src/routes/vendorRoutes.js
const express = require('express');
const Vendor = require('../models/Vendor');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const rows = await Vendor.findAll();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar vendedores.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, cpf, phone, commission_percent, active } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });

    const vendor = await Vendor.create({ name, cpf, phone, commission_percent, active });
    res.status(201).json(vendor);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar vendedor.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, cpf, phone, commission_percent, active } = req.body;
    const vendor = await Vendor.update(req.params.id, { name, cpf, phone, commission_percent, active });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar vendedor.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Vendor.update(req.params.id, { active: false });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desativar vendedor.' });
  }
});

module.exports = router;
