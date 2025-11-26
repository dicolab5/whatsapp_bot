// // src/whatsapp/maintenanceHandler.js
const db = require('../database/db');
const { client } = require('./client');
const { normalizeWaId } = require('./utils');

const pendingMaintenanceUsers = {};

// Inicia fluxo da opção 4: envia lista de tópicos para o usuário escolher
async function handleMaintenanceSchedule(from) {
    const waId = normalizeWaId(from);
    const topics = await db('whatsapp_topics')
        .where({ active: true })
        .orderBy('sort_order', 'asc')
        .orderBy('id', 'asc');

    if (!topics.length) {
        await client.sendMessage(from, 'No momento não há tópicos de serviço cadastrados. Tente novamente mais tarde.');
        return;
    }

    // Inicializa estado com lista de tópicos para mostrar
    pendingMaintenanceUsers[waId] = { step: 1, data: { topicsList: topics } };

    let text = 'Escolha o tipo de serviço:\n\n';
    topics.forEach((t, i) => {
        text += `${i + 1}️⃣ ${t.name}\n`;
    });
    text += '\nResponda com o número da opção desejada.';

    await client.sendMessage(from, text);
}

// Função para processar próximos passos após escolha inicial
async function processMaintenanceStep(msg) {
    const waId = normalizeWaId(msg.from);
    const userState = pendingMaintenanceUsers[waId];
    if (!userState) return;

    const body = (msg.body || '').trim();
    const normalized = body.toLowerCase();

    // Permitir cancelar a qualquer momento
    if (normalized === 'cancelar') {
        delete pendingMaintenanceUsers[waId];
        await client.sendMessage(waId, 'Agendamento cancelado. Para iniciar novamente, envie "4".');
        return;
    }

    if (userState.step === 1) {
        // Escolha do tópico
        const choice = parseInt(body);
        const topics = userState.data.topicsList || [];

        if (isNaN(choice) || choice < 1 || choice > topics.length) {
            await client.sendMessage(waId, 'Opção inválida. Responda com o número de um dos tópicos listados.');
            return;
        }

        const chosenTopic = topics[choice - 1];
        userState.data.topicId = chosenTopic.id;
        userState.data.topicName = chosenTopic.name;
        userState.step = 2;

        // Buscar serviços relacionados ao tópico
        const services = await db('whatsapp_topic_services')
            .where({ topic_id: chosenTopic.id, active: true })
            .orderBy('sort_order', 'asc')
            .orderBy('id', 'asc');

        if (!services.length) {
            await client.sendMessage(waId, 'Não há tipos de serviço cadastrados para este tópico. Tente outro ou fale com um atendente.');
            delete pendingMaintenanceUsers[waId];
            return;
        }

        userState.data.servicesList = services;

        let text = `Você escolheu: ${chosenTopic.name}.\n\nAgora escolha o tipo de serviço:\n\n`;
        services.forEach((s, i) => {
            const label = s.service_type === 'instalacao' ? 'Instalação' : 'Manutenção';
            text += `${i + 1}️⃣ ${label}\n`;
        });
        text += '\nResponda com o número da opção desejada.';
        await client.sendMessage(waId, text);

    } else if (userState.step === 2) {
        // Escolha entre instalação / manutenção
        const choice = parseInt(body);
        const services = userState.data.servicesList || [];

        if (isNaN(choice) || choice < 1 || choice > services.length) {
            await client.sendMessage(waId, 'Opção inválida. Responda com o número de um dos serviços listados.');
            return;
        }

        const chosenService = services[choice - 1];
        userState.data.serviceType = chosenService.service_type; // 'instalacao' ou 'manutencao'
        userState.step = 3;

        await client.sendMessage(waId, 'Perfeito! Agora vamos aos dados do agendamento.\nInforme a data desejada (ex: 25/11):');

    } else if (userState.step >= 3) {
        // Fluxo padrão de perguntas: data, período, endereço, cidade, descrição, confirmação
        const servLabel = userState.data.serviceType === 'instalacao' ? 'Instalação' : 'Manutenção';
        switch (userState.step) {
            case 3:
                userState.data.date = body;
                userState.step = 4;
                await client.sendMessage(waId, 'Informe o período (manhã ou tarde):');
                break;
            case 4:
                userState.data.period = body;
                userState.step = 5;
                await client.sendMessage(waId, 'Informe o endereço completo: (rua, número, complemento e bairro)');
                break;
            case 5:
                userState.data.address = body;
                userState.step = 6;
                await client.sendMessage(waId, 'Informe a cidade:');
                break;
            case 6:
                userState.data.city = body;
                if (userState.data.serviceType === 'manutencao') {
                    userState.step = 7;
                    await client.sendMessage(waId, 'Descreva o problema:');
                } else {
                    // instalação não precisa de descrição, pula direto para confirmação
                    userState.step = 8;
                    const resumo =
                        `Confirme os dados do agendamento:\n\n` +
                        `Tópico: ${userState.data.topicName}\n` +
                        `Tipo de serviço: ${servLabel}\n` +
                        `Data: ${userState.data.date}\n` +
                        `Período: ${userState.data.period}\n` +
                        `Endereço: ${userState.data.address}\n` +
                        `Cidade: ${userState.data.city}\n\n` +
                        `Responda "sim" para confirmar ou "não" para cancelar.`;
                    await client.sendMessage(waId, resumo);
                }
                break;

            case 7:
                userState.data.description = body;
                userState.step = 8;
                const resumoManutencao =
                    `Confirme os dados do agendamento:\n\n` +
                    `Tópico: ${userState.data.topicName}\n` +
                    `Tipo de serviço: ${servLabel}\n` +
                    `Data: ${userState.data.date}\n` +
                    `Período: ${userState.data.period}\n` +
                    `Endereço: ${userState.data.address}\n` +
                    `Cidade: ${userState.data.city}\n` +
                    `Descrição: ${userState.data.description}\n\n` +
                    `Responda "sim" para confirmar ou "não" para cancelar.`;
                await client.sendMessage(waId, resumoManutencao);
                break;
            case 8:
                if (normalized === 'sim') {
                    const contact = await db('whatsapp_contacts').where({ wa_id: waId }).first();
                    await db('maintenance_requests').insert({
                        contact_id: contact ? contact.id : null,
                        wa_id: waId,
                        raw_message: 'Atendimento agendado via WhatsApp',
                        date: userState.data.date,
                        period: userState.data.period,
                        address: userState.data.address,
                        city: userState.data.city,
                        description: userState.data.description,
                        status: 'pending'
                    });

                    delete pendingMaintenanceUsers[waId];
                    await client.sendMessage(waId, 'Agendamento registrado! Um atendente irá confirmar em breve.');
                } else if (normalized === 'não' || normalized === 'nao') {
                    delete pendingMaintenanceUsers[waId];
                    await client.sendMessage(waId, 'Agendamento cancelado. Para iniciar novamente, envie "4".');
                } else {
                    await client.sendMessage(waId, 'Resposta inválida. Por favor, responda "sim" para confirmar ou "não" para cancelar.');
                }
                break;
        }
    }
}

module.exports = {
    pendingMaintenanceUsers,
    handleMaintenanceSchedule,
    processMaintenanceStep
};


