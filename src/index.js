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
    console.error('Lütfen .env dosyanızı .env.example dosyasına göre doldurun.');
    process.exit(1);
  }
}

// Global çifte başlatma engelleyicisi
if (!global.__BOT_STARTED__) {
  global.__BOT_STARTED__ = true;

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

      await client.login(process.env.DISCORD_TOKEN);

      // Web sunucusunu dinamik olarak tek seferlik import et
      try {
        const { startWebServer } = await import('../site/server.js');
        if (typeof startWebServer === 'function') {
          await startWebServer(client);
        }
      } catch (webErr) {
        console.warn('[BİLDİRİM] Web sunucusu başlatılamadı veya mevcut değil:', webErr.message);
      }

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
