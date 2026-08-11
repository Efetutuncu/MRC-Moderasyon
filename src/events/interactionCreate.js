export default {
  name: 'interactionCreate',
  async execute(interaction) {
    // 1. BUTON TIKLAMALARI (Kayıt Butonu)
    if (interaction.isButton()) {
      try {
        await interaction.deferReply({ ephemeral: true });

        const member = interaction.member;
        
        // Rol Değişkenleri (.env paneline %100 uyumlu)
        const unverifiedRoleId = process.env.UNVERIFIED_ROLE_ID || process.env.UNVERIFIED_ROLE; // Silinecek Kayıtsız Rolü
        const registeredRoleId = process.env.REGISTERED_ROLE_ID || process.env.REGISTERED_ROLE || process.env.UNREGISTERED_ROLE_ID; // Verilecek Üye Rolü

        // 1. Kayıtsız (UNVERIFIED) rolünü kullanıcıdan sil
        if (unverifiedRoleId && member.roles.cache.has(unverifiedRoleId)) {
          await member.roles.remove(unverifiedRoleId).catch((err) => 
            console.error('[HATA] Kayıtsız rolü silinemedi:', err.message)
          );
        }

        // 2. Üye (REGISTERED) rolünü kullanıcıya ver
        if (registeredRoleId) {
          await member.roles.add(registeredRoleId).then(() => {
            console.log(`[BAŞARILI] ${member.user.tag} kullanıcısına kayıtlı üye rolü verildi.`);
          }).catch((err) => {
            console.error('[HATA] Üye rolü verilemedi. Discord Hatası:', err.message);
          });
        } else {
          console.error('[HATA] REGISTERED_ROLE_ID (.env) bulunamadı!');
        }

        await interaction.editReply({
          content: '🎉 Başarıyla kayıt oldunuz! Sunucuya erişiminiz açıldı.',
        });
      } catch (error) {
        console.error('[HATA] Buton etkileşimi sırasında hata:', error);
        if (interaction.deferred) {
          await interaction.editReply({ content: 'Kayıt işlemi sırasında bir hata oluştu.' });
        }
      }
      return;
    }

    // 2. SLASH KOMUTLARI
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`[HATA] ${interaction.commandName} komutu çalıştırılamadı:`, error);
        const errorMsg = { content: 'Komut çalıştırılırken bir hata oluştu!', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMsg);
        } else {
          await interaction.reply(errorMsg);
        }
      }
    }
  },
};
