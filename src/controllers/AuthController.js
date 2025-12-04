// src/controllers/AuthController.js
const bcrypt = require("bcrypt");
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('../database/db');

const AuthController = {
  async login(req, res) {
    const { username, password, token } = req.body;

    try {
      // Se tem token, é verificação 2FA
      if (token && req.session.awaiting2FA) {
        const userId = req.session.awaiting2FA;
        const user = await db('users').where('id', userId).first();
        
        if (!user.two_factor_secret || !user.two_factor_enabled) {
          return res.redirect('/login?error=2fa_disabled');
        }

        const verified = speakeasy.totp.verify({
          secret: user.two_factor_secret,
          encoding: 'base32',
          token: token,
          window: 1
        });

        if (verified) {
          req.session.awaiting2FA = null;
          delete req.session.awaiting2FA;
          
          // VERIFICAÇÃO DE PLANO para não-admins
          if (!user.is_admin) {
            if (user.account_type !== 'free' && 
                (!user.subscription_expires || new Date(user.subscription_expires) < new Date())) {
              return res.redirect('/login?error=expired');
            }
            req.session.accountType = user.account_type;
            req.session.billingCycle = user.billing_cycle;
            req.session.subscriptionExpires = user.subscription_expires;
          }
          
          req.session.isAdmin = user.is_admin;
          req.session.userId = user.id;
          return res.redirect('/painel');
        } else {
          return res.redirect('/login?error=invalid_token');
        }
      }

      // // Login normal (senha) simples (sem debug)
      // const user = await db('users').where('username', username).first();
      // if (!user || !await bcrypt.compare(password, user.password_hash)) {
      //   return res.redirect('/login?error=invalid');
      // }

      // req.session.userId = user.id;

      // Login normal (senha) com debug completo
      const user = await db('users').where('username', username).first();
      console.log('🔍 LOGIN DEBUG:');
      console.log('  → username:', username);
      console.log(' → id do usuário buscado:', user ? user.id : 'NÃO ENCONTRADO');
      console.log('  → user encontrado:', !!user);
      if (user) {
        console.log('  → user.two_factor_enabled:', user.two_factor_enabled);
        console.log('  → user.two_factor_secret:', user.two_factor_secret ? 'EXISTE (' + user.two_factor_secret.length + ' chars)' : 'NULL');
        console.log('  → user.is_admin:', user.is_admin);
      }

      if (!user || !await bcrypt.compare(password, user.password_hash)) {
        console.log('❌ Login falhou: credenciais inválidas');
        return res.redirect('/login?error=invalid');
      }

      req.session.userId = user.id;

      // // 2FA obrigatório, se estiver ativado (simples)
      // if (user.two_factor_enabled && user.two_factor_secret) {
      //   req.session.awaiting2FA = user.id;
      //   return res.redirect('/login?2fa=required');
      // }

      // 2FA obrigatório, se estiver ativado - com debug
      console.log('  → Verificando 2FA obrigatório...');
      if (user.two_factor_enabled && user.two_factor_secret) {
        console.log('✅ 2FA DETECTADO! Salvando awaiting2FA');
        req.session.awaiting2FA = user.id;
        return res.redirect('/login?2fa=required');
      }
      console.log('❌ 2FA NÃO detectado no login');

      // Login completo - VERIFICAÇÃO DE PLANO
      if (!user.is_admin) {
        if (user.account_type !== 'free' && 
            (!user.subscription_expires || new Date(user.subscription_expires) < new Date())) {
          return res.redirect('/login?error=expired');
        }
        req.session.accountType = user.account_type;
        req.session.billingCycle = user.billing_cycle;
        req.session.subscriptionExpires = user.subscription_expires;
      }

      req.session.isAdmin = user.is_admin;
      return res.redirect('/painel');

    } catch (err) {
      console.error('Login error:', err);
      return res.redirect('/login?error=server');
    }
  },

  // -------------------------------------------------------------------
  // AGORA QUALQUER USUÁRIO AUTENTICADO PODE USAR O 2FA
  // -------------------------------------------------------------------

  async enable2FA(req, res) {
    try {
      if (!req.session.userId)
        return res.status(401).json({ error: 'Unauthorized' });

      const secret = speakeasy.generateSecret({
        name: `Chatbot Manager (${process.env.APP_URL || 'localhost:3000'})`,
        issuer: 'Chatbot Manager TI',
        length: 20
      });

      await db('users')
        .where('id', req.session.userId)
        .update({
          two_factor_secret: secret.base32,
          two_factor_enabled: false
        });

      const qrDataURL = await QRCode.toDataURL(secret.otpauth_url);
      
      res.json({ 
        secret: secret.base32, 
        qrCode: qrDataURL,
        otpauth_url: secret.otpauth_url 
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

// DEBUG COMPLETO DA VERIFICAÇÃO 2FA
//   async verify2FA(req, res) {
//   try {
//     if (!req.session.userId)
//       return res.status(401).json({ error: 'Unauthorized' });

//     const { token } = req.body;  // ← FRONT ENVIA 'code', mas backend espera 'token'
    
//     // ========================================
//     // DEBUG COMPLETO - VEJA NO CONSOLE
//     // ========================================
//     console.log('🔍 2FA DEBUG INICIADO:');
//     console.log('  → userId:', req.session.userId);
//     console.log('  → token recebido:', token, '(length:', token?.length || 0, ')');
//     console.log('  → typeof token:', typeof token);
    
//     const user = await db('users').where('id', req.session.userId).first();
//     console.log('  → user.two_factor_secret:', user.two_factor_secret);
//     console.log('  → secret length:', user.two_factor_secret?.length || 0);
//     console.log('  → two_factor_enabled:', user.two_factor_enabled);
    
//     if (!user.two_factor_secret) {
//       console.log('❌ ERRO: Sem secret no banco!');
//       return res.status(400).json({ error: 'Sem secret configurado' });
//     }

//     const verified = speakeasy.totp.verify({
//       secret: user.two_factor_secret,
//       encoding: 'base32',
//       token: token || '',  // ← Garante que token não é undefined
//       window: 1
//     });

//     console.log('  → speakeasy.verify result:', verified);
//     console.log('  → base32 valid?', speakeasy.generateSecret({ length: 20 }).base32 === user.two_factor_secret ? 'SIM' : 'NÃO');
//     console.log('🔍 FIM DEBUG 2FA\n');

//     if (verified) {
//       await db('users')
//         .where('id', req.session.userId)
//         .update({ two_factor_enabled: true });

//       console.log('✅ 2FA ATIVADO com sucesso!');
//       res.json({ success: true });
//     } else {
//       // GERA CÓDIGO ATUAL PARA COMPARAR
//       const expectedToken = speakeasy.totp({
//         secret: user.two_factor_secret,
//         encoding: 'base32'
//       });
//       console.log('  → CÓDIGO ESPERADO AGORA:', expectedToken);
      
//       res.status(400).json({ 
//         error: 'Código inválido', 
//         debug: {
//           received: token,
//           expected: expectedToken,
//           secret_preview: user.two_factor_secret.substring(0, 8) + '...'
//         }
//       });
//     }
//   } catch (err) {
//     console.error('💥 ERRO verify2FA:', err);
//     res.status(500).json({ error: err.message });
//   }
// },

//verificação 2fa corrigida sem debug
async verify2FA(req, res) {
  try {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });

    const { token } = req.body;
    const user = await db('users').where('id', req.session.userId).first();

    if (!user.two_factor_secret) {
      return res.status(400).json({ error: 'Sem secret configurado' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token || '',
      window: 1
    });

    if (verified) {
      await db('users')
        .where('id', req.session.userId)
        .update({ two_factor_enabled: true });
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Código inválido' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
},


  async disable2FA(req, res) {
    try {
      if (!req.session.userId)
        return res.status(401).json({ error: 'Unauthorized' });

      await db('users')
        .where('id', req.session.userId)
        .update({
          two_factor_enabled: false,
          two_factor_secret: null
        });
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  logout(req, res) {
    req.session.destroy(() => res.redirect('/login'));
  }
};

module.exports = AuthController;