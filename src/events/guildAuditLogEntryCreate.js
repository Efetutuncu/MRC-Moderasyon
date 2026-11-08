import { AuditLogEvent } from 'discord.js';
import { LogColors, logEvent } from '../utils/logService.js';

const securityActions = new Map([
  [AuditLogEvent.WebhookCreate, 'Webhook Oluşturuldu'],
  [AuditLogEvent.WebhookUpdate, 'Webhook Düzenlendi'],
  [AuditLogEvent.WebhookDelete, 'Webhook Silindi'],
  [AuditLogEvent.AutoModerationRuleCreate, 'AutoMod Kuralı Oluşturuldu'],
  [AuditLogEvent.AutoModerationRuleUpdate, 'AutoMod Kuralı Düzenlendi'],
  [AuditLogEvent.AutoModerationRuleDelete, 'AutoMod Kuralı Silindi'],
]);

export default {
  name: 'guildAuditLogEntryCreate',
  async execute(entry, guild, client) {
    const title = securityActions.get(entry.action);
    if (!title) return;

    await logEvent(client, {
      eventType: 'security_audit',
      guild,
      title: `🛡️ ${title}`,
      color: LogColors.security,
      executor: entry.executor ? { id: entry.executor.id, name: entry.executor.username } : { id: null, name: 'Bilinmiyor / Tespit Edilemedi' },
      target: entry.target ? { id: entry.target.id, name: entry.target.name || entry.target.id } : null,
      auditLogId: entry.id,
      dedupeKey: `security_audit:${entry.id}`,
      fields: [
        { name: 'İşlem', value: title, inline: true },
        { name: 'Sebep', value: entry.reason || 'Sebep belirtilmedi', inline: false },
      ],
    });
  },
};
