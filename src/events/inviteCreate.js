import { LogColors, logEvent } from '../utils/logService.js';

export default {
  name: 'inviteCreate',
  async execute(invite, client) {
    if (!invite.guild) return;
    await logEvent(client, {
      eventType: 'invite_create',
      guild: invite.guild,
      title: '🔗 Davet Bağlantısı Oluşturuldu',
      color: LogColors.security,
      executor: invite.inviter ? { id: invite.inviter.id, name: invite.inviter.username } : { id: null, name: 'Bilinmiyor / Tespit Edilemedi' },
      channel: invite.channel,
      dedupeKey: `invite_create:${invite.code}`,
      fields: [
        { name: 'Davet Kodu', value: `\`${invite.code}\``, inline: true },
        { name: 'Maksimum Kullanım', value: invite.maxUses ? String(invite.maxUses) : 'Sınırsız', inline: true },
        { name: 'Sona Erme', value: invite.expiresTimestamp ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:F>` : 'Yok', inline: false },
      ],
    });
  },
};
