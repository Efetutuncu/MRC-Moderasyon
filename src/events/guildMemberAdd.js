/**
 * Guild Member Add Event
 * Yeni bir üye sunucuya katıldığında sadece kayıtsız rolü verir.
 * Kayıt mesajı kanalda sabit durur, yeni üye tıklayarak kayıt olur.
 */

export default {
  name: 'guildMemberAdd',

  /**
   * @param {import('discord.js').GuildMember} member - Sunucuya katılan üye
   * @param {import('discord.js').Client} client - Discord istemcisi
   */
  async execute(member, client) {
    await assignUnregisteredRole(member);
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

    if (member.roles.cache.has(role.id)) {
      return;
    }

    await member.roles.add(role, 'Yeni üye — kayıtsız rolü otomatik atandı');
    console.log(`[ROL] ${member.user.tag} kullanıcısına "${role.name}" rolü verildi.`);
  } catch (error) {
    console.error(`[HATA] ${member.user.tag} kullanıcısına rol verilemedi:`, error);
  }
}
