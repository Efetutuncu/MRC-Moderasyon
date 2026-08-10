/**
 * MRC Moderasyon - Ana giriş noktası
 * Bot istemcisini oluşturur, handler'ları yükler ve Discord'a bağlanır.
 */

import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { loadViolations } from './utils/violationTracker.js';
import { handleRoleInteractions } from './handlers/roleHandler.js';
import { startWebServer } from '../site/server.js';

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

// Discord istemcisini oluştur
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // Üye katılım/ayrılma event'leri için zorunlu
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages, // messageCreate event'i için zorunlu
    GatewayIntentBits.MessageContent, // Mesaj içeriği okuma (spam/flood) için zorunlu
  ],
  partials: [Partials.GuildMember],
});

// Komut koleksiyonunu istemciye ekle
client.commands = new Collection();

/**
 * Botu başlat
 */
async function bootstrap() {
  try {
    // 1. Kayıtlı ihlal verilerini yükle
    await loadViolations();

    // 2. Komutları ve event'leri yükle
    await loadCommands(client);
    await loadEvents(client);

    // 3. Önce Discord'a bağlan
    await client.login(process.env.DISCORD_TOKEN);

    // 4. Bot başarılı şekilde bağlandıktan sonra Web Sunucusunu başlat
    await startWebServer(client);

  } catch (error) {
    console.error('[HATA] Bot başlatılırken bir sorun oluştu:', error);
    process.exit(1);
  }
}

// Yakalanmamış hataları yakala — botun çökmesini engelle
process.on('unhandledRejection', (reason) => {
  console.error('[HATA] İşlenmemiş Promise reddi:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[HATA] Yakalanmamış istisna:', error);
});

bootstrap();
