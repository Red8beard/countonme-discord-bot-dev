const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-winner-role')
        .setDescription('🏆 Configure le rôle de gagnant hebdomadaire')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Le rôle à attribuer au gagnant de la semaine')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // Vérification des permissions administrateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return await interaction.reply({
                content: '❌ Seuls les administrateurs du serveur peuvent configurer le rôle de gagnant !',
                ephemeral: true
            });
        }

        const role = interaction.options.getRole('role');
        const guildId = interaction.guild.id;

        try {
            const database = interaction.client.database;

            // Vérifier que le bot peut gérer ce rôle
            const botMember = interaction.guild.members.me;
            if (role.position >= botMember.roles.highest.position) {
                return await interaction.reply({
                    content: `❌ Je ne peux pas gérer le rôle ${role} car il est plus haut que mon rôle le plus élevé dans la hiérarchie !`,
                    ephemeral: true
                });
            }

            // Vérifier que le rôle n'est pas @everyone
            if (role.id === interaction.guild.id) {
                return await interaction.reply({
                    content: '❌ Je ne peux pas utiliser le rôle @everyone comme rôle de gagnant !',
                    ephemeral: true
                });
            }

            // Sauvegarder la configuration en base de données
            await database.setWinnerRole(guildId, role.id);

            await interaction.reply({
                content: `🏆 **Rôle de gagnant configuré :** ${role}\n\n✨ **Fonctionnement :**\n• Attribué automatiquement au gagnant hebdomadaire\n• Durée : 1 semaine jusqu'au prochain gagnant\n• Retiré si le gagnant fait une erreur (remplacé par le rôle d'échec)\n• Un seul gagnant à la fois par serveur`,
                ephemeral: true
            });

        } catch (error) {
            console.error('❌ Erreur set-winner-role:', error);
            
            // Vérifier si l'interaction a déjà été répondue
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ Erreur lors de la configuration du rôle de gagnant.',
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('❌ Erreur lors de la réponse d\'erreur:', replyError);
                }
            }
        }
    }
};
