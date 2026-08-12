/**
 * Eski giriş noktası için uyumluluk katmanı.
 *
 * Botu doğrudan burada başlatmak, web panelinin başlattığı bot süreciyle
 * aynı anda iki Discord bağlantısı kurulmasına neden olabiliyordu. Tüm
 * başlangıç yolları artık site/start.js ile aynı tek akışı kullanır:
 * web sunucusu -> src/bot.js child process.
 */
import 'dotenv/config';
import { startWebServer } from '../site/server.js';

startWebServer();
