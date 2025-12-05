// src/controllers/PromoController.js corrigido para incluir userId
const promoModel = require('../models/Promo');

async function listPromos(req, res) {
  const userId = req.session.userId;
  const promos = await promoModel.getAll(userId);
  res.json(promos);
}

async function getPromo(req, res) {
  const userId = req.session.userId;
  const promo = await promoModel.getById(req.params.id, userId);
  if (!promo) return res.status(404).json({ error: 'Promoção não encontrada' });
  res.json(promo);
}

async function createPromo(req, res) {
  const userId = req.session.userId;
  const data = {
    user_id: userId,
    title: req.body.title,
    description: req.body.description,
    active: req.body.active === true || req.body.active === 'true',
  };
  const newPromo = await promoModel.create(data);
  res.status(201).json(newPromo);
}

async function updatePromo(req, res) {
  const userId = req.session.userId;
  const id = req.params.id;

  const promoExists = await promoModel.getById(id, userId);
  if (!promoExists) return res.status(404).json({ error: 'Promoção não encontrada' });

  const updatedData = {
    title: req.body.title,
    description: req.body.description,
    active: req.body.active === true || req.body.active === 'true',
  };
  const updatedPromo = await promoModel.update(id, userId, updatedData);
  res.json(updatedPromo);
}

async function deletePromo(req, res) {
  const userId = req.session.userId;
  const id = req.params.id;

  const promoExists = await promoModel.getById(id, userId);
  if (!promoExists) return res.status(404).json({ error: 'Promoção não encontrada' });

  await promoModel.remove(id, userId);
  res.status(204).end();
}

module.exports = {
  listPromos,
  getPromo,
  createPromo,
  updatePromo,
  deletePromo,
};


// // src/controllers/PromoController.js 
// const promoModel = require('../models/Promo');

// async function listPromos(req, res) {
//   const promos = await promoModel.getAll();
//   res.json(promos);
// }

// async function getPromo(req, res) {
//   const promo = await promoModel.getById(req.params.id);
//   if (!promo) return res.status(404).json({ error: 'Promoção não encontrada' });
//   res.json(promo);
// }

// async function createPromo(req, res) {
//   const data = {
//     title: req.body.title,
//     description: req.body.description,
//     active: req.body.active === true || req.body.active === 'true',
//   };
//   const newPromo = await promoModel.create(data);
//   res.status(201).json(newPromo);
// }

// async function updatePromo(req, res) {
//   const id = req.params.id;
//   const promoExists = await promoModel.getById(id);
//   if (!promoExists) return res.status(404).json({ error: 'Promoção não encontrada' });

//   const updatedData = {
//     title: req.body.title,
//     description: req.body.description,
//     active: req.body.active === true || req.body.active === 'true',
//   };
//   const updatedPromo = await promoModel.update(id, updatedData);
//   res.json(updatedPromo);
// }

// async function deletePromo(req, res) {
//   const id = req.params.id;
//   const promoExists = await promoModel.getById(id);
//   if (!promoExists) return res.status(404).json({ error: 'Promoção não encontrada' });
//   await promoModel.remove(id);
//   res.status(204).end();
// }

// module.exports = {
//   listPromos,
//   getPromo,
//   createPromo,
//   updatePromo,
//   deletePromo,
// };
