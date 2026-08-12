/**
 * Komut Handler
 * src/commands/ altındaki tüm komut dosyalarını otomatik tarar ve yükler.
 */

import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Belirtilen klasördeki komut dosyalarını yükler
 * @param {import('discord.js').Client} client - Discord istemcisi
 * @param {string} folderPath - Taranacak klasör yolu
 */
async function loadCommandsFromFolder(client, folderPath) {
  const files = readdirSync(folderPath, { withFileTypes: true });

  for (const file of files) {
    const fullPath = join(folderPath, file.name);

    // Alt klasörleri de tara (örn: moderation/)
    if (file.isDirectory()) {
      if (file.name === 'src' || file.name === 'site') {
        console.warn(`[WARN] Skipping non-command directory: ${fullPath}`);
        continue;
      }
      await loadCommandsFromFolder(client, fullPath);
      continue;
    }

    // Sadece .js dosyalarını yükle
    if (!file.name.endsWith('.js')) continue;

    try {
      const commandModule = await import(pathToFileURL(fullPath).href);
      const command = commandModule.default;

      // Komut yapısını doğrula
      if (!command?.data?.name || typeof command.execute !== 'function') {
        console.warn(`[UYARI] Geçersiz komut dosyası atlandı: ${fullPath}`);
        continue;
      }

      client.commands.set(command.data.name, command);
      console.log(`[KOMUT] Yüklendi: /${command.data.name}`);
    } catch (error) {
      console.error(`[HATA] Komut yüklenemedi (${fullPath}):`, error);
    }
  }
}

/**
 * Tüm komutları yükle
 * @param {import('discord.js').Client} client - Discord istemcisi
 */
export async function loadCommands(client) {
  const commandsPath = join(__dirname, '..', 'commands');

  try {
    await loadCommandsFromFolder(client, commandsPath);
    console.log(`[KOMUT] Toplam ${client.commands.size} komut yüklendi.`);
  } catch (error) {
    console.error('[HATA] Komut handler başlatılamadı:', error);
    throw error;
  }
}
