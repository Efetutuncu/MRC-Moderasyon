import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { fork } from 'child_process';
import {
  initSeedAdmin,
  authenticateAdmin,
  addAdmin,
  deleteAdmin,
  listAdmins,
} from './adminManager.js';
import { getRoles, saveRoles } from '../src/utils/roleConfig.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'mrc-moderasyon-secret-key-2026';
const BOT_SCRIPT = path.join(__dirname, '..', 'src', 'bot.js');
// Render her container/instance için farklı bir kimlik verir. Yerelde PID,
// aynı makinedeki ayrı web süreçlerini ayırt etmeye yardımcı olur.
const INSTANCE_ID = process.env.RENDER_INSTANCE_ID || process.env.RENDER_SERVICE_ID || `local-${process.pid}`;

// --- BOT SÜREÇ YÖNETİMİ ---
let botProcess = null;
let shuttingDown = false;
let botStatus = {
  online: false,
  tag: null,
  avatarURL: null,
  ping: -1,
  uptime: 0,
  guildCount: 0,
  guildName: '-',
  memberCount: 0,
  channelsCount: 0,
};

// --- AKTİVİTE LOGLARI ---
const activityLogs = [];

export function addActivityLog(type, message) {
  activityLogs.unshift({
    timestamp: new Date().toISOString(),
    type,
    message,
  });
  if (activityLogs.length > 150) activityLogs.pop();
}

// --- IPC İSTEK TAKİBİ ---
const pendingRequests = new Map();

function sendBotCommand(type, payload, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (!botProcess || !botStatus.online) {
      return reject(new Error('Bot çevrimdışı. Önce botu çalıştırın.'));
    }

    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('Bot yanıt vermedi (Zaman aşımı).'));
    }, timeoutMs);

    pendingRequests.set(requestId, { resolve, reject, timer });

    botProcess.send({
      type,
      requestId,
      ...payload,
    });
  });
}

// --- BOT BAŞLATMA ---
function startBot() {
  if (botProcess) {
    addActivityLog('WARN', 'Bot zaten çalışıyor, yeniden başlatma isteği reddedildi.');
    return { success: false, message: 'Bot zaten çalışıyor.' };
  }

  addActivityLog('INFO', `Bot başlatılıyor (web instance: ${INSTANCE_ID}, PID: ${process.pid})...`);

  botProcess = fork(BOT_SCRIPT, [], {
    env: process.env,
    silent: false,
  });

  botProcess.on('message', (msg) => {
    if (!msg || !msg.type) return;

    if (msg.type === 'ready') {
      botStatus = {
        online: true,
        tag: msg.tag,
        avatarURL: msg.avatarURL,
        ping: 0,
        uptime: 0,
        guildCount: msg.guildCount,
        guildName: msg.guildName,
        memberCount: msg.memberCount,
        channelsCount: msg.channelsCount,
      };
      addActivityLog('SUCCESS', `Bot Discord'a bağlandı: ${msg.tag}`);
    }

    if (msg.type === 'status') {
      botStatus.online = true;
      botStatus.ping = msg.ping;
      botStatus.uptime = msg.uptime;
      botStatus.guildCount = msg.guildCount;
      botStatus.memberCount = msg.memberCount;
      botStatus.channelsCount = msg.channelsCount;
    }

    if (msg.type === 'error') {
      addActivityLog('ERROR', `Bot hatası: ${msg.message}`);
    }

    // IPC Yanıtlarını Yakala
    if (
      msg.type === 'mod_action_res' ||
      msg.type === 'send_role_panel_res' ||
      msg.type === 'send_registration_panel_res'
    ) {
      const pending = pendingRequests.get(msg.requestId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingRequests.delete(msg.requestId);
        if (msg.success) {
          pending.resolve(msg);
        } else {
          pending.reject(new Error(msg.error || 'İşlem başarısız.'));
        }
      }
    }
  });

  const childPid = botProcess.pid;
  botProcess.on('exit', (code) => {
    botStatus.online = false;
    botProcess = null;
    addActivityLog(code === 0 ? 'INFO' : 'WARN', `Bot süreci sona erdi (kod: ${code ?? 'sinyal'}, PID: ${childPid}).`);
  });

  botProcess.on('error', (err) => {
    addActivityLog('ERROR', `Bot süreci hatası: ${err.message}`);
    botProcess = null;
    botStatus.online = false;
  });

  return { success: true, message: 'Bot başlatma komutu gönderildi.' };
}

