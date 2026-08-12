/**
 * /timeout Komutu
 * Belirtilen kullanıcıya geçici susturma (timeout) uygular.
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

// Süre seçenekleri (dakika cinsinden)
const DURATION_CHOICES = [
  { name: '60 saniye', value: 1 },
  { name: '5 dakika', value: 5 },
  { name: '10 dakika', value: 10 },
  { name: '1 saat', value: 60 },
  { name: '1 gün', value: 1440 },
  { name: '1 hafta', value: 10080 },
];

export default {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Belirtilen kullanıcıya geçici susturma uygular.')
    .addUserOption((option) =>
      option
        .setName('kullanici')
        .setDescription('Susturulacak kullanıcı')
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('sure')
        .setDescription('Susturma süresi')
        .setRequired(true)
        .addChoices(...DURATION_CHOICES),
    )
    .addStringOption((option) =>
      option
        .setName('sebep')
        .setDescription('Susturma sebebi')
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('kullanici', true);
      const durationMinutes = interaction.options.getInteger('sure', true);
      const reason = interaction.options.getString('sebep') ?? 'Sebep belirtilmedi';

      // Komutu kullanan kişinin yetkisini kontrol et
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({
          content: '❌ Bu komutu kullanmak için **Üyeleri Yönet** yetkisine sahip olmalısınız.',
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

      // Kendini susturamaz
      if (targetMember.id === interaction.user.id) {
        return interaction.reply({
          content: '❌ Kendinizi susturamazsınız.',
          ephemeral: true,
        });
      }

      // Botu susturamaz
      if (targetMember.id === interaction.client.user.id) {
        return interaction.reply({
          content: '❌ Beni susturamazsınız.',
          ephemeral: true,
        });
      }

      // Rol hiyerarşisi kontrolü
      if (
        targetMember.roles.highest.position >= interaction.member.roles.highest.position
        && interaction.guild.ownerId !== interaction.user.id
      ) {
        return interaction.reply({
          content: '❌ Sizden eşit veya daha yüksek role sahip bir kullanıcıyı susturamazsınız.',
          ephemeral: true,
        });
      }

      // Botun yetkisini kontrol et
      if (!targetMember.moderatable) {
        return interaction.reply({
          content: '❌ Bu kullanıcıyı susturamıyorum. Rol hiyerarşimi veya yetkilerimi kontrol edin.',
          ephemeral: true,
        });
      }

      const durationMs = durationMinutes * 60 * 1000;
      const durationLabel = DURATION_CHOICES.find((choice) => choice.value === durationMinutes)?.name ?? `${durationMinutes} dakika`;

      await targetMember.timeout(durationMs, `${reason} | Moderatör: ${interaction.user.tag}`);

      await interaction.reply({
        content: `⏳ **${targetUser.tag}** susturuldu.\n⏱️ Süre: ${durationLabel}\n📋 Sebep: ${reason}`,
      });
    } catch (error) {
      console.error('[HATA] /timeout komutu:', error);

      const replyOptions = {
        content: '❌ Kullanıcı susturulurken bir hata oluştu.',
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
