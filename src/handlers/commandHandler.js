import { REST, Routes } from 'discord.js';

export async function registerCommands(client) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    const commandsData = Array.from(client.commands.values()).map((cmd) => cmd.data.toJSON());

    // 1. Önce Global komutları tamamen temizle (Çifte slash görünümünü yok eder)
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });

    // 2. Komutları SADECE senin sunucuna kaydet (Anında güncellenir ve teke düşer)
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commandsData }
    );

    console.log('[API] Slash komutları sunucuya başarıyla teke düşürülerek kaydedildi.');
  } catch (error) {
    console.error('[HATA] Slash komutları kaydedilirken hata oluştu:', error);
  }
}
