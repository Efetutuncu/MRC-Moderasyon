import { AuditLogEvent } from 'discord.js';
import { LogColors, auditExecutor, findAuditEntry, logEvent } from '../utils/logService.js';

export default {
  name: 'channelUpdate',
  async execute(before, after, client) {
    if (!after.guild) return;
    const fields = [];
    if (before.name !== after.name) fields.push({ name: 'Ad', value: `${before.name} → ${after.name}`, inline: false });
    if (before.topic !== after.topic) fields.push({ name: 'Konu', value: `${before.topic || 'Yok'} → ${after.topic || 'Yok'}`, inline: false });
    if (before.parentId !== after.parentId) fields.push({ name: 'Kategori', value: `${before.parentId ? `<#${before.parentId}>` : 'Yok'} → ${after.parentId ? `<#${after.parentId}>` : 'Yok'}`, inline: false });
    if (before.permissionOverwrites.cache.size !== after.permissionOverwrites.cache.size) fields.push({ name: 'İzinler', value: 'Kanal izinleri değiştirildi.', inline: false });
    if (fields.length === 0) return;

    const audit = await findAuditEntry(after.guild, AuditLogEvent.ChannelUpdate, { targetId: after.id });
    await logEvent(client, {
      eventType: 'channel_update',
      guild: after.guild,
      title: after.type === 4 ? '✏️ Kategori Düzenlendi' : '✏️ Kanal Düzenlendi',
      color: LogColors.channel,
      executor: auditExecutor(audit),
      target: { id: after.id, name: after.name },
      channel: after.type === 4 ? null : after,
      auditLogId: audit?.id ?? null,
      dedupeKey: `channel_update:${after.id}:${after.name}:${after.topic ?? ''}:${after.parentId ?? ''}`,
      fields,
    });
  },
};
