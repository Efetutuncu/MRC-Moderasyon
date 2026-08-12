/**
 * MRC Moderasyon - Web Sunucusu Giriş Noktası
 * Sadece web panelini başlatır. Bot buradan kontrol edilir.
 *
 * Kullanım: node site/start.js
 */

import 'dotenv/config';
import { startWebServer } from './server.js';

startWebServer();
