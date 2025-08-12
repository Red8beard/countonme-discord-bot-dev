/**
 * 🎲 COUNTONME - BOT DISCORD DE COMPTAGE V2.2
 * 
 * PHILOSOPHIE: Focus sur les statistiques des joueurs plutôt que le comptage global
 * - Système de scoring personnel
 * - Trophées hebdomadaires  
 * - Rôles temporaires amusants pour les erreurs
 * - Messages encourageants et drôles
 * - Persistance totale des données
 * 
 * VERSION 2.2: Système hebdomadaire + Rôles temporaires + Rôles gagnant
 */

require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const DatabaseDirect = require('./db_final.js');

// 🔧 CONFIGURATION ENVIRONNEMENT
const isDevelopment = process.env.NODE_ENV === 'development';
const DISCORD_TOKEN = isDevelopment ? process.env.DISCORD_TOKEN_DEV : process.env.DISCORD_TOKEN;
const CLIENT_ID = isDevelopment ? process.env.CLIENT_ID_DEV : process.env.CLIENT_ID;

console.log(`🚀 MODE: ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}`);
console.log(`🤖 Token utilisé: ${DISCORD_TOKEN ? '***' + DISCORD_TOKEN.slice(-4) : 'NON DÉFINI'}`);
console.log(`🆔 Client ID utilisé: ${CLIENT_ID || 'NON DÉFINI'}`);
console.log(`🔍 DEBUG - NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔍 DEBUG - DISCORD_TOKEN_DEV présent: ${process.env.DISCORD_TOKEN_DEV ? 'OUI' : 'NON'}`);
console.log(`🔍 DEBUG - CLIENT_ID_DEV présent: ${process.env.CLIENT_ID_DEV ? 'OUI' : 'NON'}`);

// Configuration du client Discord avec tous les intents nécessaires
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Initialisation des commandes
client.commands = new Collection();

// Initialisation sécurisée de la base de données SQLite
try {
  console.log('🔄 Initialisation de la base de données SQLite...');
  client.database = new DatabaseDirect();
  console.log('✅ Base de données SQLite initialisée avec succès');
} catch (error) {
  console.error('❌ Erreur lors de l\'initialisation de la DB SQLite:', error.message);
  console.log('⚠️ Utilisation du fallback mocké');
  
  // Créer un objet minimal
  client.database = {
    getOrCreateServer: function(guildId) { 
      console.log(`[DB Fallback] Getting server: ${guildId}`);
      return Promise.resolve({ guild_id: guildId, current_number: 0 }); 
    },
    updateCurrentNumber: function() { return Promise.resolve(1); },
    resetCounter: function() { return Promise.resolve(1); }
  };
}

// Messages encourageants pour les bons comptages
const encouragementMessages = [
    "🎉 Parfait ! Tu es en feu ! 🔥",
    "✨ Excellent ! Continue comme ça ! ⭐",
    "🚀 Incroyable ! Tu voles vers les sommets ! 🏔️",
    "🎯 Dans le mille ! Tu es un as du comptage ! 🎪",
    "💎 Magnifique ! Pur diamant ce comptage ! ✨",
    "🌟 Fantastique ! Tu illumines le chat ! 💫",
    "🎊 Bravo ! Tu es un champion ! 🏆",
    "⚡ Électrisant ! Tu as la foudre dans les doigts ! ⚡",
    "🎭 Spectaculaire ! Digne d'un grand spectacle ! 🎪",
    "🎨 Artistique ! Ce nombre est une œuvre d'art ! 🖼️"
];

// Messages drôles pour les erreurs
const errorMessages = [
    "🤦‍♂️ Oups ! Les maths, c'est pas ton fort ! 📚😅",
    "🙈 Aïe ! Quelqu'un a oublié de compter sur ses doigts ! ✋",
    "🤡 Oh là là ! Même une calculatrice aurait mieux fait ! 🧮",
    "🎭 Plot twist ! Les chiffres ne sont pas optionnels ! 🔢",
    "🚨 ALERTE ! Détection d'une allergie aux mathématiques ! 🤧",
    "🎪 Ta-daa ! Magie noire... mais ça marche pas ici ! ✨❌",
    "🕵️ Enquête : qui a volé ton cerveau mathématique ? 🧠💸",
    "🎬 Cut ! Cette prise n'était pas la bonne ! 🎥",
    "🎯 Raté ! Tu visais le 10, tu as touché le 3 ! 🏹",
    "🎲 Coup de malchance ! Les dés étaient pipés ! 🎰"
];

