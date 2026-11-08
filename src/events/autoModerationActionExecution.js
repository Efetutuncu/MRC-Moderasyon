import { LogColors, logEvent } from '../utils/logService.js';

export default {
  name: 'autoModerationActionExecution',
  async execute(execution, client) {
    const guild = execution.guild;
    if (!guild) return;
    await logEvent(client, {
      eventType: 'automod_execution',
      guild,
      title: '🛡️ AutoMod Kuralı Tetiklendi',
      color: LogColors.security,
      executor: { id: null, name: 'Discord AutoMod' },
      target: execution.userId ? { id: execution.userId, name: 'Kullanıcı' } : null,
      channel: execution.channelId ? guild.channels.cache.get(execution.channelId) : null,
      dedupeKey: `automod:${execution.ruleId}:${execution.userId ?? ''}:${execution.alertSystemMessageId ?? Date.now()}`,
      fields: [
        { name: 'Kural ID', value: `\`${execution.ruleId}\``, inline: true },
        { name: 'İçerik', value: execution.content || 'İçerik Discord tarafından paylaşılmadı.', inline: false },
      ],
    });
  },
};
