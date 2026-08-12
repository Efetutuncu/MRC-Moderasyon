/**
 * İhlal Takip Sistemi
 * Kullanıcı ihlallerini violations.json dosyasında kalıcı olarak tutar.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Proje kök dizinindeki violations.json dosyası
const VIOLATIONS_FILE = join(__dirname, '..', '..', 'violations.json');

/** @type {Map<string, Array<{ timestamp: Date, reason: 'Spam' | 'Flood' }>>} */
const violations = new Map();

/** Ardışık dosya yazımlarını sıraya alır (eşzamanlı yazım çakışmasını önler) */
let saveQueue = Promise.resolve();

/**
 * Kullanıcı için benzersiz anahtar oluşturur
 * @param {string} guildId
 * @param {string} userId
 * @returns {string}
 */
function getKey(guildId, userId) {
  return `${guildId}-${userId}`;
}

/**
 * Bellekteki ihlalleri JSON'a uygun formata çevirir
 * @returns {Record<string, Array<{ timestamp: string, reason: 'Spam' | 'Flood' }>>}
 */
function serializeViolations() {
  /** @type {Record<string, Array<{ timestamp: string, reason: 'Spam' | 'Flood' }>>} */
  const data = {};

  for (const [key, entries] of violations.entries()) {
    data[key] = entries.map((entry) => ({
      timestamp: entry.timestamp.toISOString(),
      reason: entry.reason,
    }));
  }

  return data;
}

/**
 * JSON dosyasından okunan veriyi belleğe yükler
 * @param {Record<string, Array<{ timestamp: string, reason: 'Spam' | 'Flood' }>>} data
 */
function deserializeViolations(data) {
  violations.clear();

  for (const [key, entries] of Object.entries(data)) {
    if (!Array.isArray(entries)) continue;

    violations.set(
      key,
      entries
        .filter((entry) => entry?.timestamp && (entry.reason === 'Spam' || entry.reason === 'Flood'))
        .map((entry) => ({
          timestamp: new Date(entry.timestamp),
          reason: entry.reason,
        })),
    );
  }
}

/**
 * İhlal verilerini violations.json dosyasına yazar
 */
async function saveViolationsToFile() {
  try {
    const data = serializeViolations();
    await writeFile(VIOLATIONS_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  } catch (error) {
    console.error('[HATA] violations.json dosyasına yazılamadı:', error);
  }
}

/**
 * Dosya yazımını sıraya ekler
 * @returns {Promise<void>}
 */
function queueSave() {
  saveQueue = saveQueue.then(() => saveViolationsToFile());
  return saveQueue;
}

/**
 * Bot başlangıcında ihlal verilerini JSON dosyasından yükler
 */
export async function loadViolations() {
  try {
    if (!existsSync(VIOLATIONS_FILE)) {
      console.log('[İHLAL] violations.json bulunamadı, boş kayıt ile başlanıyor.');
      return;
    }

    const raw = await readFile(VIOLATIONS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    deserializeViolations(data);

    const totalRecords = [...violations.values()].reduce((sum, entries) => sum + entries.length, 0);
    console.log(`[İHLAL] violations.json yüklendi (${violations.size} kullanıcı, ${totalRecords} kayıt).`);
  } catch (error) {
    console.error('[HATA] violations.json okunamadı, boş kayıt ile devam ediliyor:', error);
    violations.clear();
  }
}

/**
 * Yeni ihlal kaydı ekler ve dosyaya yazar
 * @param {string} guildId
 * @param {string} userId
 * @param {'Spam' | 'Flood'} reason
 * @returns {Promise<Array<{ timestamp: Date, reason: 'Spam' | 'Flood' }>>} Güncel ihlal listesi
 */
export async function addViolation(guildId, userId, reason) {
  const key = getKey(guildId, userId);
  const entry = { timestamp: new Date(), reason };

  if (!violations.has(key)) {
    violations.set(key, []);
  }

  const userViolations = violations.get(key);
  userViolations.push(entry);

  await queueSave();

  return userViolations;
}

/**
 * Kullanıcının tüm ihlallerini döndürür
 * @param {string} guildId
 * @param {string} userId
 * @returns {Array<{ timestamp: Date, reason: 'Spam' | 'Flood' }>}
 */
export function getViolations(guildId, userId) {
  return violations.get(getKey(guildId, userId)) ?? [];
}

/**
 * Sürekli ihlal bildirimi gönderilip gönderilmeyeceğini kontrol eder (tam 3. ihlal)
 * @param {number} violationCount
 * @returns {boolean}
 */
export function shouldNotifyPersistentViolation(violationCount) {
  return violationCount === 3;
}

/**
 * Tarihi okunabilir formata çevirir
 * @param {Date} date
 * @returns {string}
 */
export function formatViolationTime(date) {
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Sürekli ihlal kanalına gönderilecek bildirim metnini oluşturur
 * @param {string} userId
 * @param {Array<{ timestamp: Date, reason: 'Spam' | 'Flood' }>} userViolations
 * @returns {string}
 */
export function buildPersistentViolationMessage(userId, userViolations) {
  const lastThree = userViolations.slice(-3);

  const violationLines = lastThree
    .map((violation) => {
      const time = formatViolationTime(violation.timestamp);
      return `${time} / <sebep: ${violation.reason}>`;
    })
    .join('\n                         ');

  return (
    `İhlalde bulunan kişi: <@${userId}>\n` +
    `İhlal zamanları: ${violationLines}`
  );
}
