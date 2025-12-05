// src/whatsapp/manager.js - Gerencia múltiplos clients WhatsApp por usuário 
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('node:fs').promises;
const path = require('node:path');
const db = require('../database/db');

const clients = new Map();  // userId → client
const clientStates = new Map();  // userId → {ready, qr}

class WhatsAppManager {
  // Pega ou cria client para userId específico
  static async getClient(userId) {
    if (!clients.has(userId)) {
      await this.createClient(userId);
    }
    return clients.get(userId);
  }

  static async createClient(userId) {
    const sessionPath = path.join('.', 'sessions', `${userId}`);
    
    const client = new Client({
      authStrategy: new LocalAuth({ dataPath: sessionPath }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      },
      // ✅ CORRIGIDO: Volta para local como seu código original
      webVersionCache: { type: 'local' }
    });

    // Eventos do client
    client.on('qr', (qr) => {
      console.log(`📱 QR user ${userId}: pronto para escanear`);
      clientStates.set(userId, { ready: false, qr });
    });

    client.on('ready', () => {
      console.log(`✅ WhatsApp user ${userId} conectado!`);
      clientStates.set(userId, { ready: true, qr: null });
    });

    client.on('disconnected', (reason) => {
      console.log(`❌ WhatsApp user ${userId} desconectado: ${reason}`);
      clientStates.set(userId, { ready: false, qr: null });
    });

    clients.set(userId, client);
    await client.initialize();
    return client;
  }

  static async resetClientSession(userId) {
    const client = clients.get(userId);

    if (client) {
      try {
        await client.destroy();
      } catch (e) {
        console.warn(`Erro ao destruir client user ${userId}:`, e.message);
      }
      clients.delete(userId);
      clientStates.delete(userId);
    }

    const sessionPath = path.join('.', 'sessions', `${userId}`);

    // pequeno delay para o Chromium liberar arquivos
    await new Promise(r => setTimeout(r, 1000));

    try {
      await fs.rm(sessionPath, { recursive: true, force: true });
      console.log(`🗑️ Sessão apagada para user ${userId}: ${sessionPath}`);
    } catch (err) {
      console.warn(`⚠️ Erro ao apagar sessão de user ${userId}:`, err.message);
    }
  }

  static async destroyClient(userId) {
    const client = clients.get(userId);
    if (client) {
      await client.destroy();
      clients.delete(userId);
      clientStates.delete(userId);
    }
  }

  static getStatus(userId) {
    return clientStates.get(userId) || { ready: false, qr: null };
  }

  static async getUserStates(userId) {
    return await db('whatsapp_user_states')
      .where({ user_id: userId, step: db.raw('> 0') })
      .select('wa_id', 'step');
  }
}

module.exports = WhatsAppManager;
