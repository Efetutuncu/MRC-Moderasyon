/**
 * ErensiBOT Tarzı Kayıt Sistemi İşleyicisi
 * Kullanıcı ✅ butonuna veya reaksiyonuna tıkladığında kayıtsız rolünü kaldırır, üye yapar.
 */

export async function handleRegistrationInteraction(interaction) {
  if (!interaction.isButton()) return false;
  if (interaction.customId !== 'btn_user_register') return false;

  try {
    const member = interaction.member;
    const guild = interaction.guild;

    if (!member || !guild) {
      await interaction.reply({
        content: '❌ Kullanıcı bilgisine ulaşılamadı.',
        ephemeral: true,
      });
      return true;
    }

    const unregisteredRoleId = process.env.UNREGISTERED_ROLE_ID;
    const registeredRoleId = process.env.REGISTERED_ROLE_ID; // İsteğe bağlı kayıtlı üye rolü

    let changesMade = false;

    // 1. Kayıtsız rolünü kaldır
    if (unregisteredRoleId && member.roles.cache.has(unregisteredRoleId)) {
      await member.roles.remove(unregisteredRoleId, 'Kullanıcı kayıt butonuna tıkladı.');
      changesMade = true;
    }

    // 2. Varsa Kayıtlı / Üye rolünü ver
    if (registeredRoleId) {
      const regRole = await guild.roles.fetch(registeredRoleId).catch(() => null);
      if (regRole && !member.roles.cache.has(regRole.id)) {
        await member.roles.add(regRole, 'Kullanıcı kayıt butonuna tıkladı.');
        changesMade = true;
      }
    }

    if (changesMade || (!unregisteredRoleId && !registeredRoleId)) {
      await interaction.reply({
        content: '✅ **Başarıyla kayıt oldunuz!** Sunucumuza hoş geldiniz, keyifli vakitler dileriz.',
        ephemeral: true,
      });
      console.log(`[KAYIT] ${member.user.tag} kayıt işlemini tamamladı.`);
    } else {
      await interaction.reply({
        content: 'ℹ️ Zaten kayıtlı durumdasınız.',
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error('[HATA] Kayıt işlemi sırasında hata:', error);
    try {
      await interaction.reply({
        content: '❌ Kayıt yapılırken bir hata oluştu. Lütfen bir yetkiliye bildirin.',
        ephemeral: true,
      });
    } catch {}
  }

  return true;
}
