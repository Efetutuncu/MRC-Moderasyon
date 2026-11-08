import { AuditLogEvent } from 'discord.js';
import { LogColors, auditExecutor, findAuditEntry, logEvent, LogFormat } from '../utils/logService.js';

export default {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild) return;
    if (message.partial) await message.fetch().catch(() => null);

    const audit = await findAuditEntry(message.guild, AuditLogEvent.MessageDelete, {
      targetId: message.author?.id,
      channelId: message.channelId,
    });

    await logEvent(client, {
      eventType: 'message_delete',
      guild: message.guild,
      title: '🗑️ Mesaj Silindi',
      color: LogColors.messageDelete,
      executor: auditExecutor(audit),
      target: message.author ? { id: message.author.id, name: LogFormat.userName(message.author) } : null,
      channel: message.channel,
      auditLogId: audit?.id ?? null,
      dedupeKey: `message_delete:${message.id}`,
      fields: [
        { name: 'Mesaj ID', value: `\`${message.id}\``, inline: true },
        { name: 'İçerik', value: message.content || 'İçerik alınamadı veya mesaj boştu.', inline: false },
      ],
    });
  },
};
