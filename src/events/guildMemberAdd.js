const processedMembers = new Set();

export default {
  name: 'guildMemberAdd',
  async execute(member) {
    // Aynı üye için 5 saniye içinde tekrar tetiklendiyse işlemi engelle
    if (processedMembers.has(member.id)) return;
    
    processedMembers.add(member.id);
    setTimeout(() => processedMembers.delete(member.id), 5000);

    // --- HOŞ GELDİN / KAYIT MESAJI KODLARIN BURADAN DEVAM EDİYOR ---
    const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
    if (!channel) return;

    await channel.send({
      content: `MRC Topluluğuna hoş geldin ${member}! Sunucumuzda keyifli vakitler dileriz. Kuralları okumayı unutma! 🎉`,
    });
  },
};
