/**
 * Spam / Flood Koruma Sistemi
 * Kullanıcı mesajlarını izler, ihlal tespit eder ve yaptırım uygular.
 */

import { PermissionFlagsBits } from 'discord.js';
import {
  addViolation,
  buildPersistentViolationMessage,
  shouldNotifyPersistentViolation,
} from './violationTracker.js';

const WINDOW_MS = 10_000;
const SPAM_SAME_MESSAGE_THRESHOLD = 3;
const FLOOD_MESSAGE_THRESHOLD = 5;

const SPAM_TIMEOUT_MS = 5 * 60 * 1000;
const FLOOD_TIMEOUT_MS = 1 * 60 * 1000;

/** @type {Map<string, Array<{ content: string, timestamp: number, message: import('discord.js').Message }>>} */
const messageCache = new Map();

/** İhlal işlenirken aynı kullanıcı için tekrar tetiklenmeyi engeller */
/** @type {Set<string>} */
const processingUsers = new Set();

/** İhlal sonrası kısa süreli bekleme (ms) — ardışık çift işlemeyi önler */
/** @type {Map<string, number>} */
const violationCooldowns = new Map();

const VIOLATION_COOLDOWN_MS = 10_000;

const STAFF_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
];

/**
 * Kullanıcının koruma sisteminden muaf olup olmadığını kontrol eder
 * @param {import('discord.js').Message} message
 * @returns {boolean}
 */
function isExempt(message) {
  if (message.author.bot) return true;
  if (!message.member) return true;

  return STAFF_PERMISSIONS.some((permission) => message.member.permissions.has(permission));
}

/**
 * Kullanıcının hâlihazırda timeout (susturma) cezasında olup olmadığını kontrol eder
 * @param {import('discord.js').GuildMember | null} member
 * @returns {boolean}
 */
function isTimedOut(member) {
  if (!member?.communicationDisabledUntil) return false;
  return member.communicationDisabledUntil.getTime() > Date.now();
}

/**
 * Kullanıcının ihlal cooldown sürecinde olup olmadığını kontrol eder
 * @param {string} cacheKey
 * @returns {boolean}
 */
function isOnViolationCooldown(cacheKey) {
  const cooldownUntil = violationCooldowns.get(cacheKey);
  if (!cooldownUntil) return false;

  if (Date.now() >= cooldownUntil) {
    violationCooldowns.delete(cacheKey);
    return false;
  }

  return true;
}

/**
 * Kullanıcı mesaj geçmişi anahtarı
 * @param {string} guildId
 * @param {string} userId
 */
function getCacheKey(guildId, userId) {
  return `${guildId}-${userId}`;
}

/**
 * Süresi dolmuş mesaj kayıtlarını temizler
 * @param {Array<{ content: string, timestamp: number, message: import('discord.js').Message }>} entries
 * @param {number} now
 */
function pruneOldEntries(entries, now) {
  while (entries.length > 0 && now - entries[0].timestamp > WINDOW_MS) {
    entries.shift();
  }
}

/**
 * Mesaj içeriğini karşılaştırma için normalize eder
 * @param {string} content
 */
function normalizeContent(content) {
  return content.trim().toLowerCase();
}

/**
 * Kullanıcıya DM ile bilgilendirme mesajı gönderir (hata durumunda bot çökmez)
 * @param {import('discord.js').User} user
 * @param {string} dmMessage
 */
async function sendViolationDM(user, dmMessage) {
  try {
    await user.send(dmMessage);
  } catch (error) {
    console.warn(`[UYARI] ${user.tag} kullanıcısına DM gönderilemedi (DM kapalı olabilir):`, error.message);
  }
}

/**
 * İhlale neden olan mesajları siler
 * @param {import('discord.js').Message[]} messages
 */
async function deleteViolationMessages(messages) {
  for (const msg of messages) {
    try {
      if (msg.deletable) {
        await msg.delete();
      }
    } catch (error) {
      console.warn(`[UYARI] Mesaj silinemedi (${msg.id}):`, error.message);
    }
  }
}

/**
 * Sürekli ihlal bildirimini ilgili kanala gönderir
 * @param {import('discord.js').Message} message
 * @param {string} userId
 * @param {Array<{ timestamp: Date, reason: 'Spam' | 'Flood' }>} violations
 */
async function notifyPersistentViolation(message, userId, violations) {
  try {
    const channelId = process.env.SUREKLI_IHLAL_CHANNEL_ID;

    if (!channelId) {
      console.warn('[UYARI] SUREKLI_IHLAL_CHANNEL_ID tanımlı değil, sürekli ihlal bildirimi gönderilemedi.');
      return;
    }

    const channel = await message.guild.channels.fetch(channelId).catch(() => null);

    if (!channel?.isTextBased()) {
      console.warn(`[UYARI] Sürekli ihlal kanalı bulunamadı: ${channelId}`);
      return;
    }

    const notification = buildPersistentViolationMessage(userId, violations);
    await channel.send(notification);
  } catch (error) {
    console.error('[HATA] Sürekli ihlal bildirimi gönderilemedi:', error);
  }
}

