# MRC Moderasyon — Log Sistemi Kurulumu

## Render ayarı

Render Dashboard → **MRC-Moderasyon** servisi → **Environment** ekranında şu değişkeni ekleyin:

```
MRC_LOG_CHANNEL_ID=1568968190346662001
```

Kaydedin ve **Manual Deploy → Deploy latest commit** ile yeniden deploy edin. Değişken yoksa bot çökmeyecek, yalnızca log sistemi devre dışı kalacaktır.

## Discord kurulumu

1. Sunucuda yalnızca yetkililerin erişebildiği bir metin kanalı oluşturun.
2. Discord'da **User Settings → Advanced → Developer Mode** seçeneğini açın.
3. Log kanalına sağ tıklayıp **Copy Channel ID** seçin.
4. Bu değeri Render'da `MRC_LOG_CHANNEL_ID` olarak kaydedin.

## Bot izinleri

Log kanalı için botta şu izinler bulunmalı:

- View Channel
- Send Messages
- Embed Links
- Read Message History
- View Audit Log

Mevcut moderasyon özellikleri için gereken Ban Members, Kick Members ve Moderate Members izinleri ayrıca korunmalıdır.

## Developer Portal ayarları

**Bot → Privileged Gateway Intents** altında şunları açın:

- Server Members Intent
- Message Content Intent

AutoMod tetikleme logları için botun kullandığı uygulama ayarlarında Auto Moderation Execution event erişimi de açık olmalıdır. Davet logları için Guild Invites intent kod tarafında etkinleştirildi.

## Silinen mesaj içerikleri

Bot, gelen kullanıcı mesajlarının içeriğini yalnızca çalışma belleğinde **en fazla 6 saat** ve en fazla **2.000 mesaj** olacak şekilde tutar. Mesaj silinirse bu kısa süreli kopya log embed'inde gösterilir ve ardından bellekten kaldırılır.

- Bot yeniden başlarsa bu geçici bellek temizlenir.
- Bot mesajı görmeden önce silinmişse Discord içeriği vermeyebilir.
- Mesaj içerikleri harici bir veritabanına veya üçüncü taraf servise kaydedilmez.

## Test

Deploy sonrasında şunları test edin:

1. Test kanalında bir mesaj gönderip silin.
2. Bir mesajı düzenleyin.
3. Test rolü oluşturun, düzenleyin veya üyeye rol ekleyin.
4. Test ses kanalına girip çıkın.
5. Test daveti oluşturun.
6. Bir üye giriş/çıkışı gerçekleştiğinde ilgili embed'i doğrulayın.

İşlemi yapan yetkili sadece Discord Audit Log'dan hedef ve zaman penceresi kesin eşleşirse gösterilir. Aksi halde sistem kasıtlı olarak **Bilinmiyor / Tespit Edilemedi** yazar.
