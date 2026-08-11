const processedMembers = new Set();

export default {
  name: 'guildMemberAdd',
  async execute(member) {
    if (processedMembers.has(member.id)) return;
    
    processedMembers.add(member.id);
    setTimeout(() => processedMembers.delete(member.id), 5000);

    const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
    if (!channel) return;

    try {
      await channel.send({
        content: `MRC Topluluğuna hoş geldin ${member}! Sunucumuzda keyifli vakitler dileriz. Kuralları okumayı unutma! 🎉`,
      });
    } catch (err) {
      console.error('[HATA] Hoş geldin mesajı gönderilemedi:', err);
    }
  },
};