// Messages pour les rôles temporaires (punitions amusantes)
const shameRoleMessages = [
    "🎭 Tu reçois le titre honorifique de **'{ROLE_NAME}'** ! 🏅😅",
    "👑 Félicitations ! Tu es maintenant **'{ROLE_NAME}'** ! 🎉😂",
    "🎪 Mesdames et messieurs, voici notre **'{ROLE_NAME}'** ! 📢",
    "🏆 Prix spécial décerné : **'{ROLE_NAME}'** ! 🥇😆",
    "🎨 Nouveau look pour toi : **'{ROLE_NAME}'** ! ✨🎭",
    "🎯 Mission accomplie ! Tu es maintenant **'{ROLE_NAME}'** ! 🎊",
    "🎬 Nouveau rôle au casting : **'{ROLE_NAME}'** ! 🎞️",
    "🎪 Entrez dans l'arène, notre **'{ROLE_NAME}'** ! 🎺"
];

// Système de gestion des messages unique (anti-duplication absolue)
const processedMessages = new Set();
const messageTimestamps = new Map();

// Fonction utilitaire pour nettoyer les caches
function cleanupCaches() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [messageId, timestamp] of messageTimestamps) {
        if (now - timestamp > maxAge) {
            processedMessages.delete(messageId);
            messageTimestamps.delete(messageId);
        }
    }
}

// Nettoyage automatique toutes les 5 minutes
setInterval(cleanupCaches, 5 * 60 * 1000);

// Charger les commandes depuis le dossier commands
function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    if (!fs.existsSync(commandsPath)) {
        console.log('📁 Dossier commands non trouvé, création...');
        fs.mkdirSync(commandsPath);
        return;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Commande chargée: ${command.data.name}`);
            } else {
                console.log(`⚠️ Commande incomplète dans ${file}`);
            }
        } catch (error) {
            console.error(`❌ Erreur lors du chargement de ${file}:`, error);
        }
    }
}

// Enregistrer les commandes sur Discord
async function registerCommands() {
    const { REST, Routes } = require('discord.js');
    
    console.log(`🔍 DEBUG registerCommands() - DISCORD_TOKEN: ${DISCORD_TOKEN ? '***' + DISCORD_TOKEN.slice(-4) : 'NON DÉFINI'}`);
    console.log(`🔍 DEBUG registerCommands() - CLIENT_ID: ${CLIENT_ID || 'NON DÉFINI'}`);
    
    const commands = [];
    client.commands.forEach(command => {
        commands.push(command.data.toJSON());
    });
    
    const rest = new REST().setToken(DISCORD_TOKEN);
    
    try {
        console.log('🔄 Enregistrement des commandes sur Discord...');
        
        // Enregistrer globalement (prend ~1h pour être actif partout)
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        
        console.log(`✅ ${commands.length} commandes enregistrées globalement`);
        
        // En développement, aussi enregistrer sur le serveur de test pour tests immédiats
        if (isDevelopment && process.env.TEST_GUILD_ID) {
            try {
                await rest.put(
                    Routes.applicationGuildCommands(CLIENT_ID, process.env.TEST_GUILD_ID),
                    { body: commands }
                );
                console.log(`🚀 Commandes aussi enregistrées sur le serveur de test (instantané)`);
            } catch (testError) {
                console.log('⚠️ Enregistrement serveur test échoué (pas grave):', testError.message);
            }
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement des commandes:', error);
    }
}

// EVENT: Bot prêt
client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} est connecté et prêt !`);
    console.log(`� VERSION INDEX.JS: v2.2 - RÔLES TEMPORAIRES COMPLETS`);
    console.log(`�📊 Présent sur ${client.guilds.cache.size} serveur(s)`);
    
    // Charger les commandes
    loadCommands();
    
    // Enregistrer les commandes sur Discord
    await registerCommands();
    
    // Définir le statut du bot
    client.user.setActivity('compter avec vous ! 🔢', { type: 'PLAYING' });
    
    // Démarrer le système de trophées hebdomadaires
    startWeeklyTrophySystem();
    
    // Nettoyer les rôles temporaires expirés
    await cleanupExpiredRoles();
    
    console.log('🏆 Système de trophées hebdomadaires activé');
    console.log('🧹 Nettoyage des rôles temporaires effectué');
});

