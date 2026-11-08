import { AuditLogEvent } from 'discord.js';
import { LogColors, auditExecutor, findAuditEntry, logEvent } from '../utils/logService.js';

export default {
  name: 'messageDeleteBulk',
  async execute(messages, channel, client) {
    const guild = channel?.guild;
    if (!guild || messages.size === 0) return;

    const audit = await findAuditEntry(guild, AuditLogEvent.MessageBulkDelete, { channelId: channel.id });
    const authors = [...new Set(
      messages.map((message) => message.author ? `${message.author.username} (${message.author.id})` : 'Bilinmiyor')
    )].slice(0, 15);

    const previews = messages
      .filter((message) => message.content)
      .first(5)
      .map((message) => `${message.author?.username ?? 'Bilinmiyor'}: ${message.content}`)
      .join('\n');

    await logEvent(client, {
      eventType: 'message_bulk_delete',
      guild,
      title: '🗑️ Toplu Mesaj Silme',
      color: LogColors.messageDelete,
      executor: auditExecutor(audit),
      channel,
      auditLogId: audit?.id ?? null,
      dedupeKey: `message_bulk_delete:${channel.id}:${messages.firstKey()}`,
      fields: [
        { name: 'Silinen Mesaj Sayısı', value: String(messages.size), inline: true },
        { name: 'Mesaj Sahipleri', value: authors.join('\n') || 'Bilinmiyor', inline: false },
        { name: 'Erişilebilen İçerikler', value: previews || 'İçerik cache içinde yoktu.', inline: false },
      ],
    });
  },
};
