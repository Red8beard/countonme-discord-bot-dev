const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Affiche les informations du serveur et du bot'),

    async execute(interaction) {
        const database = interaction.client.database;
        const guildId = interaction.guild.id;
        
        try {
            const serverData = await database.getOrCreateServer(guildId);
            
            // Récupérer quelques stats générales
            const leaderboard = await database.getServerLeaderboard(guildId, 1);
            const topPlayer = leaderboard[0];
            
            let topPlayerName = 'Aucun';
            if (topPlayer) {
                try {
                    const member = await interaction.guild.members.fetch(topPlayer.user_id);
                    topPlayerName = member.displayName;
                } catch {
                    topPlayerName = 'Joueur inconnu';
                }
            }
            
            // Déterminer l'état du canal
            let channelInfo = 'Non configuré';
            if (serverData.counting_channel_id) {
                const channel = interaction.guild.channels.cache.get(serverData.counting_channel_id);
                channelInfo = channel ? `${channel}` : 'Canal supprimé';
            }
            
            // Déterminer l'état du rôle
            let roleInfo = 'Non configuré';
            if (serverData.fail_role_id) {
                const role = interaction.guild.roles.cache.get(serverData.fail_role_id);
                roleInfo = role ? `${role} (${serverData.fail_role_duration}h)` : 'Rôle supprimé';
            }
            
            const embed = new EmbedBuilder()
                .setTitle(`🎲 CountOnMe - Informations`)
                .setThumbnail(interaction.guild.iconURL())
                .setColor('#9C27B0')
                .addFields(
                    {
                        name: '📊 État Actuel',
                        value: `**Nombre actuel:** ${serverData.current_number}\n**Meilleur joueur:** ${topPlayerName}\n**Record:** ${topPlayer?.highest_number || 0}`,
                        inline: true
                    },
                    {
                        name: '⚙️ Configuration',
                        value: `**Canal:** ${channelInfo}\n**Rôle de honte:** ${roleInfo}`,
                        inline: true
                    },
                    {
                        name: '🎮 Comment Jouer',
                        value: `• Comptez dans l'ordre: 1, 2, 3...\n• Pas deux fois de suite\n• Une erreur = reset + rôle temporaire\n• Trophée hebdomadaire au meilleur`,
                        inline: false
                    },
                    {
                        name: '🏆 Système de Trophées',
                        value: `Chaque lundi, le joueur avec le **meilleur score de la semaine** remporte un trophée ! Les scores sont ensuite remis à zéro pour une nouvelle compétition.`,
                        inline: false
                    }
                )
                .setFooter({ 
                    text: 'Version 2.0 - Focus sur les statistiques des joueurs', 
                    iconURL: interaction.client.user.displayAvatarURL() 
                })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Erreur lors de la récupération des infos:', error);
            await interaction.reply({
                content: '❌ Erreur lors de la récupération des informations.',
                ephemeral: true
            });
        }
    }
};
