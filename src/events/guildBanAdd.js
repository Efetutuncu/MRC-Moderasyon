import { AuditLogEvent } from 'discord.js';
import { LogColors, auditExecutor, findAuditEntry, logEvent } from '../utils/logService.js';

export default {
  name: 'guildBanAdd',
  async execute(ban, client) {
    const audit = await findAuditEntry(ban.guild, AuditLogEvent.MemberBanAdd, { targetId: ban.user.id });
    await logEvent(client, {
      eventType: 'member_ban',
      guild: ban.guild,
      title: '🔨 Üye Yasaklandı',
      color: LogColors.ban,
      executor: auditExecutor(audit),
      target: { id: ban.user.id, name: ban.user.username },
      auditLogId: audit?.id ?? null,
      dedupeKey: `member_ban:${ban.guild.id}:${ban.user.id}`,
      fields: [{ name: 'Sebep', value: audit?.reason || ban.reason || 'Sebep belirtilmedi', inline: false }],
    });
  },
};
