/**
 * Quuinx Moderasyon - Discord Bot Süreci
 * Sadece Discord bağlantısını yönetir. Web sunucusu buraya dahil değildir.
 * Bu dosya site/server.js tarafından child_process ile başlatılır.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { loadViolations } from './utils/violationTracker.js';
import { getRoles } from './utils/roleConfig.js';

const INSTANCE_ID = process.env.RENDER_INSTANCE_ID || process.env.RENDER_SERVICE_ID || `local-${process.pid}`;
const LOCK_FILE = path.join(process.env.TMPDIR || '/tmp', 'quuinx-moderasyon-bot.lock');

/** Aynı container'da birden fazla Discord gateway bağlantısını engeller. */
function acquireBotLock() {
  try {
    fs.writeFileSync(LOCK_FILE, String(process.pid), { encoding: 'utf8', flag: 'wx' });
    return true;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;

    const existingPid = Number.parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
    try {
      // Kilidi tutan süreç yaşıyorsa ikinci botu hiç başlatma.
      process.kill(existingPid, 0);
      console.error(`[BOT] Başlatma engellendi: bu instance'ta zaten bot çalışıyor (PID: ${existingPid}).`);
      return false;
    } catch {
      // Önceki süreç beklenmedik şekilde kapandıysa eski kilidi temizle.
      fs.unlinkSync(LOCK_FILE);
      fs.writeFileSync(LOCK_FILE, String(process.pid), { encoding: 'utf8', flag: 'wx' });
      return true;
    }
  }
}

function releaseBotLock() {
  try {
    if (fs.existsSync(LOCK_FILE) && fs.readFileSync(LOCK_FILE, 'utf8').trim() === String(process.pid)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch (error) {
    console.warn('[BOT] Süreç kilidi temizlenemedi:', error.message);
  }
}

if (!acquireBotLock()) process.exit(0);

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
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember, Partials.Message, Partials.Reaction],
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
    if (process.send) {
      process.send({ type: 'error', message: error.message });
    }
    process.exit(1);
  }
}

