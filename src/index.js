/**
 * MRC Moderasyon - Ana giriş noktası
 * Bot istemcisini oluşturur, handler'ları yükler ve Discord'a bağlanır.
 */

import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { loadViolations } from './utils/violationTracker.js';

// Gerekli ortam değişkenlerinin tanımlı olduğunu doğrula
const requiredEnvVars = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'GUILD_ID',
  'WELCOME_CHANNEL_ID',
  'UNREGISTERED_ROLE_ID',
  'SUREKLI_IHLAL_CHANNEL_ID',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`[HATA] Eksik ortam değişkeni: ${envVar}`);
    console.error('Lütfen .env dosyanızı doldurun.');
    process.exit(1);
  }
}

// Global çifte başlatma engelleyicisi (Sadece TEK BİR KERE çalışmasını garanti eder)
if (!global.__BOT_INITIALIZED__) {
  global.__BOT_INITIALIZED__ = true;

  // Discord istemcisini oluştur
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.GuildMember],
  });

  client.commands = new Collection();

  async function bootstrap() {
    try {
      await loadViolations();
      await loadCommands(client);
      await loadEvents(client);

      // Web sunucusunu login'den ÖNCE başlat ve çifte import döngüsünü kır
      try {
        const { startWebServer } = await import('../site/server.js');
        if (typeof startWebServer === 'function') {
          await startWebServer();
        }
      } catch (webErr) {
        console.warn('[BİLDİRİM] Web sunucusu başlatılamadı:', webErr.message);
      }

      // Discord'a sadece 1 defa giriş yap
      await client.login(process.env.DISCORD_TOKEN);

    } catch (error) {
      console.error('[HATA] Bot başlatılırken bir sorun oluştu:', error);
      process.exit(1);
    }
  }

  bootstrap();
}

process.on('unhandledRejection', (reason) => {
  console.error('[HATA] İşlenmemiş Promise reddi:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[HATA] Yakalanmamış istisna:', error);
});