// EVENT: Message créé (coeur du système de comptage)
client.on('messageCreate', async message => {
    // Filtres de base
    if (message.author.bot || message.partial || !message.guild) return;
    
    // Anti-duplication stricte
    const messageId = message.id;
    console.log(`🔍 [DEBUG] Message reçu ID: ${messageId}, contenu: "${message.content}"`);
    
    if (processedMessages.has(messageId)) {
        console.log(`⚠️ [DEBUG] Message déjà traité, ignoré: ${messageId}`);
        return; // Message déjà traité
    }
    
    // Marquer le message comme traité
    processedMessages.add(messageId);
    messageTimestamps.set(messageId, Date.now());
    console.log(`✅ [DEBUG] Message marqué comme traité: ${messageId}`);
    
    try {
        await handleCountingMessage(message);
    } catch (error) {
        console.error('Erreur lors du traitement du message:', error);
        // En cas d'erreur, on retire le message du cache pour permettre un nouveau traitement
        processedMessages.delete(messageId);
        messageTimestamps.delete(messageId);
    }
});

// Fonction principale de gestion du comptage
async function handleCountingMessage(message) {
    const database = client.database;
    const guildId = message.guild.id;
    const userId = message.author.id;
    
    // Récupérer les données du serveur
    const serverData = await database.getOrCreateServer(guildId);
    
    // Vérifier si c'est dans le bon canal (si configuré)
    if (serverData.counting_channel_id && message.channel.id !== serverData.counting_channel_id) {
        return;
    }
    
    // Extraire le nombre du message
    const messageContent = message.content.trim();
    const numberMatch = messageContent.match(/^\d+/);
    if (!numberMatch) return; // Pas un nombre
    
    const number = parseInt(numberMatch[0]);
    if (isNaN(number)) return;
    
    const expectedNumber = serverData.current_number + 1;
    
    // Récupérer ou créer les stats du joueur
    const playerStats = await database.getOrCreatePlayerStats(guildId, userId);
    
    console.log(`🎯 ${message.author.username}: ${number} (attendu: ${expectedNumber}, current: ${serverData.current_number}, lastUser: ${serverData.last_user_id})`);
    
    // LOGIQUE DE COMPTAGE
    if (number === expectedNumber) {
        // ✅ COMPTAGE CORRECT
        console.log(`✅ Comptage correct détecté`);
        await handleCorrectCount(message, database, guildId, userId, number, playerStats);
    } else if (number === 1 && serverData.current_number > 0) {
        // 🔄 RESET VOLONTAIRE - Vérifier si c'est abusif
        console.log(`🔄 Reset volontaire détecté`);
        
        // Si c'est le même utilisateur que précédemment = ERREUR (anti-spam)
        if (serverData.last_user_id === userId) {
            console.log(`❌ Reset abusif détecté - même utilisateur`);
            await handleCountingError(message, database, guildId, userId, number, expectedNumber, playerStats);
            return;
        }
        
        // Si on était déjà à 1 = ERREUR (pas de vrai reset)
        if (serverData.current_number === 1) {
            console.log(`❌ Reset abusif détecté - déjà à 1`);
            await handleCountingError(message, database, guildId, userId, number, expectedNumber, playerStats);
            return;
        }
        
        // Sinon, reset volontaire légitimé
        await handleVoluntaryReset(message, database, guildId, userId, playerStats);
    } else {
        // ❌ ERREUR DE COMPTAGE
        console.log(`❌ Erreur de comptage détectée`);
        await handleCountingError(message, database, guildId, userId, number, expectedNumber, playerStats);
    }
}

// Gestion d'un comptage correct
async function handleCorrectCount(message, database, guildId, userId, number, playerStats) {
    // Vérifier si c'est le même utilisateur que précédemment
    const serverData = await database.getOrCreateServer(guildId);
    
    console.log(`🔍 Double comptage check: userId=${userId}, lastUserId=${serverData.last_user_id}`);
    
    if (serverData.last_user_id === userId) {
        // Double comptage - considéré comme une erreur
        console.log(`🚨 Double comptage détecté !`);
        await handleCountingError(message, database, guildId, userId, number, number, playerStats, "double comptage");
        return;
    }
    
    console.log(`✅ Comptage valide, mise à jour...`);
    
    // Mettre à jour le compteur du serveur
    await database.updateCurrentNumber(guildId, number, userId);
    
    // Mettre à jour les stats du joueur
    await database.incrementPlayerCorrectCounts(guildId, userId);
    await database.updatePlayerHighestNumber(guildId, userId, number);
    
    // Ajouter à l'historique
    await database.addCountHistory(guildId, userId, number, message.id);
    
    // Réaction de succès
    await message.react('✅');
    
    // Message d'encouragement occasionnel (1 chance sur 5 pour les nombres > 10)
    if (number > 10 && Math.random() < 0.2) {
        const encouragement = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
        await message.reply(`${encouragement} (Score: ${number})`);
    }
    
    // Milestone spéciaux
    if ([10, 25, 50, 100, 250, 500, 1000].includes(number)) {
        await message.reply(`🎊 **MILESTONE ${number}** atteint ! Bravo ${message.author} ! 🎉`);
    }
}

