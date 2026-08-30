import { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('rol-yonet')
    .setDescription('Rol alma panelini ve rollerini yönetir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('⚙️ Quuinx Topluluğu - Rol Yönetim Paneli')
        .setDescription('Aşağıdaki butonları kullanarak üye paneline oyun rolleri ekleyebilir, silebilir veya paneli kanala gönderebilirsiniz.')
        .setColor(0x2b2d31);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_rol_ekle').setLabel('Rol Ekle (+)').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_rol_sil_panel').setLabel('Rol Sil (-)').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn_panel_gonder').setLabel('Üye Panelini Kanala Gönder').setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}
export default { data, execute };