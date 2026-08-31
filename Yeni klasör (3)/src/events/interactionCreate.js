/**
 * Interaction Create Event
 * Slash komut etkileşimlerini yakalar ve ilgili komuta yönlendirir.
 */
import { handleRoleInteractions } from '../handlers/roleHandler.js';
import { handleRegistrationInteraction } from '../handlers/registrationHandler.js';

export default {
  name: 'interactionCreate',

  /**
   * @param {import('discord.js').Interaction} interaction - Discord etkileşimi
   * @param {import('discord.js').Client} client - Discord istemcisi
   */
  async execute(interaction, client) {
    const isRegistration = await handleRegistrationInteraction(interaction);
    if (isRegistration) return;

    await handleRoleInteractions(interaction);
    // Sadece slash komutlarını işle
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    // Komut bulunamadıysa
    if (!command) {
      console.warn(`[UYARI] Bilinmeyen komut: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[HATA] /${interaction.commandName} komutu çalıştırılırken hata:`, error);

      const errorMessage = {
        content: '❌ Bu komut çalıştırılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
        ephemeral: true,
      };

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      } catch (replyError) {
        console.error('[HATA] Hata mesajı gönderilemedi:', replyError);
      }
    }
  },
};
