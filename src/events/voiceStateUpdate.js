/**
 * Voice State Update Event
 * Kayıtsız rolüne sahip üyelerin sese girmesini engeller (Otomatik Ses Koruması).
 */

export default {
  name: 'voiceStateUpdate',

  /**
   * @param {import('discord.js').VoiceState} oldState
   * @param {import('discord.js').VoiceState} newState
   */
  async execute(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    // Kullanıcı bir ses kanalına bağlandı mı veya odasını değiştirdi mi?
    if (!newState.channelId) return;

    const unregisteredRoleId = process.env.UNREGISTERED_ROLE_ID;
    if (!unregisteredRoleId) return;

    // Kullanıcıda kayıtsız rolü var mı?
    if (member.roles.cache.has(unregisteredRoleId)) {
      try {
        // Ses kanalından çıkar
        await member.voice.disconnect('Kayıtsız üye ses kanalına katılamaz.');
        console.log(`[SES ENGELİ] Kayıtsız kullanıcı sesten atıldı: ${member.user.tag}`);

        // Kullanıcıya özel mesaj gönder
        await member
          .send('⚠️ **Quuinx Topluluğu:** Sese katılabilmek için önce kayıt olmalısınız!')
          .catch(() => null);
      } catch (error) {
        console.error('[HATA] Kayıtsız üye sesten atılamadı:', error);
      }
    }
  },
};
