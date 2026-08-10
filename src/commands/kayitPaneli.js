/**
 * Kayıt Paneli Gönderme Komutu (/kayit-paneli)
 * ErensiBOT tarzı kayıt mesajını ve butonunu kanala TEK BİR MESAJ olarak gönderir.
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
    .setDescription('ErensiBOT tarzı üye kayıt panelini kanala gönderir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      const registerBtn = new ButtonBuilder()
        .setCustomId('btn_user_register')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(registerBtn);

      const content = 'Lütfen kayıt olmak için alttaki emojiye tıklayınız. (Lütfen spam atmayınız.)';

      // Kanala tek bir mesaj ve buton gönder
      await interaction.reply({
        content: content,
        components: [row],
      });
    } catch (error) {
      console.error('[HATA] Kayıt paneli gönderilemedi:', error);
      try {
        await interaction.reply({
          content: `❌ Paneli gönderirken hata oluştu: ${error.message}`,
          ephemeral: true,
        });
      } catch {}
    }
  },
};
