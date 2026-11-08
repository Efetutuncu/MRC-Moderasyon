import { getMessageSnapshot, LogColors, logEvent, rememberMessage } from '../utils/logService.js';

export default {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.partial) await oldMessage.fetch().catch(() => null);
    if (newMessage.partial) await newMessage.fetch().catch(() => null);

    const snapshot = getMessageSnapshot(newMessage.id);
    const before = oldMessage.content ?? snapshot?.content ?? '';
    const after = newMessage.content ?? '';
    if (before === after) return;

    await logEvent(client, {
      eventType: 'message_update',
      guild: newMessage.guild,
      title: '✏️ Mesaj Düzenlendi',
      color: LogColors.messageUpdate,
      executor: { id: newMessage.author?.id ?? null, name: newMessage.author?.username ?? 'Bilinmiyor' },
      target: newMessage.author ? { id: newMessage.author.id, name: newMessage.author.username } : null,
      channel: newMessage.channel,
      dedupeKey: `message_update:${newMessage.id}:${newMessage.editedTimestamp ?? Date.now()}`,
      fields: [
        { name: 'Mesaj ID', value: `\`${newMessage.id}\``, inline: true },
        { name: 'Eski İçerik', value: before || 'İçerik cache içinde yoktu.', inline: false },
        { name: 'Yeni İçerik', value: after || 'Mesaj boş bırakıldı.', inline: false },
      ],
    });
    rememberMessage(newMessage);
  },
};
