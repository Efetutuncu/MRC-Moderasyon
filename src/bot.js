/**
 * MRC Moderasyon - Discord Bot Süreci
 * Sadece Discord bağlantısını yönetir. Web sunucusu buraya dahil değildir.
 * Bu dosya site/server.js tarafından child_process ile başlatılır.
 */

import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { loadViolations } from './utils/violationTracker.js';

// Gerekli ortam değişkenlerini doğrula
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
    process.exit(1);
  }
}

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
  } catch (error) {
    console.error('[HATA] Bot başlatılırken sorun oluştu:', error);
    // Üst sürece hata bildir
    if (process.send) {
      process.send({ type: 'error', message: error.message });
    }
    process.exit(1);
  }
}

// Bot hazır olduğunda üst sürece bildir
client.once('ready', (readyClient) => {
  console.log(`[BOT] ${readyClient.user.tag} olarak giriş yapıldı!`);
  const guild = readyClient.guilds.cache.first();
  if (process.send) {
    process.send({
      type: 'ready',
      tag: readyClient.user.tag,
      avatarURL: readyClient.user.displayAvatarURL(),
      guildCount: readyClient.guilds.cache.size,
      guildName: guild ? guild.name : 'Bilinmiyor',
      memberCount: guild ? guild.memberCount : 0,
      channelsCount: guild ? guild.channels.cache.size : 0,
    });
  }
});

// Periyodik durum güncellemeleri (her 30 saniyede bir)
setInterval(() => {
  if (!client.isReady()) return;
  const guild = client.guilds.cache.first();
  if (process.send) {
    process.send({
      type: 'status',
      ping: client.ws.ping,
      uptime: client.uptime,
      guildCount: client.guilds.cache.size,
      memberCount: guild ? guild.memberCount : 0,
      channelsCount: guild ? guild.channels.cache.size : 0,
    });
  }
}, 30_000);

process.on('unhandledRejection', (reason) => {
  console.error('[HATA] İşlenmemiş Promise reddi:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[HATA] Yakalanmamış istisna:', error);
});

bootstrap();
