import { REST, Routes } from 'discord.js';

export async function registerCommands(client) {
  if (!client?.commands) return;

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    const commandsData = Array.from(client.commands.values()).map((cmd) => cmd.data.toJSON());

    // Global komutları temizle
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });

    // Sadece sunucuya kaydet
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commandsData }
    );

    console.log('[API] Slash komutları başarıyla kaydedildi.');
  } catch (error) {
    console.error('[HATA] Slash komutları kaydedilirken hata oluştu:', error);
  }
}
