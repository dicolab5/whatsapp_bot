//descontinuado
// src/services/pagbankAuth.js
const axios = require('axios');
const qs = require('qs');

let cachedToken = null;
let tokenExpiresAt = null;

async function getPagBankAccessToken() {
  const now = Date.now();

  // Retorna token do cache se ainda válido
  if (cachedToken && tokenExpiresAt && now < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.PAGBANK_CLIENT_ID;
  const clientSecret = process.env.PAGBANK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PAGBANK_CLIENT_ID e PAGBANK_CLIENT_SECRET precisam estar definidos no .env');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const resp = await axios.post(
      'https://api.pagseguro.com/identity/oauth/token',
      qs.stringify({ grant_type: 'client_credentials' }),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        }
      }
    );

    const { access_token, expires_in } = resp.data;

    // Salva token no cache e calcula validade
    cachedToken = access_token;
    tokenExpiresAt = now + (expires_in - 60) * 1000; // subtrai 60s para segurança

    console.log('✅ Token PagBank gerado com sucesso');

    return access_token;
  } catch (err) {
    console.error('❌ Falha ao gerar token PagBank:', err.response?.data || err.message);
    throw err;
  }
}

module.exports = { getPagBankAccessToken };


// const axios = require('axios');

// let cachedToken = null;
// let tokenExpiresAt = null;

// async function getPagBankAccessToken() {
//   const now = Date.now();

//   if (cachedToken && tokenExpiresAt && now < tokenExpiresAt) {
//     return cachedToken;
//   }

//   const clientId = process.env.PAGBANK_CLIENT_ID;
//   const clientSecret = process.env.PAGBANK_CLIENT_SECRET;

//   const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

//   try {
//     const resp = await axios.post(
//       'https://api.pagseguro.com/oauth2/token',
//       {
//         grant_type: 'client_credentials'
//       },
//       {
//         headers: {
//           Authorization: `Basic ${auth}`,
//           'Content-Type': 'application/json',
//           Accept: 'application/json'
//         },
//       }
//     );

//     const { access_token, expires_in } = resp.data;

//     cachedToken = access_token;
//     tokenExpiresAt = now + ((expires_in - 60) * 1000);

//     console.log('✅ Token PagBank gerado');

//     return access_token;
//   } catch (err) {
//     console.error('❌ Falha ao gerar token:', err.response?.data || err);
//     throw err;
//   }
// }

// module.exports = { getPagBankAccessToken };
