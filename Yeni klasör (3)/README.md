# MRC Moderasyon — Discord Bot & Web Yönetim Paneli

Discord sunucunuzu yönetmek için geliştirilmiş, modern web arayüzüne sahip Discord moderasyon botu.

## 🌟 Özellikler

- 🔐 **Güvenli Giriş** — E-posta ve şifre ile JWT tabanlı kimlik doğrulama
- 👥 **Çoklu Yönetici** — Süper yöneticiler ek hesap oluşturabilir
- 🤖 **Bot Kontrolü** — Web panelinden botu başlat, durdur, yeniden başlat
- 🛡️ **Moderasyon** — `/ban`, `/kick`, `/timeout` komutları
- 🚫 **Otomatik Koruma** — Spam ve flood algılama + otomatik susturma
- 🎮 **Rol Paneli** — Oyun rolleri için Discord'a interaktif menü gönder
- 📊 **İhlal Takibi** — Kalıcı ihlal kayıtları ve 3. ihlalde yetkili bildirimi

---

## 🚀 Koyeb'e Ücretsiz Deploy (Önerilen)

### 1. GitHub'a Yükle

```bash
git init
git add .
git commit -m "İlk commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/mrc-moderasyon.git
git push -u origin main
```

### 2. Koyeb Hesabı Aç

1. [koyeb.com](https://koyeb.com) adresine gidin
2. **"Sign up with GitHub"** ile ücretsiz kayıt olun

### 3. Yeni Servis Oluştur

1. Koyeb Dashboard → **"Create Service"** → **"GitHub"**
2. Repository olarak `mrc-moderasyon`'u seçin
3. **Build & Run** ayarları otomatik algılanır (Node.js)
4. **"Environment Variables"** bölümüne gidin ve şu değişkenleri ekleyin:

| Değişken | Değer |
|:---|:---|
| `DISCORD_TOKEN` | Discord bot tokenınız |
| `CLIENT_ID` | Bot Client ID |
| `GUILD_ID` | Sunucu ID |
| `WELCOME_CHANNEL_ID` | Hoş geldin kanalı ID |
| `UNREGISTERED_ROLE_ID` | Kayıtsız rol ID |
| `SUREKLI_IHLAL_CHANNEL_ID` | İhlal bildirim kanalı ID |
| `JWT_SECRET` | Güvenli ve rastgele bir metin (örn: `abc123xyz456`) |
| `ADMIN_EMAIL` | Web paneli giriş e-postası |
| `ADMIN_PASSWORD` | Web paneli giriş şifresi |
| `BOT_AUTOSTART` | `true` (botu otomatik başlat) |

5. **"Deploy"** butonuna tıklayın
6. Deploy tamamlanınca size bir URL verilir: `https://xxx.koyeb.app`

---

## 💻 Yerel Çalıştırma

```bash
# Bağımlılıkları kur
npm install

# .env dosyası oluştur
cp .env.example .env
# .env dosyasını düzenleyip kendi değerlerinizi girin

# Web panelini başlat (botu web'den kontrol edin)
npm start

# Sadece botu başlat (web paneli olmadan)
npm run bot
```

Web paneli: **http://localhost:3000**

> Web panelinden botu başlatıp durdurmak istiyorsanız `BOT_AUTOSTART=false`
> kullanın. `true` ayarı, Render'ın her instance/deploy başlangıcında botu otomatik
> açar; aynı projeden birden fazla Render instance veya servis çalışıyorsa her biri
> Discord'a ayrı bot bağlantısı kurar.

---

## 📁 Proje Yapısı

```
mrc-moderasyon/
├── src/
│   ├── bot.js              # Discord bot (ayrı süreç)
│   ├── commands/           # Slash komutları (/ban, /kick, /timeout, /rol-yonet)
│   ├── events/             # Discord olayları
│   ├── handlers/           # Komut ve olay yükleyiciler
│   └── utils/              # Yardımcı araçlar (spam koruması, ihlal takibi)
├── site/
│   ├── start.js            # Web sunucusu giriş noktası
│   ├── server.js           # Express API + bot süreç yönetimi
│   ├── adminManager.js     # Yönetici hesap yönetimi
│   └── public/             # Web arayüzü (HTML, CSS, JS)
├── .env.example            # Ortam değişkenleri şablonu
└── package.json
```

---

## ⚙️ Ortam Değişkenleri

Tüm değişkenler için [.env.example](.env.example) dosyasına bakın.

---

## 🔒 Güvenlik Notu

- `.env` dosyası **asla** GitHub'a yüklenmez
- `admins.json` ve `violations.json` **asla** GitHub'a yüklenmez
- Bot tokenınızı kimseyle paylaşmayın
