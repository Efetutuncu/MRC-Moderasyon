/**
 * Guild Member Add Event
 * Yeni bir üye sunucuya katıldığında kayıtsız rolü verir ve hoş geldin mesajı gönderir.
 */

export default {
  name: 'guildMemberAdd',

  /**
   * @param {import('discord.js').GuildMember} member - Sunucuya katılan üye
   * @param {import('discord.js').Client} client - Discord istemcisi
   */
  async execute(member, client) {
    await assignUnregisteredRole(member);
    await sendWelcomeMessage(member);
  },
};

/**
 * Yeni katılan üyeye kayıtsız rolünü otomatik verir
 * @param {import('discord.js').GuildMember} member
 */
async function assignUnregisteredRole(member) {
  try {
    const roleId = process.env.UNREGISTERED_ROLE_ID;

    if (!roleId) {
      console.warn('[UYARI] UNREGISTERED_ROLE_ID tanımlı değil, rol verilemedi.');
      return;
    }

    const role = await member.guild.roles.fetch(roleId).catch(() => null);

    if (!role) {
      console.error(`[HATA] UNREGISTERED_ROLE_ID ile eşleşen rol bulunamadı: ${roleId}`);
      return;
    }

    // Üyede rol zaten varsa tekrar ekleme
    if (member.roles.cache.has(role.id)) {
      return;
    }

    await member.roles.add(role, 'Yeni üye — kayıtsız rolü otomatik atandı');
    console.log(`[ROL] ${member.user.tag} kullanıcısına "${role.name}" rolü verildi.`);
  } catch (error) {
    console.error(`[HATA] ${member.user.tag} kullanıcısına rol verilemedi:`, error);
  }
}

/**
 * Hoş geldin kanalına karşılama mesajı gönderir
 * @param {import('discord.js').GuildMember} member
 */
async function sendWelcomeMessage(member) {
  try {
    const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;

    if (!welcomeChannelId) {
      console.warn('[UYARI] WELCOME_CHANNEL_ID tanımlı değil, hoş geldin mesajı gönderilemedi.');
      return;
    }

    const welcomeChannel = await member.guild.channels.fetch(welcomeChannelId).catch(() => null);

    if (!welcomeChannel?.isTextBased()) {
      console.warn(`[UYARI] Hoş geldin kanalı bulunamadı veya metin kanalı değil: ${welcomeChannelId}`);
      return;
    }

    const welcomeMessage =
      `MRC Topluluğuna hoş geldin ${member}! Sunucumuzda keyifli vakitler dileriz. Sunucu kurallarını okumayı ve uygulamayı unutma!\n` +
      `Seninle birlikte ${member.guild.memberCount} kişi olduk.`;

    await welcomeChannel.send(welcomeMessage);
  } catch (error) {
    console.error('[HATA] Hoş geldin mesajı gönderilirken sorun oluştu:', error);
  }
}
