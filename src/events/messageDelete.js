import { AuditLogEvent } from 'discord.js';
import { LogColors, auditExecutor, findAuditEntry, forgetMessageSnapshot, getMessageSnapshot, logEvent, LogFormat } from '../utils/logService.js';

export default {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild) return;
    if (message.partial) await message.fetch().catch(() => null);

    const snapshot = getMessageSnapshot(message.id);
    const author = message.author || (snapshot?.authorId ? { id: snapshot.authorId, username: snapshot.authorName } : null);
    const channel = message.channel || message.guild.channels.cache.get(snapshot?.channelId || message.channelId);
    const content = message.content || snapshot?.content || 'İçerik alınamadı veya mesaj boştu.';

    const audit = await findAuditEntry(message.guild, AuditLogEvent.MessageDelete, {
      targetId: author?.id,
      channelId: message.channelId,
    });

    await logEvent(client, {
      eventType: 'message_delete',
      guild: message.guild,
      title: '🗑️ Mesaj Silindi',
      color: LogColors.messageDelete,
      executor: auditExecutor(audit),
      target: author ? { id: author.id, name: LogFormat.userName(author) } : null,
      channel,
      auditLogId: audit?.id ?? null,
      dedupeKey: `message_delete:${message.id}`,
      fields: [
        { name: 'Mesaj ID', value: `\`${message.id}\``, inline: true },
        { name: 'İçerik', value: content, inline: false },
      ],
    });
    forgetMessageSnapshot(message.id);
  },
};
