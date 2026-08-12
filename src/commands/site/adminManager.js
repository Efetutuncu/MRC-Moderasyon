import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const filePath = path.join(process.cwd(), 'src', 'data', 'admins.json');

// Ensure directory exists
if (!fs.existsSync(path.dirname(filePath))) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

/**
 * Yöneticileri JSON dosyasından okur
 */
export function getAdmins() {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[HATA] admins.json okunamadı:', error);
    return [];
  }
}

/**
 * Yöneticileri JSON dosyasına kaydeder
 */
export function saveAdmins(admins) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(admins, null, 2), 'utf8');
  } catch (error) {
    console.error('[HATA] admins.json kaydedilemedi:', error);
  }
}

/**
 * Varsayılan (seed) Süper Yönetici hesabını ilklendirir
 */
export async function initSeedAdmin() {
  const admins = getAdmins();

  const defaultEmail = process.env.ADMIN_EMAIL || 'admin@mrc.com';
  const defaultPassword = process.env.ADMIN_PASSWORD || 'mrc123456';

  const existingSuperadmin = admins.find((a) => a.role === 'superadmin' || a.email.toLowerCase() === defaultEmail.toLowerCase());

  if (!existingSuperadmin) {
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const newAdmin = {
      id: Date.now().toString(),
      email: defaultEmail.toLowerCase(),
      password: hashedPassword,
      role: 'superadmin',
      createdAt: new Date().toISOString(),
    };
    admins.push(newAdmin);
    saveAdmins(admins);
    console.log(`[YÖNETİCİ] Varsayılan Süper Yönetici hesabı oluşturuldu: ${defaultEmail}`);
  }
}

/**
 * Giriş kimlik doğrulama
 */
export async function authenticateAdmin(email, password) {
  const admins = getAdmins();
  const admin = admins.find((a) => a.email.toLowerCase() === email.toLowerCase().trim());

  if (!admin) return null;

  const match = await bcrypt.compare(password, admin.password);
  if (!match) return null;

  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    createdAt: admin.createdAt,
  };
}

/**
 * Yeni yönetici ekleme
 */
export async function addAdmin(email, password, role = 'admin') {
  const admins = getAdmins();
  const cleanEmail = email.toLowerCase().trim();

  if (admins.some((a) => a.email.toLowerCase() === cleanEmail)) {
    throw new Error('Bu e-posta adresiyle kayıtlı bir yönetici zaten var.');
  }

  if (!password || password.length < 6) {
    throw new Error('Şifre en az 6 karakter olmalıdır.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newAdmin = {
    id: Date.now().toString(),
    email: cleanEmail,
    password: hashedPassword,
    role: role === 'superadmin' ? 'superadmin' : 'admin',
    createdAt: new Date().toISOString(),
  };

  admins.push(newAdmin);
  saveAdmins(admins);
  return { id: newAdmin.id, email: newAdmin.email, role: newAdmin.role, createdAt: newAdmin.createdAt };
}

/**
 * Yönetici silme
 */
export function deleteAdmin(idOrEmail) {
  let admins = getAdmins();
  const target = admins.find((a) => a.id === idOrEmail || a.email.toLowerCase() === idOrEmail.toLowerCase().trim());

  if (!target) {
    throw new Error('Yönetici bulunamadı.');
  }

  if (target.role === 'superadmin') {
    const superadminCount = admins.filter((a) => a.role === 'superadmin').length;
    if (superadminCount <= 1) {
      throw new Error('Sistemdeki son Süper Yönetici silinemez.');
    }
  }

  admins = admins.filter((a) => a.id !== target.id);
  saveAdmins(admins);
  return true;
}

/**
 * Tüm yöneticileri güvenli şekilde listeleme (şifreler hariç)
 */
export function listAdmins() {
  const admins = getAdmins();
  return admins.map((a) => ({
    id: a.id,
    email: a.email,
    role: a.role,
    createdAt: a.createdAt,
  }));
}
