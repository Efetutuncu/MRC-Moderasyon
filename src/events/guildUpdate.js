import { AuditLogEvent } from 'discord.js';
import { LogColors, auditExecutor, findAuditEntry, logEvent } from '../utils/logService.js';

export default {
  name: 'guildUpdate',
  async execute(before, after, client) {
    const fields = [];
    if (before.name !== after.name) fields.push({ name: 'Sunucu Adı', value: `${before.name} → ${after.name}`, inline: false });
    if (before.icon !== after.icon) fields.push({ name: 'Sunucu İkonu', value: 'Sunucu ikonu değiştirildi.', inline: false });
    if (fields.length === 0) return;

    const audit = await findAuditEntry(after, AuditLogEvent.GuildUpdate, { targetId: after.id });
    await logEvent(client, {
      eventType: 'guild_update',
      guild: after,
      title: '⚙️ Sunucu Ayarları Değiştirildi',
      color: LogColors.security,
      executor: auditExecutor(audit),
      target: { id: after.id, name: after.name },
      auditLogId: audit?.id ?? null,
      dedupeKey: `guild_update:${after.id}:${after.name}:${after.icon ?? ''}`,
      fields,
    });
  },
};
