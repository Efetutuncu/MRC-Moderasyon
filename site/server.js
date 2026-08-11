import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
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

// --- WEB SUNUCUSUNU BAŞLAT ---
export async function startWebServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const publicDir = path.join(__dirname, 'public');

  app.use(express.json());
  app.use(express.static(publicDir));

  await initSeedAdmin();
  addActivityLog('INFO', `Web sunucusu başlatıldı — http://localhost:${PORT}`);

  // --- JWT MIDDLEWARE ---
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

  // SPA Fallback
  app.get('/*path', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`[WEB] Yönetim Paneli aktif: http://localhost:${PORT}`);
  });
}