// Gestion d'un reset volontaire
async function handleVoluntaryReset(message, database, guildId, userId, playerStats) {
    const serverData = await database.getOrCreateServer(guildId);
    const oldNumber = serverData.current_number;
    
    // Reset du compteur à 0, puis mettre à 1
    await database.resetCounter(guildId);
    await database.updateCurrentNumber(guildId, 1, userId);
    
    // ⚠️ CHANGEMENT: On ne donne PLUS de points pour un reset volontaire
    // Les resets ne sont pas des bonnes réponses, juste des redémarrages
    
    // Ajouter à l'historique (comme événement de reset, pas comme bonne réponse)
    await database.addCountHistory(guildId, userId, 1, message.id);
    
    // Réaction de reset
    await message.react('🔄');
    
    if (oldNumber > 0) {
        await message.reply(`🔄 Reset volontaire ! On repart de 1 (on était à ${oldNumber}). Prochain: **2**`);
    } else {
        await message.reply(`🎮 Le jeu commence ! On est à 1, prochain nombre: **2**`);
    }
}

// Gestion d'une erreur de comptage
async function handleCountingError(message, database, guildId, userId, number, expectedNumber, playerStats, errorType = "mauvais nombre") {
    // GUARD : Éviter le double traitement du même message
    const errorKey = `error_${message.id}_${errorType}`;
    if (processedMessages.has(errorKey)) {
        console.log(`⚠️ [DEBUG] Erreur déjà traitée pour ce message: ${errorKey}`);
        return;
    }
    processedMessages.add(errorKey);
    
    const serverData = await database.getOrCreateServer(guildId);
    const oldNumber = serverData.current_number;
    
    console.log(`🚨 [DEBUG] handleCountingError appelé - Type: ${errorType}, ID appel: ${Date.now()}`);
    console.log(`🚨 Erreur de comptage: utilisateur=${userId}, nombre=${number}, attendu=${expectedNumber}, type=${errorType}`);
    
    // S'assurer que les stats du joueur existent avant de les mettre à jour
    await database.getOrCreatePlayerStats(guildId, userId);
    
    console.log(`🔄 Reset du compteur en cours...`);
    // Reset du compteur
    await database.resetCounter(guildId);
    console.log(`✅ Compteur reseté`);
    
    // Mettre à jour les stats d'erreur du joueur
    await database.incrementPlayerErrors(guildId, userId);
    
    // Ajouter à l'historique comme erreur
    await database.addCountHistory(guildId, userId, number, message.id, false);
    
    // Réaction d'erreur
    await message.react('❌');
    
    console.log(`📝 Préparation du message d'erreur... [VERSION FIXED]`);
    
    // Message d'erreur drôle
    const errorMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)];
    let responseText = `${errorMessage}\n\n`;
    
    if (errorType === "double comptage") {
        responseText += `❌ @${message.member.displayName}, vous ne pouvez pas compter deux fois de suite ! Recommençons au début.`;
    } else {
        responseText += `❌ **Erreur !** Tu as écrit **${number}** mais on attendait **${expectedNumber}** !\n`;
        responseText += `🔄 Recommençons au début.`;
    }
    
    console.log(`🎭 Attribution du rôle temporaire...`);
    console.log(`🔍 [v2.2] Role configuré: ${serverData.fail_role_id}, Durée: ${serverData.fail_role_duration || 24}h`);
    
    // Gérer les conflits avec le rôle gagnant avant d'attribuer le rôle d'échec
    await handleWinnerRoleConflict(message, database, guildId, userId);
    
    // Attribuer un rôle temporaire si configuré
    let roleMessage = "";
    if (serverData.fail_role_id) {
        try {
            console.log(`🚀 [v2.2] Appel assignTemporaryShameRole...`);
            roleMessage = await assignTemporaryShameRole(message, database, guildId, userId, serverData.fail_role_id, serverData.fail_role_duration || 24);
            console.log(`✅ [v2.2] assignTemporaryShameRole terminé avec succès`);
        } catch (error) {
            console.error('❌ [v2.2] ERREUR lors de l\'attribution du rôle temporaire:', error);
            console.error('❌ [v2.2] Stack:', error.stack);
            // Ne pas faire échouer toute la fonction pour une erreur de rôle
        }
    }
    
    // Combiner le message d'erreur avec le message de rôle
    if (roleMessage) {
        responseText += `\n\n${roleMessage}`;
    }
    
    console.log(`💬 Envoi du message de réponse...`);
    await message.reply(responseText);
    console.log(`✅ Message d'erreur envoyé`);
}

