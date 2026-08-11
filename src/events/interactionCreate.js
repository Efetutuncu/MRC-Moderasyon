export default {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isButton()) {
      try {
        await interaction.deferReply({ ephemeral: true });

        const member = interaction.member;
        const unverifiedRoleId = process.env.UNVERIFIED_ROLE || process.env.UNVERIFIED_ROLE_ID;
        const unregisteredRoleId = process.env.UNREGISTERED_ROLE || process.env.UNREGISTERED_ROLE_ID;

        // Terminal Logu (Hangi ID'lerin geldiğini görmek için)
        console.log(`[KAYIT ISLEMI] UNVERIFIED ID: ${unverifiedRoleId} | UNREGISTERED ID: ${unregisteredRoleId}`);

        if (!unregisteredRoleId) {
          console.error('[HATA] UNREGISTERED_ROLE (.env) tanimlanmamis veya okunamiyor!');
          return await interaction.editReply({ content: 'Sistem hatası: Üye rolü ID\'si bulunamadı.' });
        }

        // 1. Kayıtsız rolünü sil
        if (unverifiedRoleId && member.roles.cache.has(unverifiedRoleId)) {
          await member.roles.remove(unverifiedRoleId).catch((err) => 
            console.error('[HATA] Kayıtsız rolü silinemedi:', err.message)
          );
        }

        // 2. Üye rolünü ekle
        await member.roles.add(unregisteredRoleId).then(() => {
          console.log(`[BAŞARILI] ${member.user.tag} kullanıcısına üye rolü verildi.`);
        }).catch((err) => {
          console.error('[HATA] Üye rolü verilemedi. Discord Hatası:', err.message);
        });

        await interaction.editReply({
          content: '🎉 Başarıyla kayıt oldunuz! Sunucuya erişiminiz açıldı.',
        });
      } catch (error) {
        console.error('[HATA] Buton hatası:', error);
        if (interaction.deferred) {
          await interaction.editReply({ content: 'Kayıt sırasında bir hata oluştu.' });
        }
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`[HATA] ${interaction.commandName} çalıştırılamadı:`, error);
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
