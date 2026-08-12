/**
 * /kick Komutu
 * Belirtilen kullanıcıyı sunucudan atar.
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Belirtilen kullanıcıyı sunucudan atar.')
    .addUserOption((option) =>
      option
        .setName('kullanici')
        .setDescription('Atılacak kullanıcı')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('sebep')
        .setDescription('Atma sebebi')
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('kullanici', true);
      const reason = interaction.options.getString('sebep') ?? 'Sebep belirtilmedi';

      // Komutu kullanan kişinin yetkisini kontrol et
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
        return interaction.reply({
          content: '❌ Bu komutu kullanmak için **Üyeleri At** yetkisine sahip olmalısınız.',
          ephemeral: true,
        });
      }

      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return interaction.reply({
          content: '❌ Belirtilen kullanıcı bu sunucuda bulunamadı.',
          ephemeral: true,
        });
      }

      // Kendini atamaz
      if (targetMember.id === interaction.user.id) {
        return interaction.reply({
          content: '❌ Kendinizi atamazsınız.',
          ephemeral: true,
        });
      }

      // Botu atamaz
      if (targetMember.id === interaction.client.user.id) {
        return interaction.reply({
          content: '❌ Beni atamazsınız.',
          ephemeral: true,
        });
      }

      // Rol hiyerarşisi kontrolü
      if (
        targetMember.roles.highest.position >= interaction.member.roles.highest.position
        && interaction.guild.ownerId !== interaction.user.id
      ) {
        return interaction.reply({
          content: '❌ Sizden eşit veya daha yüksek role sahip bir kullanıcıyı atamazsınız.',
          ephemeral: true,
        });
      }

      // Botun yetkisini kontrol et
      if (!targetMember.kickable) {
        return interaction.reply({
          content: '❌ Bu kullanıcıyı atamıyorum. Rol hiyerarşimi veya yetkilerimi kontrol edin.',
          ephemeral: true,
        });
      }

      await targetMember.kick(`${reason} | Moderatör: ${interaction.user.tag}`);

      await interaction.reply({
        content: `✅ **${targetUser.tag}** sunucudan atıldı.\n📋 Sebep: ${reason}`,
      });
    } catch (error) {
      console.error('[HATA] /kick komutu:', error);

      const replyOptions = {
        content: '❌ Kullanıcı atılırken bir hata oluştu.',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions);
      } else {
        await interaction.reply(replyOptions);
      }
    }
  },
};
