/**
 * Message Create Event
 * Gelen mesajları spam/flood koruması ile kontrol eder.
 */

import { checkMessage } from '../utils/spamFloodGuard.js';

export default {
  name: 'messageCreate',

  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message) {
    await checkMessage(message);
  },
};