// --- BOT DURDURMA ---
function stopBot() {
  if (!botProcess) {
    return { success: false, message: 'Bot zaten çalışmıyor.' };
  }

  addActivityLog('WARN', 'Bot durduruluyor...');
  // SIGTERM bot tarafında client.destroy() ile karşılanır. Bu, Discord
  // gateway bağlantısının da kapanmasını sağlar.
  const processToStop = botProcess;
  const didSendSignal = processToStop.kill('SIGTERM');
  if (!didSendSignal) {
    addActivityLog('ERROR', 'Bot sürecine kapatma sinyali gönderilemedi.');
    return { success: false, message: 'Bot kapatma sinyali gönderilemedi.' };
  }

  // Discord istemcisi kapanma sinyalini karşılayamazsa sürecin sonsuza kadar
  // kalmasını engelle. Normal durumda bu zamanlayıcı hiçbir işlem yapmaz.
  const forceStopTimer = setTimeout(() => {
    if (botProcess === processToStop) {
      addActivityLog('WARN', `Bot kapanmaya yanıt vermedi; zorla kapatılıyor (PID: ${processToStop.pid}).`);
      processToStop.kill('SIGKILL');
    }
  }, 10_000);
  processToStop.once('exit', () => clearTimeout(forceStopTimer));

  addActivityLog('INFO', `Bot için kapatma sinyali gönderildi (PID: ${processToStop.pid}).`);
  botStatus.online = false;
  return { success: true, message: 'Bot durduruldu.' };
}

/**
 * Render deploy/suspend sırasında web süreci sonlandırılır. Bot child process
 * ayrıca kapatılmazsa yetim kalır ve yeni deploy ile birlikte ikinci bir
 * Discord bağlantısı oluşturur. Bu handler her deployda önce botu kapatır.
 */
