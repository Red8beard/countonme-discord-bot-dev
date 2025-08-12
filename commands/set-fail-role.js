const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-fail-role')
        .setDescription('🎭 Configure le rôle de honte temporaire en cas d\'erreur')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Le rôle à attribuer temporairement en cas d\'erreur')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Durée en heures (défaut: 24h, min: 1h en prod, 0.1h en dev)')
                .setRequired(false)
                .setMinValue(0)  // Permettre 0 pour les tests dev
                .setMaxValue(168)) // Max 1 semaine
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // Vérification des permissions administrateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return await interaction.reply({
                content: '❌ Seuls les administrateurs du serveur peuvent configurer le rôle de honte !',
                ephemeral: true
            });
        }

        const role = interaction.options.getRole('role');
        let duration = interaction.options.getInteger('duration');
        
        // Gestion spéciale pour les tests en développement
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        if (duration === null || duration === undefined) {
            duration = isDevelopment ? 0.1 : 24; // 6 min en dev, 24h en prod
        } else if (duration === 0 && isDevelopment) {
            duration = 0.1; // Conversion 0 -> 0.1h en dev (6 minutes)
        } else if (duration < 1 && !isDevelopment) {
            duration = 1; // Minimum 1h en production
        } else if (duration === 0) {
            duration = 0.1; // Permet 0.1h même avec entier 0
        }
        
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
                    content: '❌ Je ne peux pas utiliser le rôle @everyone comme rôle de honte !',
                    ephemeral: true
                });
            }

            // Sauvegarder la configuration en base de données
            await database.setFailRole(guildId, role.id, duration);

            await interaction.reply({
                content: `✅ Rôle de honte configuré : ${role} (${duration}h)`,
                ephemeral: true
            });

        } catch (error) {
            console.error('❌ Erreur set-fail-role:', error);
            
            // Vérifier si l'interaction a déjà été répondue
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ Erreur lors de la configuration du rôle de honte.',
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('❌ Erreur lors de la réponse d\'erreur:', replyError);
                }
            }
        }
    }
};
