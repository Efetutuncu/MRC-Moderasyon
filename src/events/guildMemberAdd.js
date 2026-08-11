/**
 * Guild Member Add Event
 * Yeni bir üye sunucuya katıldığında:
 * 1. Otomatik kayıtsız rolü verir.
 * 2. WELCOME_CHANNEL_ID kanalına TAM 1 ADET hoş geldin mesajı gönderir (Debounce korumalı).
 */

const recentlyWelcomed = new Set();

export default {
  name: 'guildMemberAdd',

  /**
   * @param {import('discord.js').GuildMember} member - Sunucuya katılan üye
   * @param {import('discord.js').Client} client - Discord istemcisi
   */
  async execute(member, client) {
  const key = ${member.guild.id}:${member.id};

  if (recentlyWelcomed.has(key)) {
    return;
  }

  recentlyWelcomed.add(key);

  setTimeout(() => {
    recentlyWelcomed.delete(key);
  }, 30000);

  await assignUnregisteredRole(member);
  await sendWelcomeMessage(member);
}
  },
};

/**
 * Yeni katılan üyeye kayıtsız rolünü otomatik verir
 * @param {import('discord.js').GuildMember} member
 */
async function assignUnregisteredRole(member) {
  try {
    const roleId = process.env.UNREGISTERED_ROLE_ID;

    if (!roleId) return;

    const role = await member.guild.roles.fetch(roleId).catch(() => null);
    if (!role || member.roles.cache.has(role.id)) return;

    await member.roles.add(role, 'Yeni üye — kayıtsız rolü otomatik atandı');
    console.log(`[ROL] ${member.user.tag} kullanıcısına "${role.name}" rolü verildi.`);
  } catch (error) {
    console.error(`[HATA] ${member.user.tag} kullanıcısına rol verilemedi:`, error);
  }
}

/**
 * Hoş geldin kanalına TAM 1 ADET karşılama mesajı gönderir (Çift mesaj korumalı)
 * @param {import('discord.js').GuildMember} member
 */
async function sendWelcomeMessage(member) {
  // Eğer bu üyeye son 15 saniyede mesaj atıldıysa tekrar atma (Çift mesaj engelleme)
  if (recentlyWelcomed.has(member.id)) {
    console.log(`[BİLDİRİM] ${member.user.tag} için tekrar eden mesaj engellendi.`);
    return;
  }

  recentlyWelcomed.add(member.id);
  setTimeout(() => recentlyWelcomed.delete(member.id), 15000);

  try {
    const welcomeChannelId = process.env.WELCOME_CHANNEL_ID || '1533603998479941782';

    const welcomeChannel = await member.guild.channels.fetch(welcomeChannelId).catch(() => null);

    if (!welcomeChannel?.isTextBased()) {
      console.warn(`[UYARI] Hoş geldin kanalı bulunamadı veya metin kanalı değil: ${welcomeChannelId}`);
      return;
    }

    const welcomeMessage =
      `MRC Topluluğuna hoş geldin ${member}! Sunucumuzda keyifli vakitler dileriz. Kuralları okumayı unutma!\n` +
      `Seninle birlikte **${member.guild.memberCount}** kişi olduk. 🎉`;

    await welcomeChannel.send(welcomeMessage);
    console.log(`[HOŞ GELDİN] ${member.user.tag} için hoş geldin mesajı gönderildi.`);
  } catch (error) {
    console.error('[HATA] Hoş geldin mesajı gönderilirken sorun oluştu:', error);
  }
}
