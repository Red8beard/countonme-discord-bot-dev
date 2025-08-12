const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-counting-channel')
        .setDescription('Définit le canal de comptage pour ce serveur')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Le canal où le comptage aura lieu')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        // Vérification des permissions administrateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return await interaction.reply({
                content: '❌ Seuls les administrateurs du serveur peuvent configurer le canal de comptage !',
                ephemeral: true
            });
        }

        const database = interaction.client.database;
        const guildId = interaction.guild.id;
        const channel = interaction.options.getChannel('channel');

        try {
            await database.setCountingChannel(guildId, channel.id);
            await interaction.reply({
                content: `✅ Le canal de comptage a été défini sur ${channel}!\n\nLes utilisateurs peuvent maintenant commencer à compter dans ce canal. Le prochain nombre à taper est **1**.`,
                ephemeral: false
            });
        } catch (error) {
            console.error('Erreur set-counting-channel:', error);
            
            // Vérifier si l'interaction a déjà été répondue
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ Une erreur est survenue lors de la configuration du canal.',
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('❌ Erreur lors de la réponse d\'erreur:', replyError);
                }
            }
        }
    },
};