// Attribution d'un rôle temporaire amusant
async function assignTemporaryShameRole(message, database, guildId, userId, roleId, durationHours) {
    try {
        console.log(`🎭 Début attribution rôle - Guild: ${guildId}, User: ${userId}, Role: ${roleId}`);
        
        const guild = message.guild;
        const member = await guild.members.fetch(userId);
        const role = guild.roles.cache.get(roleId);
        
        console.log(`🔍 Member trouvé: ${member ? member.user.username : 'NON'}`);
        console.log(`🔍 Role trouvé: ${role ? role.name : 'NON'}`);
        
        if (!role || !member) {
            console.log(`❌ Rôle ou membre introuvable`);
            return;
        }
        
        // Vérifier si l'utilisateur a déjà le rôle
        const hasRole = await database.hasTemporaryRole(guildId, userId, roleId);
        const memberHasRole = member.roles.cache.has(roleId);
        console.log(`🔍 A déjà le rôle en DB: ${hasRole}, sur Discord: ${memberHasRole}`);
        
        // Si incohérence (en DB mais pas sur Discord), nettoyer la DB
        if (hasRole && !memberHasRole) {
            console.log(`🧹 Incohérence détectée, nettoyage de la DB...`);
            await database.cleanObsoleteTemporaryRoles(guildId, userId, roleId);
            console.log(`✅ Entrées obsolètes supprimées, poursuite de l'attribution`);
        } else if (hasRole && memberHasRole) {
            console.log(`⚠️ L'utilisateur a déjà le rôle temporaire, abandon`);
            return; // Déjà le rôle temporaire complet
        } else if (!hasRole && memberHasRole) {
            console.log(`🔄 Rôle présent sur Discord mais absent de DB - Réenregistrement comme temporaire`);
            // Continuer l'attribution pour réenregistrer en DB (sans re-ajouter sur Discord)
        }
        
        // Attribution du rôle (seulement si pas déjà présent)
        if (!memberHasRole) {
            console.log(`🎯 Attribution du rôle ${role.name} sur Discord...`);
            await member.roles.add(role);
            console.log(`✅ Rôle attribué sur Discord`);
        } else {
            console.log(`🔍 Rôle déjà présent sur Discord, enregistrement en DB seulement`);
        }
        console.log(`🔑 Permissions bot: ${guild.members.me.permissions.has('ManageRoles')}`);
        console.log(`🏗️ Position rôle bot: ${guild.members.me.roles.highest.position}`);
        console.log(`🎯 Position rôle cible: ${role.position}`);
        
        // Enregistrer en base avec extension de durée
        await database.addTemporaryRole(guildId, userId, roleId, durationHours);
        console.log(`✅ Rôle enregistré en base`);
        
        // Mettre à jour les stats de temps avec rôle
        await database.addShameRoleTime(guildId, userId, durationHours);
        console.log(`✅ Stats mises à jour`);
        
        // Message amusant (retourné pour être combiné avec le message d'erreur)
        const shameMessage = shameRoleMessages[Math.floor(Math.random() * shameRoleMessages.length)];
        const finalMessage = shameMessage.replace('{ROLE_NAME}', role.name);
        
        // Ne plus envoyer de message ici, retourner le message pour éviter les doublons
        console.log(`✅ Rôle attribué, message préparé pour combinaison`);
        
        return `${finalMessage}\n⏰ Durée: ${durationHours}h`;
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'attribution du rôle temporaire:', error);
        return null;
    }
}

