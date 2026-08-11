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
      const memberCount = member.guild.memberCount;

      await channel.send({
        content: `MRC Topluluğuna hoş geldin ${member}! Sunucumuzda keyifli vakitler dileriz. Sunucu kurallarını okumayı ve uygulamayı unutma!\nSeninle birlikte ${memberCount} kişi olduk.`,
      });
    } catch (err) {
      console.error('[HATA] Hoş geldin mesajı gönderilirken sorun oluştu:', err);
    }
  },
};
