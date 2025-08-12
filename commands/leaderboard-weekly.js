const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard-weekly')
        .setDescription('🏆 Top 12 des meilleurs compteurs hebdomadaires'),

    async execute(interaction) {
        const guildId = interaction.guild.id;

        try {
            const database = interaction.client.database;
            
            // Utiliser getWeeklyLeaderboard qui devrait fonctionner
            const weeklyLeaderboard = await database.getWeeklyLeaderboard(guildId, 12);
            
            if (weeklyLeaderboard.length === 0) {
                return await interaction.reply({
                    content: '📊 Aucune activité de comptage cette semaine !',
                    ephemeral: true
                });
            }

            // Calculer quand se termine la semaine (prochain lundi)
            const now = new Date();
            const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
            const nextMonday = new Date(now);
            nextMonday.setDate(now.getDate() + daysUntilMonday);
            nextMonday.setHours(0, 0, 0, 0);

            const embed = new EmbedBuilder()
                .setTitle('🏆 Leaderboard Hebdomadaire - Top 12')
                .setDescription(`🗓️ **Remise des trophées:** <t:${Math.floor(nextMonday.getTime() / 1000)}:R>\n📈 **Critère:** Score hebdomadaire (+1 par bon nombre, -5 par erreur)`)
                .setColor('#FFD700')
                .setTimestamp();

            let leaderboardText = '';
            const medals = ['🥇', '🥈', '🥉'];
            
            for (let i = 0; i < weeklyLeaderboard.length; i++) {
                const player = weeklyLeaderboard[i];
                const member = await interaction.guild.members.fetch(player.user_id).catch(() => null);
                const username = member ? member.displayName : `Utilisateur ${player.user_id.slice(-4)}`;
                
                const medal = i < 3 ? medals[i] : `**${i + 1}.**`;
                const weeklyScore = (player.weekly_correct_counts || 0) - ((player.weekly_error_counts || 0) * 5);
                
                leaderboardText += `${medal} **${username}**\n`;
                leaderboardText += `   🎯 Score Hebdo: **${weeklyScore}** points\n\n`;
            }

            embed.addFields({
                name: '📊 Classement de la Semaine',
                value: leaderboardText || 'Aucun joueur actif cette semaine',
                inline: false
            });

            // Ajouter info sur les trophées
            embed.addFields({
                name: '🏆 Système de Trophées',
                value: '• **1er place** 🥇 : Trophée Champion\n• **Reset** : Chaque lundi à 00h00\n• **Calcul** : Meilleur score hebdomadaire',
                inline: false
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Erreur leaderboard-weekly:', error);
            await interaction.reply({
                content: '❌ Erreur lors de la récupération du leaderboard hebdomadaire.',
                ephemeral: true
            });
        }
    }
};