// Gestion des conflits entre rôle gagnant et rôle d'échec
async function handleWinnerRoleConflict(message, database, guildId, userId) {
    try {
        console.log(`🔀 Vérification conflit rôle gagnant pour ${userId}`);
        
        const currentWinner = await database.getCurrentWinner(guildId);
        if (!currentWinner || currentWinner.user_id !== userId) {
            console.log(`✅ Utilisateur n'est pas le gagnant actuel`);
            return;
        }
        
        console.log(`👑➡️❌ Conflit détecté: le gagnant actuel a fait une erreur !`);
        
        const winnerRoleId = await database.getWinnerRole(guildId);
        console.log(`🔍 ID rôle gagnant:`, winnerRoleId);
        
        if (winnerRoleId) {
            const guild = message.guild;
            const member = await guild.members.fetch(userId);
            const role = guild.roles.cache.get(winnerRoleId);
            
            console.log(`🔍 Member trouvé: ${member ? member.displayName : 'NON'}`);
            console.log(`🔍 Role trouvé: ${role ? role.name : 'NON'} (ID: ${winnerRoleId})`);
            console.log(`🔍 Membre a le rôle: ${member && member.roles.cache.has(winnerRoleId)}`);
            
            if (member && role && member.roles.cache.has(winnerRoleId)) {
                await member.roles.remove(role);
                console.log(`🔄 Rôle gagnant retiré de ${userId}`);
                
                // Annoncer la perte du titre
                if (message.channel) {
                    await message.channel.send(`👑💔 ${member.displayName} perd son titre de gagnant suite à cette erreur !`);
                }
            } else {
                console.log(`⚠️ Conditions non remplies pour retirer le rôle`);
            }
        } else {
            console.log(`⚠️ Aucun rôle gagnant configuré`);
        }
        
        // Retirer de la base de données (APRÈS avoir retiré le rôle Discord)
        await database.removeCurrentWinner(guildId);
        console.log(`✅ Gagnant actuel supprimé de la DB`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la gestion du conflit de rôle gagnant:', error);
    }
}

// Nettoyage des rôles temporaires expirés
async function cleanupExpiredRoles() {
    try {
        console.log(`🧹 [CLEANUP] Début nettoyage rôles temporaires expirés`);
        const expiredRoles = await client.database.getExpiredTemporaryRoles();
        console.log(`🔍 [CLEANUP] ${expiredRoles.length} rôles expirés trouvés`);
        
        if (expiredRoles.length === 0) {
            console.log(`✅ [CLEANUP] Aucun rôle expiré à nettoyer`);
            return;
        }
        
        for (const roleData of expiredRoles) {
            try {
                console.log(`🎯 [CLEANUP] Traitement rôle - Guild: ${roleData.guild_id}, User: ${roleData.user_id}, Role: ${roleData.role_id}, Expires: ${roleData.expires_at}`);
                
                const guild = client.guilds.cache.get(roleData.guild_id);
                if (!guild) {
                    console.log(`⚠️ [CLEANUP] Serveur non trouvé: ${roleData.guild_id}`);
                    continue;
                }
                
                const member = await guild.members.fetch(roleData.user_id).catch(() => null);
                const role = guild.roles.cache.get(roleData.role_id);
                
                console.log(`🔍 [CLEANUP] Member trouvé: ${member ? member.user.tag : 'NON'}, Role trouvé: ${role ? role.name : 'NON'}`);
                
                if (member && role && member.roles.cache.has(roleData.role_id)) {
                    await member.roles.remove(role);
                    console.log(`✅ [CLEANUP] Rôle "${role.name}" retiré de ${member.user.tag}`);
                } else {
                    console.log(`🔍 [CLEANUP] Rôle déjà absent ou membre/rôle introuvable`);
                }
                
                await client.database.removeTemporaryRole(roleData.id);
                console.log(`🗑️ [CLEANUP] Entrée DB supprimée pour rôle ID: ${roleData.id}`);
            } catch (error) {
                console.error('❌ [CLEANUP] Erreur lors du nettoyage d\'un rôle:', error);
                await client.database.removeTemporaryRole(roleData.id);
            }
        }
        
        console.log(`✅ [CLEANUP] Nettoyage terminé - ${expiredRoles.length} rôles traités`);
    } catch (error) {
        console.error('❌ [CLEANUP] Erreur lors du nettoyage des rôles temporaires:', error);
    }
}

// Système de trophées hebdomadaires
function startWeeklyTrophySystem() {
    // Programmer le trophée chaque lundi à 00:00
    const now = new Date();
    const nextMonday = new Date();
    nextMonday.setDate(now.getDate() + (1 + 7 - now.getDay()) % 7);
    nextMonday.setHours(0, 0, 0, 0);
    
    const timeUntilMonday = nextMonday.getTime() - now.getTime();
    
    setTimeout(() => {
        awardWeeklyTrophies();
        // Répéter chaque semaine
        setInterval(awardWeeklyTrophies, 7 * 24 * 60 * 60 * 1000);
    }, timeUntilMonday);
}

// Attribution des trophées hebdomadaires
async function awardWeeklyTrophies() {
    console.log('🏆 Attribution des trophées hebdomadaires...');
    
    try {
        const guilds = client.guilds.cache;
        
        for (const [guildId, guild] of guilds) {
            await awardServerWeeklyTrophy(guildId, guild);
        }
    } catch (error) {
        console.error('Erreur lors de l\'attribution des trophées:', error);
    }
}

// Attribution du trophée pour un serveur
async function awardServerWeeklyTrophy(guildId, guild) {
    try {
        const database = client.database;
        const weekWinner = await database.getWeeklyWinner(guildId);
        
        if (!weekWinner) return;
        
        // Attribuer le trophée
        await database.awardTrophy(guildId, weekWinner.user_id);
        
        // Gérer le rôle gagnant hebdomadaire
        const serverData = await database.getOrCreateServer(guildId);
        const winnerRoleId = await database.getWinnerRole(guildId);
        
        if (winnerRoleId) {
            await assignWeeklyWinnerRole(guild, guildId, weekWinner.user_id, winnerRoleId);
        }
        
        // Reset des scores hebdomadaires
        await database.resetWeeklyScores(guildId);
        
        // Annoncer dans le canal de comptage
        if (serverData.counting_channel_id) {
            const channel = guild.channels.cache.get(serverData.counting_channel_id);
            if (channel) {
                const member = await guild.members.fetch(weekWinner.user_id).catch(() => null);
                if (member) {
                    const weeklyScore = (weekWinner.weekly_correct_counts || 0) - ((weekWinner.weekly_error_counts || 0) * 5);
                    let message = `🏆 **TROPHÉE HEBDOMADAIRE** 🏆\n\nFélicitations <@${weekWinner.user_id}> !\nTu remportes le trophée de cette semaine avec un score de **${weeklyScore} points** !`;
                    
                    if (winnerRoleId) {
                        const role = guild.roles.cache.get(winnerRoleId);
                        if (role) {
                            message += `\n👑 Tu reçois également le rôle **${role.name}** jusqu'au prochain gagnant !`;
                        }
                    }
                    
                    message += `\n\n🔄 Les scores sont remis à zéro pour une nouvelle semaine de compétition !`;
                    await channel.send(message);
                }
            }
        }
        
        console.log(`🏆 Trophée attribué à ${weekWinner.user_id} sur ${guild.name}`);
    } catch (error) {
        console.error(`Erreur lors de l'attribution du trophée pour ${guild.name}:`, error);
    }
}

// Attribution du rôle gagnant hebdomadaire
async function assignWeeklyWinnerRole(guild, guildId, userId, winnerRoleId) {
    try {
        console.log(`👑 Attribution rôle gagnant - Guild: ${guildId}, User: ${userId}, Role: ${winnerRoleId}`);
        
        const database = client.database;
        const member = await guild.members.fetch(userId);
        const role = guild.roles.cache.get(winnerRoleId);
        
        if (!role || !member) {
            console.log(`❌ Rôle gagnant ou membre introuvable`);
            return;
        }
        
        // Retirer le rôle gagnant de l'ancien détenteur
        const currentWinner = await database.getCurrentWinner(guildId);
        if (currentWinner && currentWinner.user_id !== userId) {
            try {
                const oldMember = await guild.members.fetch(currentWinner.user_id);
                if (oldMember && oldMember.roles.cache.has(winnerRoleId)) {
                    await oldMember.roles.remove(role);
                    console.log(`🔄 Ancien rôle gagnant retiré de ${currentWinner.user_id}`);
                }
            } catch (error) {
                console.log(`⚠️ Impossible de retirer l'ancien rôle gagnant:`, error.message);
            }
        }
        
        // Vérifier si l'utilisateur a déjà le rôle
        if (!member.roles.cache.has(winnerRoleId)) {
            await member.roles.add(role);
            console.log(`✅ Rôle gagnant attribué sur Discord`);
        } else {
            console.log(`🔍 Utilisateur a déjà le rôle gagnant`);
        }
        
        // Enregistrer le nouveau gagnant actuel
        await database.setCurrentWinner(guildId, userId);
        console.log(`✅ Nouveau gagnant enregistré en DB`);
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'attribution du rôle gagnant:', error);
    }
}

