import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REST, Routes } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Alt klasörleri de tarayan yardımcı fonksiyon
function getCommandFiles(dirPath) {
  let files = [];
  const items = readdirSync(dirPath);

  for (const item of items) {
    const fullPath = join(dirPath, item);
    if (statSync(fullPath).isDirectory()) {
      files = files.concat(getCommandFiles(fullPath));
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function loadCommands(client) {
  const commandsPath = join(__dirname, '..', 'commands');

  try {
    const commandFiles = getCommandFiles(commandsPath);
    const commandsData = [];

    for (const filePath of commandFiles) {
      const commandModule = await import(pathToFileURL(filePath).href);
      const command = commandModule.default || commandModule;

      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsData.push(command.data.toJSON());
      }
    }

    if (commandsData.length === 0) {
      console.warn('[API] Kaydedilecek slash komutu bulunamadı.');
      return;
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    // Global kayıtları sıfırla, sunucuya kaydet
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commandsData }
    );

    console.log(`[API] Toplam ${commandsData.length} slash komutu başarıyla yüklendi ve kaydedildi!`);
  } catch (error) {
    console.error('[HATA] Komut yükleme hatası:', error);
  }
}
