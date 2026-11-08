import { LogColors, logEvent } from '../utils/logService.js';

export default {
  name: 'channelPinsUpdate',
  async execute(channel, timestamp, client) {
    if (!channel?.guild) return;
    await logEvent(client, {
      eventType: 'channel_pins_update',
      guild: channel.guild,
      title: '📌 Kanal Sabitleri Güncellendi',
      color: LogColors.messageUpdate,
      executor: { id: null, name: 'Bilinmiyor / Tespit Edilemedi' },
      channel,
      timestamp: timestamp?.getTime?.() ?? Date.now(),
      dedupeKey: `channel_pins_update:${channel.id}:${timestamp?.getTime?.() ?? Date.now()}`,
      fields: [{ name: 'Not', value: 'Discord bu eventte sabitlenen mesajı veya işlemi yapan kişiyi doğrudan bildirmez.', inline: false }],
    });
  },
};
