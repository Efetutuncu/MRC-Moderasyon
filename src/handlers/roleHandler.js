import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    PermissionFlagsBits
} from 'discord.js';
import { getRoles, saveRoles } from '../utils/roleConfig.js';

export async function handleRoleInteractions(interaction) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

    // YETKİLİ KONTROLÜ
    const adminCustomIds = ['btn_rol_ekle', 'btn_rol_sil_panel', 'btn_panel_gonder', 'select_rol_sil_menu', 'modal_rol_ekle'];
    if (adminCustomIds.includes(interaction.customId)) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Bu işlemi sadece Yöneticiler yapabilir!', ephemeral: true });
        }
    }

    // Rol Ekle (+) Butonu -> Modal Açma
    if (interaction.customId === 'btn_rol_ekle') {
        const modal = new ModalBuilder().setCustomId('modal_rol_ekle').setTitle('Yeni Oyun Rolü Ekle');
        
        const roleIdInput = new TextInputBuilder().setCustomId('input_role_id').setLabel('Rol ID').setStyle(TextInputStyle.Short).setRequired(true);
        const labelInput = new TextInputBuilder().setCustomId('input_label').setLabel('Oyun Adı (Örn: VALORANT)').setStyle(TextInputStyle.Short).setRequired(true);
        const emojiInput = new TextInputBuilder().setCustomId('input_emoji').setLabel('Emoji (Örn: 🎮)').setStyle(TextInputStyle.Short).setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(roleIdInput),
            new ActionRowBuilder().addComponents(labelInput),
            new ActionRowBuilder().addComponents(emojiInput)
        );
        return await interaction.showModal(modal);
    }

    // Modal Formunu Kaydetme
    if (interaction.customId === 'modal_rol_ekle') {
        const roleId = interaction.fields.getTextInputValue('input_role_id').trim();
        const label = interaction.fields.getTextInputValue('input_label').trim();
        const emoji = interaction.fields.getTextInputValue('input_emoji').trim() || '🎮';

        const roles = getRoles();
        roles.push({ roleId, label, emoji });
        saveRoles(roles);

        return interaction.reply({ content: `✅ **${label}** rolü eklendi!`, ephemeral: true });
    }

    // Rol Sil (-) Menüsü Gösterme
    if (interaction.customId === 'btn_rol_sil_panel') {
        const roles = getRoles();
        if (roles.length === 0) return interaction.reply({ content: 'Panelde silinecek rol yok.', ephemeral: true });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_rol_sil_menu')
            .setPlaceholder('Silmek istediğiniz rolü seçin...')
            .addOptions(roles.map((r, index) => ({ label: r.label, value: index.toString(), emoji: r.emoji })));

        return interaction.reply({ components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });
    }

    // Rolü Yapılandırmadan Silme
    if (interaction.customId === 'select_rol_sil_menu') {
        const selectedIndex = parseInt(interaction.values[0]);
        let roles = getRoles();
        const removed = roles.splice(selectedIndex, 1);
        saveRoles(roles);

        return interaction.reply({ content: `🗑️ **${removed[0].label}** panelden silindi.`, ephemeral: true });
    }

    // Üye Panelini Kanala Gönder Butonu
    if (interaction.customId === 'btn_panel_gonder') {
        const roles = getRoles();
        if (roles.length === 0) return interaction.reply({ content: 'Önce en az 1 tane rol eklemelisiniz!', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🎮 MRC Topluluğu - Rol Alma Paneli')
            .setDescription('Oynadığınız oyunların rollerini almak için aşağıdaki menüden seçim yapabilirsiniz.\n\n*İşareti kaldırdığınız oyunun rolü profilinizden otomatik silinir.*')
            .setColor(0x5865f2);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_uye_rol_alma')
            .setPlaceholder('Lütfen rol almak için tıklayınız...')
            .setMinValues(0)
            .setMaxValues(roles.length)
            .addOptions(roles.map(r => ({ label: r.label, value: r.roleId, emoji: r.emoji })));

        await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
        return interaction.reply({ content: '✅ Rol paneli bulunduğunuz kanala gönderildi!', ephemeral: true });
    }

    // ÜYE ROL ALMA / ÇIKARMA SİSTEMİ
    if (interaction.customId === 'select_uye_rol_alma') {
        await interaction.deferReply({ ephemeral: true });

        const selectedRoleIds = interaction.values;
        const allConfiguredRoles = getRoles().map(r => r.roleId);
        const member = interaction.member;

        const rolesToAdd = selectedRoleIds.filter(id => !member.roles.cache.has(id));
        const rolesToRemove = allConfiguredRoles.filter(id => !selectedRoleIds.includes(id) && member.roles.cache.has(id));

        try {
            if (rolesToAdd.length > 0) await member.roles.add(rolesToAdd);
            if (rolesToRemove.length > 0) await member.roles.remove(rolesToRemove);

            return interaction.editReply({ 
                content: `✨ **Rollerin Güncellendi!**\n${rolesToAdd.length ? `➕ **Eklenenler:** ${rolesToAdd.map(id => `<@&${id}>`).join(', ')}\n` : ''}${rolesToRemove.length ? `➖ **Kaldırılanlar:** ${rolesToRemove.map(id => `<@&${id}>`).join(', ')}` : ''}`
            });
        } catch (err) {
            return interaction.editReply({ content: '❌ Rol verilirken hata oluştu. Botun rolünün, verilecek rollerin üstünde olduğundan emin ol!' });
        }
    }
}