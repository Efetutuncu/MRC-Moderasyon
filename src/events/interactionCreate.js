export default {
  name: 'interactionCreate',
  async execute(interaction) {
    // 1. BUTON TIKLAMALARI (Kayıt Butonu)
    if (interaction.isButton()) {
      try {
        // Discord'a hemen yanıt veriyoruz ki "Uygulama zamanında yanıt vermedi" hatası vermesin
        await interaction.deferReply({ ephemeral: true });

        const member = interaction.member;
        const unverifiedRoleId = process.env.UNVERIFIED_ROLE_ID; // Kayıtsız Rolü
        const memberRoleId = process.env.MEMBER_ROLE_ID || process.env.UYE_ROL_ID; // Verilecek Üye Rolü

        // Kayıtsız rolünü al
        if (unverifiedRoleId && member.roles.cache.has(unverifiedRoleId)) {
          await member.roles.remove(unverifiedRoleId).catch((err) => console.error('[HATA] Kayıtsız rolü alınamadı:', err));
        }

        // Üye rolünü ver
        if (memberRoleId) {
          await member.roles.add(memberRoleId).catch((err) => console.error('[HATA] Üye rolü verilemedi:', err));
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
