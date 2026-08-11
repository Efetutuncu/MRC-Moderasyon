import { REST, Routes } from 'discord.js';

/**
 * Slash komutlarını yükler ve Discord API'ye kaydeder.
 * @param {import('discord.js').Client} client - Discord istemcisi
 */
export async function loadCommands(client) {
  if (!client?.commands) return;

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    const commandsData = Array.from(client.commands.values()).map((cmd) => cmd.data.toJSON());

    // 1. Önce eski Global komutları temizle (Çifte slash görünümünü yok eder)
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });

    // 2. Komutları SADECE senin sunucuna kaydet
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commandsData }
    );

    console.log('[API] Slash komutları başarıyla kaydedildi.');
  } catch (error) {
    console.error('[HATA] Slash komutları kaydedilirken hata oluştu:', error);
  }
}
