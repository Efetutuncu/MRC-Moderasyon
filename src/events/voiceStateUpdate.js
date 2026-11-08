
/**
 * MRC Moderasyon - Ses Olayları
 *
 * Ses hareketleri loglanmaz.
 * Kayıtsız kullanıcıların ses kanalına girmesi engellenir.
 */

export default {
  name: 'voiceStateUpdate',

  async execute(oldState, newState) {
    const member = newState.member ?? oldState.member;

    if (!member || member.user.bot) return;

    // Yalnızca ses kanalına yeni katılma veya kanal değiştirme
    // durumunda kayıt kontrolü yapılır.
    const channelChanged =
      oldState.channelId !== newState.channelId;

    const joinedOrMoved =
      channelChanged && Boolean(newState.channelId);

    if (!joinedOrMoved) return;

    const unregisteredRoleId =
      process.env.UNREGISTERED_ROLE_ID;

    if (
      !unregisteredRoleId ||
      !member.roles.cache.has(unregisteredRoleId)
    ) {
      return;
    }

    try {
      await member.voice.disconnect(
        'Kayıtsız üye ses kanalına katılamaz.',
      );

      await member.send(
        '⚠️ **MRC Topluluğu:** Sese katılabilmek için önce kayıt olmalısınız!',
      ).catch(() => null);

    } catch (error) {
      console.error(
        '[HATA] Kayıtsız üye sesten atılamadı:',
        error,
      );
    }
  },
};

