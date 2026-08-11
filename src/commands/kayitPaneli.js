/**
 * Kayıt Paneli Gönderme Komutu (/kayit-paneli)
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kayit-paneli')
    .setDescription('Üye kayıt panelini kanala gönderir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      // Çifte yanıt engeli
      if (interaction.replied || interaction.deferred) return;

      const registerBtn = new ButtonBuilder()
        .setCustomId('btn_user_register')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(registerBtn);

      // Kanala doğrudan etkileşim yanıtı olarak TEK mesaj gönder
      await interaction.reply({
        content: 'Lütfen kayıt olmak için alttaki emojiye tıklayınız. (Lütfen spam atmayınız.)',
        components: [row],
      });
    } catch (error) {
      console.error('[HATA] Kayıt paneli gönderilemedi:', error);
    }
  },
};