// EVENT: Commandes slash
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Erreur lors de l\'exécution de la commande:', error);
        
        const errorResponse = {
            content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.',
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorResponse);
        } else {
            await interaction.reply(errorResponse);
        }
    }
});

// EVENT: Nouveau serveur
client.on('guildCreate', async guild => {
    console.log(`➕ Nouveau serveur: ${guild.name} (${guild.id})`);
    await client.database.getOrCreateServer(guild.id);
});

// EVENT: Serveur quitté
client.on('guildDelete', guild => {
    console.log(`➖ Serveur quitté: ${guild.name} (${guild.id})`);
});

// Nettoyage automatique des rôles toutes les heures (en dev: toutes les 5 min)
const cleanupInterval = isDevelopment ? 5 * 60 * 1000 : 60 * 60 * 1000; // 5min dev, 1h prod
console.log(`⏰ [TIMER] Nettoyage automatique configuré: ${isDevelopment ? '5 minutes' : '1 heure'}`);
setInterval(() => {
    console.log(`🔄 [TIMER] Déclenchement nettoyage automatique - ${new Date().toLocaleTimeString()}`);
    cleanupExpiredRoles();
}, cleanupInterval);

// Reset hebdomadaire le lundi à 00h00
setInterval(() => {
    const now = new Date();
    if (now.getDay() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
        resetWeeklyStats();
    }
}, 60 * 1000); // Vérifier chaque minute

