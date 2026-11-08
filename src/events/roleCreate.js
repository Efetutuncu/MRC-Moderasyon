import { AuditLogEvent } from 'discord.js';
import { LogColors, auditExecutor, findAuditEntry, logEvent } from '../utils/logService.js';

export default {
  name: 'roleCreate',
  async execute(role, client) {
    const audit = await findAuditEntry(role.guild, AuditLogEvent.RoleCreate, { targetId: role.id });
    await logEvent(client, {
      eventType: 'role_create',
      guild: role.guild,
      title: '🆕 Rol Oluşturuldu',
      color: LogColors.role,
      executor: auditExecutor(audit),
      target: { id: role.id, name: role.name },
      auditLogId: audit?.id ?? null,
      dedupeKey: `role_create:${role.id}`,
      fields: [
        { name: 'Rol', value: `<@&${role.id}>\n\`${role.id}\``, inline: true },
        { name: 'Renk', value: role.hexColor, inline: true },
      ],
    });
  },
};
