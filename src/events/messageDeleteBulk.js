import { AuditLogEvent } from 'discord.js';
import { LogColors, auditExecutor, findAuditEntry, forgetMessageSnapshot, getMessageSnapshot, logEvent } from '../utils/logService.js';

export default {
  name: 'messageDeleteBulk',
  async execute(messages, channel, client) {
    const guild = channel?.guild;
    if (!guild || messages.size === 0) return;

    const audit = await findAuditEntry(guild, AuditLogEvent.MessageBulkDelete, { channelId: channel.id });
    const authors = [...new Set(
      messages.map((message) => {
        const snapshot = getMessageSnapshot(message.id);
        return message.author ? `${message.author.username} (${message.author.id})` : snapshot?.authorId ? `${snapshot.authorName} (${snapshot.authorId})` : 'Bilinmiyor';
      })
    )].slice(0, 15);

    const previews = messages
      .map((message) => ({ message, snapshot: getMessageSnapshot(message.id) }))
      .filter(({ message, snapshot }) => message.content || snapshot?.content)
      .first(5)
      .map(({ message, snapshot }) => `${message.author?.username ?? snapshot?.authorName ?? 'Bilinmiyor'}: ${message.content || snapshot?.content}`)
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
    messages.forEach((message) => forgetMessageSnapshot(message.id));
  },
};
