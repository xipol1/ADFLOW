/**
 * Message content moderation for campaign chat.
 *
 * Prevents users from sharing contact info, external payment links,
 * or social handles to take transactions off-platform.
 *
 * Returns { clean, blocked, reason } where:
 *   - clean:   true if message is safe to send
 *   - blocked: true if message was rejected
 *   - reason:  human-readable reason (Spanish) when blocked
 */

// ── Patterns ────────────────────────────────────────────────────────────────

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

// Phone numbers: +34 600 123 456, 600-123-456, (600) 123 4567, etc.
const PHONE_RE = /(?:\+?\d{1,3}[\s.\-]?)?\(?\d{2,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{3,4}/;

// URLs that are NOT channelad.io
const URL_RE = /https?:\/\/[^\s]+/gi;
const ALLOWED_DOMAINS = ['channelad.io', 'www.channelad.io'];

// Social media handles / usernames
const SOCIAL_PATTERNS = [
  // @username patterns (but not @channelad)
  /(?:^|\s)@[a-zA-Z0-9_]{3,30}(?:\s|$)/,
  // Explicit platform mentions with handle
  /(?:instagram|ig|insta|telegram|tg|whatsapp|wsp|wa|discord|twitter|x\.com|tiktok|snapchat|linkedin|facebook|fb|signal)[\s.:/@]*[a-zA-Z0-9_.]{3,30}/i,
  // t.me links
  /t\.me\/[a-zA-Z0-9_]+/i,
  // wa.me links
  /wa\.me\/\d+/i,
];

// External payment methods
const PAYMENT_PATTERNS = [
  /paypal[\s.:/@]*[a-zA-Z0-9_.@]+/i,
  /bizum/i,
  /revolut/i,
  /(?:transferencia|wire\s*transfer|bank\s*transfer)/i,
  /(?:IBAN|ES\d{2}\s?\d{4}\s?\d{4}\s?\d{2}\s?\d{10})/i,
  /paypal\.me\/[a-zA-Z0-9_]+/i,
  /venmo/i,
  /zelle/i,
  /crypto\s*wallet|bitcoin|ethereum|btc|eth|usdt/i,
];

// Anti-evasion: common obfuscation tricks
const OBFUSCATION_PATTERNS = [
  // "arroba" = @ in Spanish, "punto" = dot
  /[a-zA-Z0-9]+\s*(?:arroba|arob[a@])\s*[a-zA-Z0-9]+\s*(?:punto|p\.?u\.?n\.?t\.?o)\s*[a-zA-Z]+/i,
  // Spaced-out emails: g m a i l . c o m
  /g\s*m\s*a\s*i\s*l/i,
  /h\s*o\s*t\s*m\s*a\s*i\s*l/i,
  /o\s*u\s*t\s*l\s*o\s*o\s*k/i,
  /y\s*a\s*h\s*o\s*o/i,
  // Number obfuscation: seiscientos, seis-cero-cero
  /(?:seis|siete|nueve)\s*(?:cien|cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)/i,
];

// ── Moderation function ─────────────────────────────────────────────────────

function moderateMessage(text) {
  if (!text || typeof text !== 'string') {
    return { clean: false, blocked: true, reason: 'Mensaje vacio' };
  }

  const trimmed = text.trim();

  // 1. Check emails
  if (EMAIL_RE.test(trimmed)) {
    return {
      clean: false,
      blocked: true,
      reason: 'No se permiten direcciones de email en el chat. Usa la plataforma para toda la comunicacion.',
    };
  }

  // 2. Check phone numbers (only if 7+ digits found)
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length >= 7 && PHONE_RE.test(trimmed)) {
    return {
      clean: false,
      blocked: true,
      reason: 'No se permiten numeros de telefono en el chat. Toda la comunicacion debe mantenerse en la plataforma.',
    };
  }

  // 3. Check URLs (allow channelad.io links)
  const urls = trimmed.match(URL_RE) || [];
  for (const url of urls) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (!ALLOWED_DOMAINS.some(d => host === d || host.endsWith('.' + d))) {
        return {
          clean: false,
          blocked: true,
          reason: 'No se permiten enlaces externos en el chat. Comparte contenido relevante a traves de los campos de la campana.',
        };
      }
    } catch {
      // Malformed URL — block it to be safe
      return {
        clean: false,
        blocked: true,
        reason: 'No se permiten enlaces externos en el chat.',
      };
    }
  }

  // 4. Check social media handles
  for (const pattern of SOCIAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        clean: false,
        blocked: true,
        reason: 'No se permiten nombres de usuario o redes sociales en el chat. Toda la comunicacion debe mantenerse en Channelad.',
      };
    }
  }

  // 5. Check external payment methods
  for (const pattern of PAYMENT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        clean: false,
        blocked: true,
        reason: 'No se permiten referencias a metodos de pago externos. Todos los pagos se procesan de forma segura a traves de Channelad.',
      };
    }
  }

  // 6. Check obfuscation attempts
  for (const pattern of OBFUSCATION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        clean: false,
        blocked: true,
        reason: 'Tu mensaje contiene informacion de contacto que no esta permitida en el chat.',
      };
    }
  }

  return { clean: true, blocked: false, reason: null };
}

module.exports = { moderateMessage };