// Fonction de reset hebdomadaire
async function resetWeeklyStats() {
    try {
        console.log('🔄 Reset hebdomadaire en cours...');
        
        // Récupérer tous les serveurs
        const guilds = client.guilds.cache;
        
        for (const [guildId, guild] of guilds) {
            try {
                // Récupérer le gagnant de la semaine avant reset
                const weeklyLeaderboard = await client.database.getWeeklyLeaderboard(guildId, 1);
                
                if (weeklyLeaderboard.length > 0) {
                    const winner = weeklyLeaderboard[0];
                    const member = await guild.members.fetch(winner.user_id).catch(() => null);
                    
                    if (member) {
                        // Envoyer message de félicitations
                        const serverData = await client.database.getOrCreateServer(guildId);
                        if (serverData.counting_channel_id) {
                            const channel = guild.channels.cache.get(serverData.counting_channel_id);
                            if (channel) {
                                await channel.send(`🏆 **GAGNANT DE LA SEMAINE !** 🏆\n\nFélicitations ${member} !\nScore hebdomadaire: **${winner.weekly_highest}**\n\n🔄 Une nouvelle semaine commence, bonne chance à tous !`);
                            }
                        }
                    }
                }
                
                // Reset des stats hebdomadaires
                await client.database.resetWeeklyStats(guildId);
                
            } catch (error) {
                console.error(`❌ Erreur reset hebdomadaire pour ${guildId}:`, error);
            }
        }
        
        console.log('✅ Reset hebdomadaire terminé');
    } catch (error) {
        console.error('❌ Erreur lors du reset hebdomadaire:', error);
    }
}

// Gestion des erreurs
process.on('unhandledRejection', error => {
    console.error('❌ Erreur non gérée:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Exception non gérée:', error);
});

// 🚀 Gestion propre des signaux système (Railway/Docker)
process.on('SIGTERM', () => {
    console.log('🔄 Signal SIGTERM reçu - Arrêt propre du bot...');
    gracefulShutdown();
});

process.on('SIGINT', () => {
    console.log('🔄 Signal SIGINT reçu - Arrêt propre du bot...');
    gracefulShutdown();
});

// Fonction d'arrêt propre
async function gracefulShutdown() {
    console.log('🔄 Début de l\'arrêt propre...');
    
    try {
        // Fermer la base de données proprement
        if (client.database && typeof client.database.close === 'function') {
            console.log('💾 Fermeture de la base de données...');
            await client.database.close();
        }
        
        // Déconnecter le bot Discord
        if (client) {
            console.log('🤖 Déconnexion du bot Discord...');
            client.destroy();
        }
        
        console.log('✅ Arrêt propre terminé');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Erreur pendant l\'arrêt propre:', error);
        process.exit(1);
    }
}

// Connexion du bot avec le token approprié
if (!DISCORD_TOKEN) {
    console.error('❌ ERREUR: Token Discord manquant !');
    console.error(`🔍 Vérifiez votre fichier .env pour la variable: ${isDevelopment ? 'DISCORD_TOKEN_DEV' : 'DISCORD_TOKEN'}`);
    process.exit(1);
}

client.login(DISCORD_TOKEN);
