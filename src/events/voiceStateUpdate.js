/**
 * Ses olaylarını loglar ve kayıtsız kullanıcıların ses korumasını sürdürür.
 */
import { LogColors, logEvent } from '../utils/logService.js';

export default {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    const changes = [];
    if (oldState.channelId !== newState.channelId) {
      if (!oldState.channelId) changes.push({ title: '🔊 Ses Kanalına Katıldı', eventType: 'voice_join', channel: newState.channel });
      else if (!newState.channelId) changes.push({ title: '🔇 Ses Kanalından Ayrıldı', eventType: 'voice_leave', channel: oldState.channel });
      else changes.push({ title: '🔁 Ses Kanalı Değiştirildi', eventType: 'voice_move', channel: newState.channel, previous: oldState.channel });
    }
    if (oldState.selfMute !== newState.selfMute) changes.push({ title: newState.selfMute ? '🎙️ Mikrofonunu Kapattı' : '🎙️ Mikrofonunu Açtı', eventType: 'voice_self_mute', channel: newState.channel });
    if (oldState.selfDeaf !== newState.selfDeaf) changes.push({ title: newState.selfDeaf ? '🎧 Kulaklığını Kapattı' : '🎧 Kulaklığını Açtı', eventType: 'voice_self_deaf', channel: newState.channel });
    if (oldState.serverMute !== newState.serverMute) changes.push({ title: newState.serverMute ? '🔇 Sunucu Tarafından Susturuldu' : '🔊 Sunucu Susturması Kaldırıldı', eventType: 'voice_server_mute', channel: newState.channel });
    if (oldState.serverDeaf !== newState.serverDeaf) changes.push({ title: newState.serverDeaf ? '🔕 Sunucu Tarafından Sağırlaştırıldı' : '🔔 Sunucu Sağırlaştırması Kaldırıldı', eventType: 'voice_server_deaf', channel: newState.channel });

    for (const change of changes) {
      await logEvent(client, {
        eventType: change.eventType,
        guild: member.guild,
        title: change.title,
        color: LogColors.voice,
        executor: { id: member.id, name: member.user.username },
        target: { id: member.id, name: member.user.username },
        channel: change.channel,
        dedupeKey: `${change.eventType}:${member.id}:${oldState.channelId ?? ''}:${newState.channelId ?? ''}:${Date.now()}`,
        fields: change.previous ? [{ name: 'Önceki Kanal', value: `<#${change.previous.id}>`, inline: true }] : [],
      });
    }

    if (!newState.channelId) return;
    const unregisteredRoleId = process.env.UNREGISTERED_ROLE_ID;
    if (!unregisteredRoleId || !member.roles.cache.has(unregisteredRoleId)) return;

    try {
      await member.voice.disconnect('Kayıtsız üye ses kanalına katılamaz.');
      await member.send('⚠️ **MRC Topluluğu:** Sese katılabilmek için önce kayıt olmalısınız!').catch(() => null);
    } catch (error) {
      console.error('[HATA] Kayıtsız üye sesten atılamadı:', error);
    }
  },
};
