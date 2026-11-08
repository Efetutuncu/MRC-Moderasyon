import { AuditLogEvent } from 'discord.js';
import { LogColors, auditExecutor, findAuditEntry, logEvent } from '../utils/logService.js';

export default {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const audit = await findAuditEntry(member.guild, AuditLogEvent.MemberKick, { targetId: member.id });
    const kicked = Boolean(audit);
    const roles = member.roles?.cache
      ?.filter((role) => role.id !== member.guild.id)
      .map((role) => role.name)
      .join(', ');

    await logEvent(client, {
      eventType: kicked ? 'member_kick' : 'member_leave',
      guild: member.guild,
      title: kicked ? '👢 Üye Sunucudan Atıldı' : '🚪 Üye Sunucudan Ayrıldı',
      color: kicked ? LogColors.moderation : LogColors.memberLeave,
      executor: auditExecutor(audit),
      target: { id: member.id, name: member.user.username },
      auditLogId: audit?.id ?? null,
      dedupeKey: `member_remove:${member.guild.id}:${member.id}:${Math.floor(Date.now() / 5000)}`,
      fields: [
        { name: 'Ayrılmadan Önceki Roller', value: roles || 'Rol yok veya erişilemedi.', inline: false },
        ...(kicked ? [{ name: 'Sebep', value: audit.reason || 'Sebep belirtilmedi', inline: false }] : []),
      ],
    });
  },
};
