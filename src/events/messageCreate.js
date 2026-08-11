/**
 * Message Create Event
 * 1. Kayıtsız üyelerin kanallara mesaj yazmasını engeller (Mesajı siler ve uyarır).
 * 2. Gelen mesajları spam/flood koruması ile kontrol eder.
 */

import { checkMessage } from '../utils/spamFloodGuard.js';

export default {
  name: 'messageCreate',

  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message) {
    // Botların ve sunucu dışı DM mesajlarının kontrolü
    if (!message.guild || message.author.bot) return;

    // Kayıtsız Üye Mesaj Engeli
    const isBlocked = await blockUnregisteredMessage(message);
    if (isBlocked) return;

    // Spam / Flood Koruması
    await checkMessage(message);
  },
};

/**
 * Kayıtsız üyelerin kayıt kanalı haricinde mesaj yazmasını engeller ve mesajı siler
 * @param {import('discord.js').Message} message
 */
async function blockUnregisteredMessage(message) {
  try {
    const unregisteredRoleId = process.env.UNREGISTERED_ROLE_ID;
    if (!unregisteredRoleId) return false;

    // Yönetici yetkisi olan kişileri veya yetkilileri muaf tut
    if (message.member?.permissions.has('Administrator')) return false;

    const member = message.member;
    if (!member || !member.roles.cache.has(unregisteredRoleId)) return false;

    const regChannelId = process.env.REGISTRATION_CHANNEL_ID;

    // Eğer mesaj kayıt kanalının dışındaysa sil ve uyar
    if (regChannelId && message.channelId !== regChannelId) {
      await message.delete().catch(() => null);

      // Aynı kanalda zaten aktif bir uyarı mesajı varsa tekrar tekrar spam atma
      const warning = await message.channel
        .send(`⚠️ ${message.author}, sunucuda mesaj yazabilmek için önce kayıt olmalısınız!`)
        .catch(() => null);

      // Uyarı mesajını 5 saniye sonra sil
      if (warning) {
        setTimeout(() => warning.delete().catch(() => null), 5000);
      }

      console.log(`[MESAJ ENGELİ] Kayıtsız üyenin mesajı silindi: ${message.author.tag}`);
      return true;
    }
  } catch (error) {
    console.error('[HATA] Kayıtsız üye mesaj korumasında hata:', error);
  }

  return false;
}
