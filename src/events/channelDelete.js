import { AuditLogEvent } from 'discord.js';
import { LogColors, auditExecutor, findAuditEntry, logEvent } from '../utils/logService.js';

export default {
  name: 'channelDelete',
  async execute(channel, client) {
    if (!channel.guild) return;
    const audit = await findAuditEntry(channel.guild, AuditLogEvent.ChannelDelete, { targetId: channel.id });
    await logEvent(client, {
      eventType: 'channel_delete',
      guild: channel.guild,
      title: channel.type === 4 ? '🗑️ Kategori Silindi' : '🗑️ Kanal Silindi',
      color: LogColors.messageDelete,
      executor: auditExecutor(audit),
      target: { id: channel.id, name: channel.name },
      auditLogId: audit?.id ?? null,
      dedupeKey: `channel_delete:${channel.id}`,
      fields: [
        { name: 'Kanal Adı', value: channel.name, inline: true },
        { name: 'Kanal ID', value: `\`${channel.id}\``, inline: true },
      ],
    });
  },
};