/**
 * İhlal tespit edildiğinde yaptırımları uygular
 * @param {import('discord.js').Message} message
 * @param {'Spam' | 'Flood'} reason
 * @param {import('discord.js').Message[]} violationMessages
 */
async function applyViolation(message, reason, violationMessages) {
  const { member, author, guild } = message;

  if (isTimedOut(member)) return;

  if (!member?.moderatable) {
    console.warn(`[UYARI] ${author.tag} kullanıcısına timeout uygulanamıyor (yetki/rol hiyerarşisi).`);
    return;
  }

  const timeoutMs = reason === 'Spam' ? SPAM_TIMEOUT_MS : FLOOD_TIMEOUT_MS;
  const dmMessage =
    reason === 'Spam'
      ? `Merhaba <@${author.id}> Spam sebebinden ötürü 5 dakika boyunca susturuldun. Eğer bu ihlali yapmaya devam edersen kara listeye düşebilirsin. Lütfen sunucu kurallarımızı okuyalım ve sunucu kurallarımıza uyalım. MRC Topluluğu`
      : `Merhaba <@${author.id}> Flood sebebinden ötürü 1 dakika boyunca susturuldun. Eğer bu ihlali yapmaya devam edersen kara listeye düşebilirsin. Lütfen sunucu kurallarımızı okuyalım ve sunucu kurallarımıza uyalım. MRC Topluluğu`;

  await deleteViolationMessages(violationMessages);

  try {
    await member.timeout(timeoutMs, `${reason} koruması — otomatik moderasyon`);
  } catch (error) {
    console.error(`[HATA] ${author.tag} kullanıcısına timeout uygulanamadı:`, error);
  }

  await sendViolationDM(author, dmMessage);

  const userViolations = await addViolation(guild.id, author.id, reason);
  console.log(`[KORUMA] ${author.tag} — ${reason} ihlali (toplam: ${userViolations.length})`);

  if (shouldNotifyPersistentViolation(userViolations.length)) {
    await notifyPersistentViolation(message, author.id, userViolations);
  }
}

/**
 * İhlal tespit edildiğinde tek seferlik işlem yapar (çift tetiklemeyi engeller)
 * @param {import('discord.js').Message} message
 * @param {'Spam' | 'Flood'} reason
 * @param {import('discord.js').Message[]} violationMessages
 */
async function handleViolation(message, reason, violationMessages) {
  const cacheKey = getCacheKey(message.guild.id, message.author.id);

  // Zaten işleniyorsa veya cooldown'daysa atla
  if (processingUsers.has(cacheKey) || isOnViolationCooldown(cacheKey)) {
    return;
  }

  // Bayrağı hemen koy — await öncesinde, eşzamanlı event'lerin 2. kez girmesini engeller
  processingUsers.add(cacheKey);
  messageCache.delete(cacheKey);

  try {
    await applyViolation(message, reason, violationMessages);
  } finally {
    processingUsers.delete(cacheKey);
    violationCooldowns.set(cacheKey, Date.now() + VIOLATION_COOLDOWN_MS);
  }
}

/**
 * Gelen mesajı spam/flood açısından kontrol eder
 * @param {import('discord.js').Message} message
 */
export async function checkMessage(message) {
  try {
    if (!message.guild || !message.content || message.content.length === 0) return;
    if (isExempt(message)) return;

    // Zaten susturulmuş kullanıcıları kontrol etme — tekrar DM/ihlal kaydı ekleme
    if (isTimedOut(message.member)) return;

    const cacheKey = getCacheKey(message.guild.id, message.author.id);

    // İhlal işlenirken veya cooldown süresinde yeni kontrol yapma
    if (processingUsers.has(cacheKey) || isOnViolationCooldown(cacheKey)) return;

    const now = Date.now();

    if (!messageCache.has(cacheKey)) {
      messageCache.set(cacheKey, []);
    }

    const entries = messageCache.get(cacheKey);
    pruneOldEntries(entries, now);

    entries.push({
      content: normalizeContent(message.content),
      timestamp: now,
      message,
    });

    // Spam: 5 saniye içinde aynı mesaj 3 kez
    const normalizedCurrent = normalizeContent(message.content);
    const sameMessageEntries = entries.filter((entry) => entry.content === normalizedCurrent);

    if (sameMessageEntries.length >= SPAM_SAME_MESSAGE_THRESHOLD) {
      await handleViolation(
        message,
        'Spam',
        sameMessageEntries.map((entry) => entry.message),
      );
      return;
    }

    // Flood: 5 saniye içinde toplam 5 mesaj
    if (entries.length >= FLOOD_MESSAGE_THRESHOLD) {
      await handleViolation(
        message,
        'Flood',
        entries.map((entry) => entry.message),
      );
    }
  } catch (error) {
    console.error('[HATA] Spam/flood kontrolü sırasında sorun oluştu:', error);
  }
}
