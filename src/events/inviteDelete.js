import { LogColors, logEvent } from '../utils/logService.js';

export default {
  name: 'inviteDelete',
  async execute(invite, client) {
    if (!invite.guild) return;
    await logEvent(client, {
      eventType: 'invite_delete',
      guild: invite.guild,
      title: '🗑️ Davet Bağlantısı Silindi',
      color: LogColors.security,
      executor: { id: null, name: 'Bilinmiyor / Tespit Edilemedi' },
      channel: invite.channel,
      dedupeKey: `invite_delete:${invite.code}`,
      fields: [{ name: 'Davet Kodu', value: `\`${invite.code}\``, inline: true }],
    });
  },
};
