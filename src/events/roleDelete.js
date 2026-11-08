import { AuditLogEvent } from 'discord.js';
import { LogColors, auditExecutor, findAuditEntry, logEvent } from '../utils/logService.js';

export default {
  name: 'roleDelete',
  async execute(role, client) {
    const audit = await findAuditEntry(role.guild, AuditLogEvent.RoleDelete, { targetId: role.id });
    await logEvent(client, {
      eventType: 'role_delete',
      guild: role.guild,
      title: '🗑️ Rol Silindi',
      color: LogColors.messageDelete,
      executor: auditExecutor(audit),
      target: { id: role.id, name: role.name },
      auditLogId: audit?.id ?? null,
      dedupeKey: `role_delete:${role.id}`,
      fields: [
        { name: 'Rol Adı', value: role.name, inline: true },
        { name: 'Rol ID', value: `\`${role.id}\``, inline: true },
      ],
    });
  },
};
