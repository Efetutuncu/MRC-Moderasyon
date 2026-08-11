import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REST, Routes } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadCommands(client) {
  const commandsPath = join(__dirname, '..', 'commands');

  try {
    const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
    const commandsData = [];

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const commandModule = await import(pathToFileURL(filePath).href);
      const command = commandModule.default || commandModule;

      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsData.push(command.data.toJSON());
      } else {
        console.warn(`[UYARI] ${file} dosyasında "data" veya "execute" eksik.`);
      }
    }

    if (commandsData.length === 0) {
      console.warn('[API] Kaydedilecek slash komutu bulunamadı.');
      return;
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    // 1. Global komutları temizle
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });

    // 2. Sadece sunucuya yükle
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commandsData }
    );

    console.log(`[API] Toplam ${commandsData.length} slash komutu başarıyla kaydedildi!`);
  } catch (error) {
    console.error('[HATA] Komutlar yüklenirken/kaydedilirken sorun oluştu:', error);
  }
}
