export default {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`[HATA] ${interaction.commandName} komutu bulunamadı.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[HATA] ${interaction.commandName} çalıştırılırken hata:`, error);
      
      const errorMessage = { content: 'Bu komut çalıştırılırken bir hata oluştu!', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};
