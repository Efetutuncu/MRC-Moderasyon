/**
 * Message Reaction Add Event
 * Kullanıcı ✅ emojisine tıkladığında otomatik kayıt yapar (ErensiBOT uyumluluğu).
 */

export default {
  name: 'messageReactionAdd',

  /**
   * @param {import('discord.js').MessageReaction} reaction
   * @param {import('discord.js').User} user
   */
  async execute(reaction, user) {
    if (user.bot) return;

    // Emoji ✅ mi?
    if (reaction.emoji.name !== '✅' && reaction.emoji.name !== 'white_check_mark') return;

    try {
      // Partial reaction/message ise tam veriyi çek
      if (reaction.partial) {
        await reaction.fetch().catch(() => null);
      }

      const guild = reaction.message.guild;
      if (!guild) return;

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) return;

      const unregisteredRoleId = process.env.UNREGISTERED_ROLE_ID;
      const registeredRoleId = process.env.REGISTERED_ROLE_ID || '1533614099064291408';

      let changesMade = false;

      // Kayıtsız rolünü kaldır
      if (unregisteredRoleId && member.roles.cache.has(unregisteredRoleId)) {
        await member.roles.remove(unregisteredRoleId, 'Kullanıcı ✅ reaksiyonuna tıkladı.');
        changesMade = true;
      }

      // Varsa Kayıtlı rolünü ver
      if (registeredRoleId) {
        const regRole = await guild.roles.fetch(registeredRoleId).catch(() => null);
        if (regRole && !member.roles.cache.has(regRole.id)) {
          await member.roles.add(regRole, 'Kullanıcı ✅ reaksiyonuna tıkladı.');
          changesMade = true;
        }
      }

      if (changesMade) {
        console.log(`[REAKSİYON KAYIT] ${member.user.tag} ✅ reaksiyonu ile kayıt oldu.`);
      }
    } catch (error) {
      console.error('[HATA] Reaksiyon kaydı sırasında hata:', error);
    }
  },
};
