/**
 * Event Handler
 * src/events/ altındaki tüm event dosyalarını otomatik tarar ve yükler.
 */

import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Tüm event'leri yükle ve Discord istemcisine kaydet
 * @param {import('discord.js').Client} client - Discord istemcisi
 */
export async function loadEvents(client) {
  const eventsPath = join(__dirname, '..', 'events');

  try {
    // Mevcut tüm dinamik dinleyicileri temizle (çifte tetiklenmeyi engeller)
    client.removeAllListeners();

    const eventFiles = readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);

      try {
        // Cache bypass için versiyon parametresi ile import et
        const eventModule = await import(`${pathToFileURL(filePath).href}?update=${Date.now()}`);
        const event = eventModule.default;

        // Event yapısını doğrula
        if (!event?.name || typeof event.execute !== 'function') {
          console.warn(`[UYARI] Geçersiz event dosyası atlandı: ${filePath}`);
          continue;
        }

        // Deprecation uyarısını önlemek için 'ready' adını 'clientReady' olarak zorla
        let eventName = event.name;
        if (eventName === 'ready') {
          eventName = 'clientReady';
        }

        if (event.once) {
          client.once(eventName, (...args) => event.execute(...args));
        } else {
          client.on(eventName, (...args) => event.execute(...args));
        }
      } catch (err) {
        console.error(`[HATA] Event yüklenirken sorun oluştu (${file}):`, err);
      }
    }

    console.log(`[HANDLER] Toplam ${eventFiles.length} event başarıyla yüklendi.`);
  } catch (error) {
    console.error('[HATA] Event dizini okunurken sorun oluştu:', error);
  }
}
