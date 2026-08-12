/**
 * /ban Komutu
 * Belirtilen kullanıcıyı sunucudan yasaklar.
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Belirtilen kullanıcıyı sunucudan yasaklar.')
    .addUserOption((option) =>
      option
        .setName('kullanici')
        .setDescription('Yasaklanacak kullanıcı')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('sebep')
        .setDescription('Yasaklama sebebi')
        .setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName('mesaj_silme')
        .setDescription('Kaç günlük mesajları silinsin? (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('kullanici', true);
      const reason = interaction.options.getString('sebep') ?? 'Sebep belirtilmedi';
      const deleteMessageDays = interaction.options.getInteger('mesaj_silme') ?? 0;

      // Komutu kullanan kişinin yetkisini kontrol et
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({
          content: '❌ Bu komutu kullanmak için **Üyeleri Yasakla** yetkisine sahip olmalısınız.',
          ephemeral: true,
        });
      }

      // Kendini yasaklayamaz
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({
          content: '❌ Kendinizi yasaklayamazsınız.',
          ephemeral: true,
        });
      }

      // Botu yasaklayamaz
      if (targetUser.id === interaction.client.user.id) {
        return interaction.reply({
          content: '❌ Beni yasaklayamazsınız.',
          ephemeral: true,
        });
      }

      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      // Üye sunucudaysa rol hiyerarşisi kontrolü
      if (targetMember) {
        if (
          targetMember.roles.highest.position >= interaction.member.roles.highest.position
          && interaction.guild.ownerId !== interaction.user.id
        ) {
          return interaction.reply({
            content: '❌ Sizden eşit veya daha yüksek role sahip bir kullanıcıyı yasaklayamazsınız.',
            ephemeral: true,
          });
        }

        if (!targetMember.bannable) {
          return interaction.reply({
            content: '❌ Bu kullanıcıyı yasaklayamıyorum. Rol hiyerarşimi veya yetkilerimi kontrol edin.',
            ephemeral: true,
          });
        }
      }

      await interaction.guild.members.ban(targetUser.id, {
        reason: `${reason} | Moderatör: ${interaction.user.tag}`,
        deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60,
      });

      await interaction.reply({
        content: `🔨 **${targetUser.tag}** sunucudan yasaklandı.\n📋 Sebep: ${reason}`,
      });
    } catch (error) {
      console.error('[HATA] /ban komutu:', error);

      const replyOptions = {
        content: '❌ Kullanıcı yasaklanırken bir hata oluştu.',
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
