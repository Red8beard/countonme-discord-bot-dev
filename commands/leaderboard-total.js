const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard-total')
        .setDescription('🌐 Classement global de tous les serveurs où le bot est présent'),

    async execute(interaction) {
        try {
            const database = interaction.client.database;
            
            // Récupérer le leaderboard global
            const globalLeaderboard = await database.getGlobalLeaderboard(15);
            
            if (globalLeaderboard.length === 0) {
                return await interaction.reply({
                    content: '📊 Aucun serveur n\'a encore de score enregistré !',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('🌐 Leaderboard Global - Top 15 Serveurs')
                .setDescription('🏆 Classement des meilleurs records de tous les serveurs')
                .setColor('#00D4AA')
                .setTimestamp();

            let leaderboardText = '';
            const medals = ['🥇', '🥈', '🥉'];
            
            for (let i = 0; i < Math.min(globalLeaderboard.length, 15); i++) {
                const serverData = globalLeaderboard[i];
                
                // Essayer de récupérer le nom du serveur
                let serverName = `Serveur ${serverData.guild_id.slice(-4)}`;
                try {
                    const guild = await interaction.client.guilds.fetch(serverData.guild_id);
                    if (guild) {
                        serverName = guild.name.length > 25 ? guild.name.slice(0, 25) + '...' : guild.name;
                    }
                } catch (error) {
                    // Serveur non accessible, garder le nom par défaut
                }
                
                const medal = i < 3 ? medals[i] : `**${i + 1}.**`;
                const isCurrentServer = serverData.guild_id === interaction.guild.id;
                const serverText = isCurrentServer ? `**${serverName}** 👈` : serverName;
                
                leaderboardText += `${medal} ${serverText}\n`;
                leaderboardText += `   🎯 **Record:** ${serverData.high_score}\n`;
                leaderboardText += `   📊 **Actuel:** ${serverData.current_number}\n`;
                leaderboardText += `   ✅ **Total comptages:** ${serverData.total_count || 0}\n\n`;
            }

            embed.addFields({
                name: '📊 Top Serveurs Mondiale',
                value: leaderboardText || 'Aucun serveur trouvé',
                inline: false
            });

            // Trouver la position du serveur actuel
            const currentServerPosition = globalLeaderboard.findIndex(s => s.guild_id === interaction.guild.id) + 1;
            if (currentServerPosition > 0) {
                embed.addFields({
                    name: '🏆 Position de ce serveur',
                    value: `**${currentServerPosition}${currentServerPosition === 1 ? 'ère' : 'ème'}** place mondiale`,
                    inline: true
                });
            } else {
                embed.addFields({
                    name: '🏆 Position de ce serveur',
                    value: 'Non classé (aucun score)',
                    inline: true
                });
            }

            // Ajouter stats globales
            const totalServers = await interaction.client.guilds.cache.size;
            embed.addFields({
                name: '📈 Statistiques Globales',
                value: `🤖 **Serveurs total:** ${totalServers}\n📊 **Serveurs actifs:** ${globalLeaderboard.length}`,
                inline: true
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Erreur leaderboard-total:', error);
            await interaction.reply({
                content: '❌ Erreur lors de la récupération du classement global.',
                ephemeral: true
            });
        }
    }
};