// Bot hazır olduğunda üst sürece bildir
client.once('ready', (readyClient) => {
  console.log(`[BOT] ${readyClient.user.tag} olarak giriş yapıldı! | instance=${INSTANCE_ID} | pid=${process.pid}`);
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
const statusInterval = setInterval(() => {
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

// Panelden durdurma isteği geldiğinde Discord bağlantısını önce kapat.
// Böylece süreç sonlansa bile gateway üzerinde kısa süreli "hayalet" bot
// bağlantısı kalmaz.
async function shutdown(signal) {
  console.log(`[BOT] Kapatma sinyali alındı: ${signal} | instance=${INSTANCE_ID} | pid=${process.pid}`);
  clearInterval(statusInterval);

  try {
    client.destroy();
  } finally {
    releaseBotLock();
    process.exit(0);
  }
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

// --- IPC MESAJ DİNLEYİCİSİ (Web sunucusundan gelen emirler) ---
process.on('message', async (msg) => {
  if (!msg || !msg.type) return;

  // Moderasyon İşlemi (Ban, Kick, Timeout)
  if (msg.type === 'mod_action') {
    const { action, userId, reason, durationMinutes, requestId, requestedBy } = msg;
    try {
      const guild = client.guilds.cache.get(process.env.GUILD_ID) || client.guilds.cache.first();
      if (!guild) {
        throw new Error('Sunucuya ulaşılamadı.');
      }

      if (action === 'ban') {
        await guild.members.ban(userId, {
          reason: `${reason || 'Web panelinden yasaklandı.'} | Yetkili: ${requestedBy}`,
        });
        if (process.send) {
          process.send({
            type: 'mod_action_res',
            requestId,
            success: true,
            message: 'Kullanıcı başarıyla yasaklandı.',
          });
        }
        return;
      }

      const targetMember = await guild.members.fetch(userId).catch(() => null);
      if (!targetMember) {
        throw new Error('Kullanıcı sunucuda bulunamadı.');
      }

      if (action === 'kick') {
        if (!targetMember.kickable) {
          throw new Error('Bu kullanıcıyı atma yetkim yok.');
        }
        await targetMember.kick(`${reason || 'Web panelinden atıldı.'} | Yetkili: ${requestedBy}`);
        if (process.send) {
          process.send({
            type: 'mod_action_res',
            requestId,
            success: true,
            message: 'Kullanıcı başarıyla sunucudan atıldı.',
          });
        }
        return;
      }

      if (action === 'timeout') {
        if (!targetMember.moderatable) {
          throw new Error('Bu kullanıcıya zaman aşımı uygulama yetkim yok.');
        }
        const mins = parseInt(durationMinutes) || 10;
        await targetMember.timeout(
          mins * 60 * 1000,
          `${reason || 'Web panelinden uygulandı.'} | Yetkili: ${requestedBy}`
        );
        if (process.send) {
          process.send({
            type: 'mod_action_res',
            requestId,
            success: true,
            message: `Kullanıcıya ${mins} dakika zaman aşımı uygulandı.`,
          });
        }
        return;
      }

      throw new Error('Geçersiz moderasyon eylemi.');
    } catch (err) {
      if (process.send) {
        process.send({
          type: 'mod_action_res',
          requestId,
          success: false,
          error: err.message,
        });
      }
    }
  }

  // Rol Paneli Gönderme
  if (msg.type === 'send_role_panel') {
    const { requestId } = msg;
    try {
      const channel = await client.channels.fetch(process.env.WELCOME_CHANNEL_ID).catch(() => null);
      if (!channel) {
        throw new Error('Hoş geldin kanalı bulunamadı.');
      }

      const roles = getRoles();
      if (roles.length === 0) {
        throw new Error('Panel için tanımlı oyun rolü bulunmuyor.');
      }

      const embed = new EmbedBuilder()
        .setTitle('🎮 Oyun Rolleri Seçim Paneli')
        .setDescription(
          'Aşağıdaki menüden oynamak istediğiniz oyunların rollerini seçebilirsiniz!\nSeçtiğiniz roller profilinize otomatik eklenecektir.'
        )
        .setColor(0x5865f2)
        .setFooter({ text: 'Quuinx Moderasyon Sistemleri' });

      const options = roles.map((r) => ({
        label: r.label,
        value: r.roleId,
        emoji: r.emoji || '🎮',
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_game_roles')
        .setPlaceholder('🎮 Oyun rollerinizi seçin...')
        .setMinValues(0)
        .setMaxValues(options.length)
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await channel.send({ embeds: [embed], components: [row] });

      if (process.send) {
        process.send({
          type: 'send_role_panel_res',
          requestId,
          success: true,
          message: 'Rol paneli başarıyla kanala gönderildi!',
        });
      }
    } catch (err) {
      if (process.send) {
        process.send({
          type: 'send_role_panel_res',
          requestId,
          success: false,
          error: err.message,
        });
      }
    }
  }

  // ErensiBOT Kayıt Paneli Gönderme
  if (msg.type === 'send_registration_panel') {
    const { requestId } = msg;
    try {
      const regChannelId = process.env.REGISTRATION_CHANNEL_ID || process.env.WELCOME_CHANNEL_ID || '1533665242091884544';
      const channel = await client.channels.fetch(regChannelId).catch(() => null);
      if (!channel) {
        throw new Error('Hoş geldin / Kayıt kanalı bulunamadı.');
      }

      const registerBtn = new ButtonBuilder()
        .setCustomId('btn_user_register')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(registerBtn);

      const sentMsg = await channel.send({
        content: 'Lütfen kayıt olmak için alttaki emojiye tıklayınız. (Lütfen spam atmayınız.)',
        components: [row],
      });

      // ErensiBOT tarzı mesaja ✅ reaksiyonu da otomatik ekle
      await sentMsg.react('✅').catch(() => null);

      if (process.send) {
        process.send({
          type: 'send_registration_panel_res',
          requestId,
          success: true,
          message: 'Kayıt paneli hoş geldin kanalına başarıyla gönderildi!',
        });
      }
    } catch (err) {
      if (process.send) {
        process.send({
          type: 'send_registration_panel_res',
          requestId,
          success: false,
          error: err.message,
        });
      }
    }
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('[HATA] İşlenmemiş Promise reddi:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[HATA] Yakalanmamış istisna:', error);
});

process.once('exit', releaseBotLock);

bootstrap();
