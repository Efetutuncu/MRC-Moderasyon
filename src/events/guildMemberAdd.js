import { EmbedBuilder } from 'discord.js';

const processedMembers = new Set();

export default {
  name: 'guildMemberAdd',
  async execute(member) {
    // Çifte mesaj gönderimini engellemek için 5 saniyelik kilit
    if (processedMembers.has(member.id)) return;
    
    processedMembers.add(member.id);
    setTimeout(() => processedMembers.delete(member.id), 5000);

    const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
    if (!channel) return;

    try {
      // Şık Embed Mesaj Tasarımı
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎉 Aramıza Yeni Biri Katıldı!')
        .setDescription(`Hoş geldin ${member}! Sunucumuzda keyifli vakit geçirmeni dileriz.\n\nKayıt olmak için lütfen **kayıt kanalındaki** butona tıklamayı veya yetkilileri beklemeyi unutma!`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `${member.guild.name} • Toplam Üye: ${member.guild.memberCount}` })
        .setTimestamp();

      await channel.send({
        content: `Hey ${member}, aramıza hoş geldin!`,
        embeds: [welcomeEmbed],
      });
    } catch (err) {
      console.error('[HATA] Hoş geldin mesajı gönderilirken sorun oluştu:', err);
    }
  },
};
