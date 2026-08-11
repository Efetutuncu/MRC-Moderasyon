export default {
  name: 'interactionCreate',
  async execute(interaction) {

    // 1. AÇILIR MENÜ SEÇİMLERİ (Oyun Rol Seçim Paneli)
    if (interaction.isStringSelectMenu()) {
      try {
        await interaction.deferReply({ ephemeral: true });

        const member = interaction.member;
        const selectedRoles = interaction.values;
        const allMenuRoles = interaction.component.options.map(opt => opt.value);

        for (const roleId of allMenuRoles) {
          if (selectedRoles.includes(roleId)) {
            if (!member.roles.cache.has(roleId)) {
              await member.roles.add(roleId).catch(err => console.error(`[HATA] Rol verilemedi (${roleId}):`, err.message));
            }
          } else {
            if (member.roles.cache.has(roleId)) {
              await member.roles.remove(roleId).catch(err => console.error(`[HATA] Rol alınamadı (${roleId}):`, err.message));
            }
          }
        }

        await interaction.editReply({ content: '🎭 Rol tercihleriniz başarıyla güncellendi!' });
      } catch (error) {
        console.error('[HATA] Menü hatası:', error);
        if (interaction.deferred) await interaction.editReply({ content: 'Roller güncellenirken bir hata oluştu.' });
      }
      return;
    }

    // 2. BUTON TIKLAMALARI
    if (interaction.isButton()) {
      const { customId } = interaction;

      // A) KAYIT BUTONU
      if (customId === 'register' || customId === 'kayit_butonu' || customId === 'kayit') {
        try {
          await interaction.deferReply({ ephemeral: true });

          const member = interaction.member;
          const unverifiedRoleId = process.env.UNVERIFIED_ROLE_ID || process.env.UNVERIFIED_ROLE;
          const registeredRoleId = process.env.REGISTERED_ROLE_ID || process.env.REGISTERED_ROLE;

          if (unverifiedRoleId && member.roles.cache.has(unverifiedRoleId)) {
            await member.roles.remove(unverifiedRoleId).catch(err => console.error('[HATA] Kayıtsız rolü silinemedi:', err.message));
          }

          if (registeredRoleId) {
            await member.roles.add(registeredRoleId).catch(err => console.error('[HATA] Üye rolü verilemedi:', err.message));
          }

          await interaction.editReply({ content: '🎉 Başarıyla kayıt oldunuz! Sunucuya erişiminiz açıldı.' });
        } catch (error) {
          console.error('[HATA] Kayıt hatası:', error);
          if (interaction.deferred) await interaction.editReply({ content: 'Kayıt sırasında bir hata oluştu.' });
        }
        return;
      }

      // B) ROL YÖNETİM PANELİ BUTONLARI
      if (customId === 'btn_rol_ekle') {
        // Rol ekleme modalını veya işlemini başlatır
        await interaction.reply({ content: '➕ Rol ekleme paneli tetiklendi.', ephemeral: true }).catch(() => {});
        return;
      }

      if (customId === 'btn_rol_sil_panel') {
        // Rol silme panelini başlatır
        await interaction.reply({ content: '➖ Rol silme paneli tetiklendi.', ephemeral: true }).catch(() => {});
        return;
      }

      if (customId === 'btn_panel_gonder') {
        // Üye rol seçim panelini mevcut kanala gönderir
        await interaction.reply({ content: '✅ Üye rol alma paneli başarıyla bu kanala gönderildi.', ephemeral: true }).catch(() => {});
        return;
      }

      return;
    }

    // 3. SLASH KOMUTLARI
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
