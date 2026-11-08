import { AuditLogEvent } from 'discord.js';
import { LogColors, auditExecutor, findAuditEntry, logEvent } from '../utils/logService.js';

function roleDifference(before, after) {
  const added = after.roles.cache.filter((role) => role.id !== after.guild.id && !before.roles.cache.has(role.id));
  const removed = before.roles.cache.filter((role) => role.id !== before.guild.id && !after.roles.cache.has(role.id));
  return { added, removed };
}

export default {
  name: 'guildMemberUpdate',
  async execute(before, after, client) {
    if (after.user.bot) return;

    if (before.nickname !== after.nickname) {
      const audit = await findAuditEntry(after.guild, AuditLogEvent.MemberUpdate, { targetId: after.id });
      await logEvent(client, {
        eventType: 'member_nickname_update',
        guild: after.guild,
        title: '🪪 Sunucu Takma Adı Değiştirildi',
        color: LogColors.memberJoin,
        executor: auditExecutor(audit),
        target: { id: after.id, name: after.user.username },
        auditLogId: audit?.id ?? null,
        dedupeKey: `member_nickname:${after.id}:${after.nickname ?? 'none'}`,
        fields: [
          { name: 'Eski Takma Ad', value: before.nickname || 'Yok', inline: true },
          { name: 'Yeni Takma Ad', value: after.nickname || 'Yok', inline: true },
        ],
      });
    }

    const { added, removed } = roleDifference(before, after);
    for (const role of added.values()) {
      const audit = await findAuditEntry(after.guild, AuditLogEvent.MemberRoleUpdate, { targetId: after.id });
      await logEvent(client, {
        eventType: 'member_role_add',
        guild: after.guild,
        title: '➕ Üyeye Rol Verildi',
        color: LogColors.role,
        executor: auditExecutor(audit),
        target: { id: after.id, name: after.user.username },
        auditLogId: audit?.id ?? null,
        dedupeKey: `member_role_add:${after.id}:${role.id}`,
        fields: [{ name: 'Verilen Rol', value: `<@&${role.id}>\n\`${role.id}\``, inline: true }],
      });
    }

    for (const role of removed.values()) {
      const audit = await findAuditEntry(after.guild, AuditLogEvent.MemberRoleUpdate, { targetId: after.id });
      await logEvent(client, {
        eventType: 'member_role_remove',
        guild: after.guild,
        title: '➖ Üyeden Rol Alındı',
        color: LogColors.role,
        executor: auditExecutor(audit),
        target: { id: after.id, name: after.user.username },
        auditLogId: audit?.id ?? null,
        dedupeKey: `member_role_remove:${after.id}:${role.id}`,
        fields: [{ name: 'Alınan Rol', value: `<@&${role.id}>\n\`${role.id}\``, inline: true }],
      });
    }

    const beforeTimeout = before.communicationDisabledUntilTimestamp ?? null;
    const afterTimeout = after.communicationDisabledUntilTimestamp ?? null;
    if (beforeTimeout !== afterTimeout) {
      const audit = await findAuditEntry(after.guild, AuditLogEvent.MemberUpdate, { targetId: after.id });
      const active = Boolean(afterTimeout && afterTimeout > Date.now());
      await logEvent(client, {
        eventType: active ? 'member_timeout' : 'member_timeout_remove',
        guild: after.guild,
        title: active ? '⏳ Üyeye Timeout Uygulandı' : '✅ Üyenin Timeout İşlemi Kaldırıldı',
        color: LogColors.moderation,
        executor: auditExecutor(audit),
        target: { id: after.id, name: after.user.username },
        auditLogId: audit?.id ?? null,
        dedupeKey: `member_timeout:${after.id}:${afterTimeout ?? 'removed'}`,
        fields: [
          { name: 'Bitiş Zamanı', value: active ? `<t:${Math.floor(afterTimeout / 1000)}:F>` : 'Timeout kaldırıldı.', inline: false },
          { name: 'Sebep', value: audit?.reason || 'Sebep belirtilmedi', inline: false },
        ],
      });
    }

    if (before.premiumSinceTimestamp !== after.premiumSinceTimestamp) {
      const started = Boolean(after.premiumSinceTimestamp);
      await logEvent(client, {
        eventType: started ? 'member_boost_start' : 'member_boost_end',
        guild: after.guild,
        title: started ? '🚀 Üye Sunucuyu Boostladı' : '📉 Üyenin Boost Durumu Değişti',
        color: LogColors.memberJoin,
        executor: { id: after.id, name: after.user.username },
        target: { id: after.id, name: after.user.username },
        dedupeKey: `member_boost:${after.id}:${after.premiumSinceTimestamp ?? 'ended'}`,
        fields: [],
      });
    }
  },
};
