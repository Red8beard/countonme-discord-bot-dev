const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement
require('dotenv').config();

// 🔧 CONFIGURATION ENVIRONNEMENT
const isDevelopment = process.env.NODE_ENV === 'development';
const DISCORD_TOKEN = isDevelopment ? process.env.DISCORD_TOKEN_DEV : process.env.DISCORD_TOKEN;
const CLIENT_ID = isDevelopment ? process.env.CLIENT_ID_DEV : process.env.CLIENT_ID;

console.log(`🚀 DÉPLOIEMENT MODE: ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}`);
console.log(`🤖 Client ID utilisé: ${CLIENT_ID}`);

const commands = [];

// Charger toutes les commandes depuis le dossier commands
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
                console.log(`✅ Commande chargée: ${command.data.name}`);
            } else {
                console.log(`⚠️ Commande incomplète dans ${file} - 'data' ou 'execute' manquant`);
            }
        } catch (error) {
            console.error(`❌ Erreur lors du chargement de ${file}:`, error.message);
        }
    }
} else {
    console.log('📁 Dossier commands non trouvé, aucune commande à déployer');
}

// Déployer les commandes
async function deployCommands() {
    try {
        // Vérifier que les variables d'environnement sont présentes
        if (!DISCORD_TOKEN) {
            console.error(`❌ ${isDevelopment ? 'DISCORD_TOKEN_DEV' : 'DISCORD_TOKEN'} manquant dans les variables d'environnement`);
            process.exit(1);
        }

        if (!CLIENT_ID) {
            console.error(`❌ ${isDevelopment ? 'CLIENT_ID_DEV' : 'CLIENT_ID'} manquant dans les variables d'environnement`);
            process.exit(1);
        }

        const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

        console.log(`🚀 Déploiement de ${commands.length} commande(s) slash...`);

        // Déployer les commandes globalement
        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log(`✅ ${data.length} commande(s) slash déployée(s) avec succès !`);
        
        // Afficher les commandes déployées
        data.forEach(command => {
            console.log(`   • /${command.name} - ${command.description}`);
        });

    } catch (error) {
        console.error('❌ Erreur lors du déploiement des commandes:', error);
        
        // En cas d'erreur, on continue quand même pour ne pas bloquer le déploiement
        if (process.env.NODE_ENV === 'production') {
            console.log('⚠️ Erreur ignorée en production pour permettre le démarrage du bot');
            process.exit(0);
        } else {
            process.exit(1);
        }
    }
}

// Exécuter le déploiement seulement si ce fichier est exécuté directement
if (require.main === module) {
    deployCommands();
}

module.exports = { deployCommands };
