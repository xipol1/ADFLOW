/**
 * Generate Telegram StringSession for MTProto API.
 *
 * Run this script ONCE locally to authenticate with a phone number
 * and generate the TELEGRAM_SESSION string for .env.
 *
 * Usage:
 *   node scripts/generateTelegramSession.js
 *
 * Requirements:
 *   - TELEGRAM_API_ID and TELEGRAM_API_HASH in .env (or pass as env vars)
 *   - A phone number dedicated to ChannelAd (NOT personal)
 *
 * The script will prompt for:
 *   1. Phone number (international format, e.g. +34612345678)
 *   2. Verification code (sent via Telegram)
 *   3. 2FA password (if enabled)
 *
 * After successful auth, it prints the session string to copy into .env.
 */

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const readline = require('readline');

require('dotenv').config();

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

if (!apiId || !apiHash) {
  console.error('ERROR: Set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env first.');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

(async () => {
  console.log('=== ChannelAd Telegram Session Generator ===\n');
  console.log('This will authenticate with Telegram and generate a session string.');
  console.log('Use a DEDICATED phone number for ChannelAd, never personal.\n');

  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await ask('Phone number (e.g. +34612345678): '),
    phoneCode: async () => await ask('Verification code: '),
    password: async () => await ask('2FA password (leave empty if none): '),
    onError: (err) => console.error('Auth error:', err.message),
  });

  const sessionString = client.session.save();

  console.log('\n=== SESSION GENERATED SUCCESSFULLY ===\n');
  console.log('Add this to your .env file:\n');
  console.log(`TELEGRAM_SESSION=${sessionString}`);
  console.log('\n=========================================\n');

  await client.disconnect();
  rl.close();
})();
