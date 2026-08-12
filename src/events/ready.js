/**
 * Ready Event
 * Bot Discord'a bağlandığında slash komutlarını API'ye kaydeder.
 */

import { REST, Routes } from 'discord.js';

export default {
  name: 'ready',
  once: true,

  /**
   * @param {import('discord.js').Client} client - Discord istemcisi
   */
  async execute(client) {
    try {
      console.log(`[BOT] ${client.guilds.cache.size} sunucuda aktif.`);

      // Yüklenen komutların JSON verilerini topla
      const commands = client.commands.map((command) => command.data.toJSON());

      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

      console.log(`[API] ${commands.length} slash komutu kaydediliyor...`);

      // Guild bazlı kayıt — geliştirme aşamasında anında güncellenir
      // Üretimde global kayıt için Routes.applicationCommands(CLIENT_ID) kullanılabilir
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands },
      );

      console.log('[API] Slash komutları başarıyla kaydedildi.');
    } catch (error) {
      console.error('[HATA] Slash komutları kaydedilirken sorun oluştu:', error);
    }
  },
};
