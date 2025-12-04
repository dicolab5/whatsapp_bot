// src/whatsapp/utils.js 
function normalizeText(text) {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isGreeting(text) {
  const t = normalizeText(text);
  const greetings = [
    'oi', 'ola', 'ola!', 'ola.', 'bom dia', 'boa tarde', 'boa noite',
    'eai', 'e ai', 'opa', 'fala', 'salve'
  ];
  return greetings.some(g => t === g || t.startsWith(g));
}

function isOptOut(text) {
  const t = normalizeText(text);
  return t === 'sair' || t === 'parar';
}

function normalizeWaId(raw) {
  return raw;
}

module.exports = {
  normalizeText,
  isGreeting,
  isOptOut,
  normalizeWaId,
};
