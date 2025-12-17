// src/services/pixGenerator.js
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

// Normalização
function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const PIX_KEY = process.env.PIX_KEY || '';
const PIX_NAME = removeAccents((process.env.PIX_NAME || 'NOME'))
  .toUpperCase()
  .slice(0, 25);
const PIX_CITY = removeAccents((process.env.PIX_CITY || 'SAO PAULO'))
  .toUpperCase()
  .slice(0, 15);

/**
 * TLV helper
 */
function tlv(id, value) {
  const len = Buffer.byteLength(String(value), 'utf8');
  return `${id}${String(len).padStart(2, '0')}${value}`;
}

/**
 * CRC16-CCITT (XMODEM)
 */
function crc16xmodem(buf) {
  let crc = 0xFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formata amount (BRL)
 */
function formatAmount(v) {
  if (v === undefined || v === null) return null;
  const num = Number(v);
  if (Number.isNaN(num)) return null;
  return num.toFixed(2);
}

/**
 * Gera payload PIX CORRETO (compatível Febraban/BCB)
 */
async function buildPixPayload(opts = {}) {
  const pixKey = opts.pixKey || PIX_KEY;
  if (!pixKey) throw new Error('PIX_KEY é obrigatória');

  const merchantName = removeAccents(
    (opts.merchantName || PIX_NAME)
  ).toUpperCase().slice(0, 25);

  const merchantCity = removeAccents(
    (opts.merchantCity || PIX_CITY)
  ).toUpperCase().slice(0, 15);

  const amount = formatAmount(opts.amount);

  // 🟢 TXID CORRIGIDO — máximo 25 chars e sem espaços
  let txid = (opts.txid || '').trim();
  if (!txid) txid = '*';
  txid = txid.replace(/[^A-Za-z0-9\-\.]/g, '').slice(0, 25);

  // 🟢 PONTO DE INICIAÇÃO
  const pointMethod = opts.pointMethod === '11' ? '11' : '12'; // 12 = dinâmico, 11 = estático

  const payloadParts = [];

  payloadParts.push(tlv('00', '01'));       // Format Indicator
  payloadParts.push(tlv('01', pointMethod)); // POI Method

  // 🟢 26 - Merchant Account Information (CORRIGIDO)
  const gui = tlv('00', 'BR.GOV.BCB.PIX');
  const chaveTag = tlv('01', pixKey);

  const merchantInfo = gui + chaveTag;
  payloadParts.push(tlv('26', merchantInfo));

  payloadParts.push(tlv('52', '0000')); // MCC
  payloadParts.push(tlv('53', '986'));  // BRL

  // Valor opcional
  if (amount) payloadParts.push(tlv('54', amount));

  payloadParts.push(tlv('58', 'BR'));           // Country
  payloadParts.push(tlv('59', merchantName));  // Merchant Name
  payloadParts.push(tlv('60', merchantCity));  // Merchant City

  // 🟢 62 - Additional Data (TXID obrigatório)
  const addData = tlv('05', txid);
  payloadParts.push(tlv('62', addData));

  // Monta payload sem CRC
  const payloadSemCrc = payloadParts.join('');

  // Calcula CRC
  const dataForCRC = payloadSemCrc + '6304';
  const crc = crc16xmodem(dataForCRC);

  return dataForCRC + crc;
}

/**
 * Cria TXID seguro e válido e gera QR
 */
async function generatePix({
  amount,
  txid = null,
  merchantName = null,
  merchantCity = null
} = {}) {

  // 🟢 TXID automático válido (máx 25 chars)
  let generatedTxid = txid;
  if (!generatedTxid) {
    const raw = uuidv4().replace(/-/g, '');
    generatedTxid = `TX${raw}`.slice(0, 25);
  }

  const payload = await buildPixPayload({
    amount,
    pixKey: PIX_KEY,
    merchantName,
    merchantCity,
    txid: generatedTxid
  });

  const qrCodeImage = await QRCode.toDataURL(payload);

  return {
    txid: generatedTxid,
    payload,
    qrCodeImage
  };
}

module.exports = {
  buildPixPayload,
  generatePix,
  crc16xmodem
};
