const processedMembers = new Set();

export default {
  name: 'guildMemberAdd',
  async execute(member) {
    // Çifte mesaj ve rol tetiklenmesini engellemek için 5 saniyelik kilit
    if (processedMembers.has(member.id)) return;
    
    processedMembers.add(member.id);
    setTimeout(() => processedMembers.delete(member.id), 5000);

    // 1. OTOMATİK KAYITSIZ ROLÜ VERME (UNVERIFIED_ROLE / UNVERIFIED_ROLE_ID desteği)
    const unverifiedRoleId = process.env.UNVERIFIED_ROLE || process.env.UNVERIFIED_ROLE_ID || process.env.KAYITSIZ_ROL_ID;
    if (unverifiedRoleId) {
      try {
        await member.roles.add(unverifiedRoleId);
        console.log(`[ROL] ${member.user.tag} kullanıcısına kayıtsız rolü verildi.`);
      } catch (err) {
        console.error('[HATA] Kayıtsız rolü verilirken sorun oluştu:', err);
      }
    }

    // 2. HOŞ GELDİN MESAJI
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
