/**
 * ClientReady Event
 * Bot Discord'a bağlandığında slash komutlarını API'ye kaydeder.
 */

import { Events, REST, Routes } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,

  /**
   * @param {import('discord.js').Client} client - Discord istemcisi
   */
  async execute(client) {
    try {
      console.log(`[BOT] ${client.user.tag} olarak giriş yapıldı!`);
      console.log(`[BOT] ${client.guilds.cache.size} sunucuda aktif.`);

      // Yüklenen komutların JSON verilerini topla
      const commands = client.commands.map((command) => command.data.toJSON());

      if (commands.length === 0) {
        console.log('[API] Kaydedilecek slash komutu bulunamadı.');
        return;
      }

      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

      console.log(`[API] ${commands.length} slash komutu kaydediliyor...`);

      // Guild bazlı kayıt
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );

      console.log('[API] Slash komutları başarıyla kaydedildi.');
    } catch (error) {
      console.error('[HATA] Slash komutları kaydedilirken sorun oluştu:', error);
    }
  },
};
