import { LogColors, logEvent } from '../utils/logService.js';

export default {
  name: 'userUpdate',
  async execute(before, after, client) {
    const fields = [];
    if (before.username !== after.username) fields.push({ name: 'Kullanıcı Adı', value: `${before.username} → ${after.username}`, inline: false });
    if (before.avatar !== after.avatar) fields.push({ name: 'Avatar', value: 'Kullanıcı avatarını değiştirdi.', inline: false });
    if (fields.length === 0) return;

    for (const guild of client.guilds.cache.values()) {
      if (!guild.members.cache.has(after.id)) continue;
      await logEvent(client, {
        eventType: 'user_profile_update',
        guild,
        title: '👤 Kullanıcı Profili Güncellendi',
        color: LogColors.memberJoin,
        executor: { id: after.id, name: after.username },
        target: { id: after.id, name: after.username },
        dedupeKey: `user_profile_update:${guild.id}:${after.id}:${after.username}:${after.avatar ?? ''}`,
        fields,
      });
    }
  },
};
