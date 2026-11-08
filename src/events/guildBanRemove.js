import { AuditLogEvent } from 'discord.js';
import { LogColors, auditExecutor, findAuditEntry, logEvent } from '../utils/logService.js';

export default {
  name: 'guildBanRemove',
  async execute(ban, client) {
    const audit = await findAuditEntry(ban.guild, AuditLogEvent.MemberBanRemove, { targetId: ban.user.id });
    await logEvent(client, {
      eventType: 'member_unban',
      guild: ban.guild,
      title: '🔓 Üyenin Yasağı Kaldırıldı',
      color: LogColors.memberJoin,
      executor: auditExecutor(audit),
      target: { id: ban.user.id, name: ban.user.username },
      auditLogId: audit?.id ?? null,
      dedupeKey: `member_unban:${ban.guild.id}:${ban.user.id}`,
      fields: [{ name: 'Sebep', value: audit?.reason || 'Sebep belirtilmedi', inline: false }],
    });
  },
};
