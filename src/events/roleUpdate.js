import { AuditLogEvent } from 'discord.js';
import { LogColors, auditExecutor, findAuditEntry, logEvent } from '../utils/logService.js';

export default {
  name: 'roleUpdate',
  async execute(before, after, client) {
    if (before.name === after.name && before.color === after.color && before.permissions.bitfield === after.permissions.bitfield && before.position === after.position) return;
    const audit = await findAuditEntry(after.guild, AuditLogEvent.RoleUpdate, { targetId: after.id });
    const fields = [];
    if (before.name !== after.name) fields.push({ name: 'Ad', value: `${before.name} → ${after.name}`, inline: false });
    if (before.hexColor !== after.hexColor) fields.push({ name: 'Renk', value: `${before.hexColor} → ${after.hexColor}`, inline: true });
    if (before.position !== after.position) fields.push({ name: 'Sıra', value: `${before.position} → ${after.position}`, inline: true });
    if (before.permissions.bitfield !== after.permissions.bitfield) fields.push({ name: 'İzinler', value: 'Rol izinleri değiştirildi.', inline: false });

    await logEvent(client, {
      eventType: 'role_update',
      guild: after.guild,
      title: '✏️ Rol Düzenlendi',
      color: LogColors.role,
      executor: auditExecutor(audit),
      target: { id: after.id, name: after.name },
      auditLogId: audit?.id ?? null,
      dedupeKey: `role_update:${after.id}:${after.name}:${after.hexColor}:${after.position}`,
      fields: [{ name: 'Rol', value: `<@&${after.id}>\n\`${after.id}\``, inline: true }, ...fields],
    });
  },
};