function shutdownWebServer(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[WEB] Kapatma sinyali alındı: ${signal}`);

  if (!botProcess) {
    process.exit(0);
    return;
  }

  const processToStop = botProcess;
  stopBot();

  processToStop.once('exit', () => process.exit(0));
  // Çocuk süreç cevap vermezse Render'ın deployunu sonsuza kadar bekletme.
  setTimeout(() => process.exit(0), 12_000).unref();
}

process.once('SIGTERM', () => shutdownWebServer('SIGTERM'));
process.once('SIGINT', () => shutdownWebServer('SIGINT'));

// --- WEB SUNUCUSUNU BAŞLAT ---
export async function startWebServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const publicDir = path.join(__dirname, 'public');

  app.use(express.json());
  app.use(express.static(publicDir));

  await initSeedAdmin();
  addActivityLog('INFO', `Web sunucusu başlatıldı — http://localhost:${PORT}`);

  // --- JWT MİDDLEWARE ---
  const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Yetkisiz erişim. Lütfen giriş yapın.' });
    }
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      next();
    } catch {
      return res.status(401).json({ error: 'Oturum süreniz doldu.' });
    }
  };

  const superadminMiddleware = (req, res, next) => {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ error: 'Süper Yönetici yetkisi gereklidir.' });
    }
    next();
  };

  // ======================
  // AUTH ENDPOINT'LERİ
  // ======================

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'E-posta ve şifre zorunludur.' });
      }
      const admin = await authenticateAdmin(email, password);
      if (!admin) {
        return res.status(401).json({ error: 'Hatalı e-posta veya şifre!' });
      }
      const token = jwt.sign(
        { id: admin.id, email: admin.email, role: admin.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      addActivityLog('INFO', `Web paneline giriş: ${admin.email}`);
      return res.json({ token, user: admin });
    } catch {
      return res.status(500).json({ error: 'Giriş yapılırken hata oluştu.' });
    }
  });

  app.get('/api/auth/me', authMiddleware, (req, res) => {
    return res.json({ user: req.user });
  });

  // ======================
  // BOT DURUM & KONTROL
  // ======================

  app.get('/api/bot/status', authMiddleware, (req, res) => {
    return res.json({
      ...botStatus,
      running: botProcess !== null,
    });
  });

  app.post('/api/bot/start', authMiddleware, (req, res) => {
    const result = startBot();
    if (result.success) {
      return res.json({ message: result.message });
    }
    return res.status(400).json({ error: result.message });
  });

  app.post('/api/bot/stop', authMiddleware, (req, res) => {
    const result = stopBot();
    if (result.success) {
      return res.json({ message: result.message });
    }
    return res.status(400).json({ error: result.message });
  });

  app.post('/api/bot/restart', authMiddleware, (req, res) => {
    if (!botProcess) {
      startBot();
      return res.json({ message: 'Bot başlatılıyor...' });
    }

    // Yeni süreci sabit bir süre sonunda değil, eski bot Discord bağlantısını
    // kapatıp gerçekten sonlandığında başlat. Aksi halde iki bot kısa süre de
    // olsa aynı anda çalışarak olayları çift işleyebilir.
    const processToRestart = botProcess;
    processToRestart.once('exit', () => {
      startBot();
      addActivityLog('INFO', 'Bot yeniden başlatıldı.');
    });
    stopBot();
    return res.json({ message: 'Bot yeniden başlatılıyor...' });
  });

  app.get('/api/bot/logs', authMiddleware, (req, res) => {
    return res.json({ logs: activityLogs });
  });

  // ======================
  // YÖNETİCİ HESAPLARI
  // ======================

  app.get('/api/admins', authMiddleware, (req, res) => {
    return res.json({ admins: listAdmins() });
  });

  app.post('/api/admins', authMiddleware, superadminMiddleware, async (req, res) => {
    try {
      const { email, password, role } = req.body;
      const newAdmin = await addAdmin(email, password, role);
      addActivityLog('SUCCESS', `Yeni yönetici eklendi: ${email} (${role})`);
      return res.json({ message: 'Yönetici başarıyla eklendi.', admin: newAdmin });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admins/:id', authMiddleware, superadminMiddleware, (req, res) => {
    try {
      deleteAdmin(req.params.id);
      addActivityLog('WARN', `Yönetici silindi: ${req.params.id}`);
      return res.json({ message: 'Yönetici başarıyla silindi.' });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  // ======================
  // MODERASYON & İHLALLER
  // ======================

  app.get('/api/moderation/violations', authMiddleware, (req, res) => {
    try {
      const violationsPath = path.join(__dirname, '..', 'violations.json');
      const raw = fs.existsSync(violationsPath)
        ? fs.readFileSync(violationsPath, 'utf8')
        : '{}';
      return res.json({ violations: JSON.parse(raw) });
    } catch {
      return res.status(500).json({ error: 'İhlaller okunamadı.' });
    }
  });

  app.post('/api/moderation/action', authMiddleware, async (req, res) => {
    const { action, userId, reason, durationMinutes } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ error: 'Kullanıcı ID ve işlem türü seçilmelidir.' });
    }

    try {
      const result = await sendBotCommand('mod_action', {
        action,
        userId,
        reason,
        durationMinutes,
        requestedBy: req.user.email,
      });

      addActivityLog('MODERATION', `Web Paneli — ${action.toUpperCase()}: ${userId} (${reason || 'Sebep yok'})`);
      return res.json({ message: result.message });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  // ======================
  // ROL YÖNETİMİ
  // ======================

  app.get('/api/roles', authMiddleware, (req, res) => {
    return res.json({ roles: getRoles() });
  });

  app.post('/api/roles', authMiddleware, (req, res) => {
    try {
      const { roleId, label, emoji } = req.body;
      if (!roleId || !label) {
        return res.status(400).json({ error: 'Rol ID ve Oyun Adı zorunludur.' });
      }
      const roles = getRoles();
      roles.push({ roleId: roleId.trim(), label: label.trim(), emoji: (emoji || '🎮').trim() });
      saveRoles(roles);
      addActivityLog('SUCCESS', `Yeni rol eklendi: ${label}`);
      return res.json({ message: 'Rol başarıyla eklendi.', roles });
    } catch {
      return res.status(500).json({ error: 'Rol eklenemedi.' });
    }
  });

  app.delete('/api/roles/:index', authMiddleware, (req, res) => {
    try {
      const index = parseInt(req.params.index);
      const roles = getRoles();
      if (isNaN(index) || index < 0 || index >= roles.length) {
        return res.status(400).json({ error: 'Geçersiz rol indeksi.' });
      }
      const removed = roles.splice(index, 1);
      saveRoles(roles);
      addActivityLog('WARN', `Rol silindi: ${removed[0]?.label}`);
      return res.json({ message: 'Rol kaldırıldı.', roles });
    } catch {
      return res.status(500).json({ error: 'Rol silinemedi.' });
    }
  });

  app.post('/api/roles/send-panel', authMiddleware, async (req, res) => {
    try {
      const result = await sendBotCommand('send_role_panel', {});
      addActivityLog('SUCCESS', 'Web Paneli — Rol seçim paneli kanala gönderildi.');
      return res.json({ message: result.message });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/registration/send-panel', authMiddleware, async (req, res) => {
    try {
      const result = await sendBotCommand('send_registration_panel', {});
      addActivityLog('SUCCESS', 'Web Paneli — ErensiBOT kayıt paneli kanala gönderildi.');
      return res.json({ message: result.message });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  // SPA Fallback
  app.get('/*path', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`[WEB] Yönetim Paneli aktif: http://localhost:${PORT} | instance=${INSTANCE_ID} | pid=${process.pid}`);

    // Bulut ortamında (Koyeb, Railway vb.) botu otomatik başlat
    if (process.env.BOT_AUTOSTART === 'true') {
      console.log('[WEB] BOT_AUTOSTART=true — Bot otomatik başlatılıyor...');
      setTimeout(() => startBot(), 2000);
    }
  });
}
