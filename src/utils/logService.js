/**
 * MRC Moderasyon merkezi Discord log sistemi.
 * Log sistemi MRC_LOG_CHANNEL_ID tanımlı değilse pasif kalır; botu durdurmaz.
 */
import { AuditLogEvent, EmbedBuilder } from 'discord.js';

const LOG_CHANNEL_ID = () => process.env.MRC_LOG_CHANNEL_ID?.trim();
const DEDUPE_WINDOW_MS = 4_000;
const AUDIT_WINDOW_MS = 15_000;
const recentEvents = new Map();
const messageSnapshots = new Map();
const MESSAGE_SNAPSHOT_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_MESSAGE_SNAPSHOTS = 2_000;
let warnedMissingChannel = false;
let warnedInvalidChannel = false;

export const LogColors = {
  messageDelete: 0xed4245,
  messageUpdate: 0xfee75c,
  memberJoin: 0x57f287,
  memberLeave: 0x747f8d,
  moderation: 0xfaa61a,
  ban: 0x992d22,
  role: 0x5865f2,
  channel: 0x9b59b6,
  voice: 0x1abc9c,
  security: 0x992d22,
  default: 0x2b2d31,
};

function truncate(value, max = 1024) {
  const text = String(value ?? 'Bilinmiyor');
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
}

function safeText(value) {
  return truncate(String(value ?? 'Bilinmiyor').replace(/@/g, '@\u200b'), 1024);
}

function unknownExecutor() {
  return { id: null, name: 'Bilinmiyor / Tespit Edilemedi' };
}

function userName(user) {
  return user?.globalName || user?.username || user?.tag || 'Bilinmiyor';
}

function userValue(userOrRecord) {
  if (!userOrRecord?.id) return 'Bilinmiyor / Tespit Edilemedi';
  return `<@${userOrRecord.id}>\n\`${userOrRecord.id}\``;
}

function channelValue(channel) {
  if (!channel?.id) return 'Bilinmiyor';
  return `<#${channel.id}>\n\`${channel.id}\``;
}

function roleValue(role) {
  if (!role?.id) return 'Bilinmiyor';
  return `<@&${role.id}>\n\`${role.id}\``;
}

/** Türkiye saatiyle ISO 8601 biçimi. */
export function turkeyIso(timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}+03:00`;
}

export function discordTime(timestamp = Date.now()) {
  return `<t:${Math.floor(timestamp / 1000)}:F>`;
}

function cleanupMessageSnapshots(now = Date.now()) {
  for (const [messageId, snapshot] of messageSnapshots) {
    if (snapshot.expiresAt <= now) messageSnapshots.delete(messageId);
  }
  while (messageSnapshots.size > MAX_MESSAGE_SNAPSHOTS) {
    messageSnapshots.delete(messageSnapshots.keys().next().value);
  }
}

/** Mesaj silinmeden önce içeriğini yalnızca bot belleğinde kısa süreli tutar. */
export function rememberMessage(message) {
  if (!message?.id || !message.guild || message.author?.bot) return;
  const now = Date.now();
  cleanupMessageSnapshots(now);
  messageSnapshots.set(message.id, {
    id: message.id,
    guildId: message.guild.id,
    channelId: message.channelId,
    authorId: message.author?.id ?? null,
    authorName: userName(message.author),
    content: message.content ?? '',
    expiresAt: now + MESSAGE_SNAPSHOT_TTL_MS,
  });
}

/** Silinmiş mesajın kısa süreli bellekteki kopyasını verir. */
export function getMessageSnapshot(messageId) {
  cleanupMessageSnapshots();
  return messageSnapshots.get(messageId) ?? null;
}

export function forgetMessageSnapshot(messageId) {
  messageSnapshots.delete(messageId);
}

function cleanupDedupe(now) {
  for (const [key, expiry] of recentEvents) {
    if (expiry <= now) recentEvents.delete(key);
  }
}

function isDuplicate(key) {
  if (!key) return false;
  const now = Date.now();
  cleanupDedupe(now);
  if (recentEvents.has(key)) return true;
  recentEvents.set(key, now + DEDUPE_WINDOW_MS);
  return false;
}

/**
 * Audit kaydını hedef ve zamanla eşleştirir. Eşleşme yoksa asla tahminde bulunmaz.
 */
export async function findAuditEntry(guild, type, { targetId, channelId } = {}) {
  if (!guild?.members?.me?.permissions?.has('ViewAuditLog')) return null;

  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 6 });
    const now = Date.now();

    return logs.entries.find((entry) => {
      if (now - entry.createdTimestamp > AUDIT_WINDOW_MS) return false;
      if (targetId && entry.target?.id !== targetId) return false;
      if (channelId && entry.extra?.channel?.id !== channelId) return false;
      return true;
    }) ?? null;
  } catch (error) {
    console.warn('[LOG] Audit Log okunamadı:', error.message);
    return null;
  }
}

export function auditExecutor(entry) {
  if (!entry?.executor) return unknownExecutor();
  return { id: entry.executor.id, name: userName(entry.executor) };
}

async function resolveLogChannel(client) {
  const channelId = LOG_CHANNEL_ID();
  if (!channelId) {
    if (!warnedMissingChannel) {
      warnedMissingChannel = true;
      console.warn('[LOG] MRC_LOG_CHANNEL_ID tanımlı değil; log sistemi devre dışı.');
    }
    return null;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) throw new Error('Metin tabanlı kanal değil.');
    return channel;
  } catch (error) {
    if (!warnedInvalidChannel) {
      warnedInvalidChannel = true;
      console.warn(`[LOG] Log kanalı kullanılamıyor (${channelId}): ${error.message}`);
    }
    return null;
  }
}

/**
 * Tüm log olaylarının geçtiği merkezi gönderici.
 * @param {import('discord.js').Client} client
 * @param {object} record
 */
export async function logEvent(client, record) {
  const {
    eventType,
    guild,
    title,
    color = LogColors.default,
    executor = unknownExecutor(),
    target = null,
    channel = null,
    fields = [],
    timestamp = Date.now(),
    auditLogId = null,
    dedupeKey,
  } = record;

  if (!guild || isDuplicate(dedupeKey || `${eventType}:${guild.id}:${target?.id ?? ''}:${channel?.id ?? ''}`)) {
    return false;
  }

  const logChannel = await resolveLogChannel(client);
  if (!logChannel) return false;

  const normalizedFields = [
    { name: 'İşlemi Yapan', value: userValue(executor), inline: true },
    ...(target ? [{ name: 'Etkilenen', value: userValue(target), inline: true }] : []),
    ...(channel ? [{ name: 'Kanal', value: channelValue(channel), inline: true }] : []),
    ...fields.map((field) => ({
      name: truncate(field.name, 256),
      value: safeText(field.value),
      inline: Boolean(field.inline),
    })),
    {
      name: 'Tarih',
      value: `${discordTime(timestamp)}\n\`${turkeyIso(timestamp)}\``,
      inline: false,
    },
  ].slice(0, 25);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(truncate(title, 256))
    .addFields(normalizedFields)
    .setFooter({
      text: `MRC Moderasyon • ${eventType}${auditLogId ? ` • Audit: ${auditLogId}` : ''}`,
    })
    .setTimestamp(timestamp);

  try {
    await logChannel.send({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
    return true;
  } catch (error) {
    console.error(`[LOG] ${eventType} gönderilemedi:`, error.message);
    return false;
  }
}

export const LogFormat = {
  safeText,
  userValue,
  channelValue,
  roleValue,
  unknownExecutor,
  userName,
};
