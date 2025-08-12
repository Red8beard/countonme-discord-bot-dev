/**
 * DÉPLOIEMENT COMMANDES SLASH - MODE SERVEUR SPÉCIFIQUE (instantané)
 * 
 * Ce script déploie les commandes sur UN serveur spécifique uniquement.
 * Avantage: Les commandes apparaissent IMMÉDIATEMENT (pas de délai)
 * 
 * Usage:
 * 1. Remplacez GUILD_ID par l'ID de votre serveur Discord de test
 * 2. npm run dev:deploy-guild
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// 🔧 CONFIGURATION ENVIRONNEMENT
const isDevelopment = process.env.NODE_ENV === 'development';
const DISCORD_TOKEN = isDevelopment ? process.env.DISCORD_TOKEN_DEV : process.env.DISCORD_TOKEN;
const CLIENT_ID = isDevelopment ? process.env.CLIENT_ID_DEV : process.env.CLIENT_ID;

// 🎯 ID DE VOTRE SERVEUR DE TEST (remplacez par le vrai ID)
const GUILD_ID = '1114538904180232213';

console.log(`🚀 DÉPLOIEMENT MODE: ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}`);
console.log(`🎯 Déploiement sur serveur: ${GUILD_ID}`);
console.log(`🤖 Client ID utilisé: ${CLIENT_ID}`);

async function deployGuildCommands() {
    const commands = [];
    const foldersPath = path.join(__dirname, 'commands');
    
    if (!fs.existsSync(foldersPath)) {
        console.error('❌ Dossier commands/ introuvable');
        return;
    }

    const commandFiles = fs.readdirSync(foldersPath).filter(file => 
        file.endsWith('.js') && !file.startsWith('_')
    );

    for (const file of commandFiles) {
        const filePath = path.join(foldersPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            console.log(`✅ Commande chargée: ${command.data.name}`);
        } else {
            console.log(`⚠️ Commande incomplète dans ${file} - 'data' ou 'execute' manquant`);
        }
    }

    if (!DISCORD_TOKEN || !CLIENT_ID) {
        console.error('❌ DISCORD_TOKEN ou CLIENT_ID manquant');
        console.error(`Token présent: ${DISCORD_TOKEN ? 'OUI' : 'NON'}`);
        console.error(`Client ID présent: ${CLIENT_ID ? 'OUI' : 'NON'}`);
        return;
    }

    const rest = new REST().setToken(DISCORD_TOKEN);

    try {
        console.log(`🚀 Déploiement de ${commands.length} commande(s) slash sur le serveur...`);

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log(`✅ ${commands.length} commandes déployées avec succès sur le serveur !`);
        console.log('🎉 Les commandes sont maintenant disponibles IMMÉDIATEMENT sur votre serveur');

    } catch (error) {
        console.error('❌ Erreur lors du déploiement des commandes:', error);
        
        if (error.code === 50001) {
            console.error('💡 Le bot n\'a pas accès à ce serveur ou GUILD_ID incorrect');
        }
        if (error.code === 0) {
            console.error('💡 Token invalide ou permissions insuffisantes');
        }
    }
}

if (GUILD_ID === 'VOTRE_GUILD_ID_ICI') {
    console.error('❌ Veuillez remplacer GUILD_ID par l\'ID de votre serveur Discord de test');
    console.error('💡 Clic droit sur votre serveur → Copier l\'identifiant du serveur');
} else {
    deployGuildCommands();
}
