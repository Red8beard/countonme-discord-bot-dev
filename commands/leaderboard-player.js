const { SlashCommandBuilder } = require('discord.js');

// ✅ Commande leaderboard-player avec nouvelles stats
module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard-player')
        .setDescription('📊 Voir les statistiques détaillées d\'un joueur spécifique')
        .addUserOption(option =>
            option.setName('joueur')
                .setDescription('Le joueur dont vous voulez voir les statistiques (défaut: vous-même)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('joueur') || interaction.user;

        try {
            const database = interaction.client.database;
            
            // Alternative: utiliser getServerLeaderboard qui fonctionne
            const serverLeaderboard = await database.getServerLeaderboard(interaction.guild.id, 100);
            const playerData = serverLeaderboard.find(p => p.user_id === targetUser.id);
            
            if (!playerData) {
                return await interaction.reply({
                    content: `❌ ${targetUser.username} n'a pas encore de statistiques de comptage !`,
                    ephemeral: true
                });
            }

            const position = serverLeaderboard.findIndex(p => p.user_id === targetUser.id) + 1;
            const weeklyScore = (playerData.weekly_correct_counts || 0) - ((playerData.weekly_error_counts || 0) * 5);
            const totalScore = (playerData.correct_counts || 0) - ((playerData.error_counts || 0) * 5);

            await interaction.reply({
                content: `📊 **Statistiques de ${targetUser.displayName || targetUser.username}**\n\n` +
                        `🏆 **Position Hebdo**: ${position}${position === 1 ? 'ère' : 'ème'} place\n` +
                        `📈 **Score Hebdo**: ${weeklyScore} points\n` +
                        `✅ **Nombres corrects Hebdo**: ${playerData.weekly_correct_counts || 0}\n` +
                        `❌ **Erreurs Hebdo**: ${playerData.weekly_error_counts || 0}\n\n` +
                        `⭐ **Score Total**: ${totalScore} points\n` +
                        `🏅 **Trophée total**: ${playerData.total_trophies || 0}\n` +
                        `✅ **Nombres corrects Total**: ${playerData.correct_counts || 0}\n` +
                        `❌ **Erreurs Total**: ${playerData.error_counts || 0}\n` +
                        `😅 **Heures de honte**: ${playerData.shame_role_hours || 0}h\n\n` +
                        `*+1 point par bon nombre, -5 par erreur*`,
                ephemeral: true
            });

        } catch (error) {
            console.error('❌ Erreur leaderboard-player:', error);
            await interaction.reply({
                content: '❌ Erreur lors de la récupération des statistiques du joueur',
                ephemeral: true
            });
        }
    },
};
