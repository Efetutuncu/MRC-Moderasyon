import { AuditLogEvent } from 'discord.js';
import { LogColors, auditExecutor, findAuditEntry, logEvent } from '../utils/logService.js';

export default {
  name: 'channelCreate',
  async execute(channel, client) {
    if (!channel.guild) return;
    const audit = await findAuditEntry(channel.guild, AuditLogEvent.ChannelCreate, { targetId: channel.id });
    await logEvent(client, {
      eventType: 'channel_create',
      guild: channel.guild,
      title: channel.type === 4 ? '🗂️ Kategori Oluşturuldu' : '🆕 Kanal Oluşturuldu',
      color: LogColors.channel,
      executor: auditExecutor(audit),
      target: { id: channel.id, name: channel.name },
      channel,
      auditLogId: audit?.id ?? null,
      dedupeKey: `channel_create:${channel.id}`,
      fields: [{ name: 'Tür', value: String(channel.type), inline: true }],
    });
  },
};
