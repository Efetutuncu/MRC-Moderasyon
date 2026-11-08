/**
 * Yeni üye: kayıtsız rol, hoş geldin mesajı ve merkezi log.
 */
import { LogColors, logEvent } from '../utils/logService.js';

const recentlyWelcomed = new Set();

export default {
  name: 'guildMemberAdd',
  async execute(member, client) {
    await assignUnregisteredRole(member);
    await logEvent(client, {
      eventType: 'member_join',
      guild: member.guild,
      title: '📥 Üye Sunucuya Katıldı',
      color: LogColors.memberJoin,
      executor: { id: member.id, name: member.user.username },
      target: { id: member.id, name: member.user.username },
      dedupeKey: `member_join:${member.guild.id}:${member.id}`,
      fields: [
        { name: 'Hesap Oluşturulma', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true },
        { name: 'Sunucu Üye Sayısı', value: String(member.guild.memberCount), inline: true },
      ],
    });
    await sendWelcomeMessage(member);
  },
};

async function assignUnregisteredRole(member) {
  try {
    const roleId = process.env.UNREGISTERED_ROLE_ID;
    if (!roleId) return;
    const role = await member.guild.roles.fetch(roleId).catch(() => null);
    if (!role || member.roles.cache.has(role.id)) return;
    await member.roles.add(role, 'Yeni üye — kayıtsız rolü otomatik atandı');
    console.log(`[ROL] ${member.user.tag} kullanıcısına "${role.name}" rolü verildi.`);
  } catch (error) {
    console.error(`[HATA] ${member.user.tag} kullanıcısına rol verilemedi:`, error);
  }
}

async function sendWelcomeMessage(member) {
  if (recentlyWelcomed.has(member.id)) return;
  recentlyWelcomed.add(member.id);
  setTimeout(() => recentlyWelcomed.delete(member.id), 15_000);

  try {
    const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
    if (!welcomeChannelId) return;
    const welcomeChannel = await member.guild.channels.fetch(welcomeChannelId).catch(() => null);
    if (!welcomeChannel?.isTextBased()) return;

    await welcomeChannel.send(
      `MRC Topluluğuna hoş geldin ${member}! Sunucumuzda keyifli vakitler dileriz. Kuralları okumayı unutma!\n` +
      `Seninle birlikte **${member.guild.memberCount}** kişi olduk. 🎉`,
    );
  } catch (error) {
    console.error('[HATA] Hoş geldin mesajı gönderilirken sorun oluştu:', error);
  }
}
