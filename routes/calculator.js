const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { ensureDb } = require('../lib/ensureDb');
const { limitarIntentos } = require('../middleware/rateLimiter');
const { runAnalysis } = require('../services/calculatorAnalyzer');

// ─── Rate limits ────────────────────────────────────────────────────────────
// Generosos en granularidad por minuto pero estrictos por día para evitar
// enumeración / spam. Aplican por IP.
const leadLimiterPerMinute = limitarIntentos({
  windowMs: 60 * 1000,
  max: 6,
  message: { success: false, message: 'Demasiadas solicitudes en poco tiempo. Espera un minuto.' },
});

const leadLimiterPerDay = limitarIntentos({
  windowMs: 24 * 60 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Has alcanzado el límite diario de envíos.' },
});

// Analyze tiene su propio rate limit — más generoso por minuto pero
// estricto por día porque cada análisis pega a una fuente externa.
const analyzeLimiterPerMinute = limitarIntentos({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiadas peticiones de análisis. Espera un minuto.' },
});

const analyzeLimiterPerDay = limitarIntentos({
  windowMs: 24 * 60 * 60 * 1000,
  max: 60,
  message: { success: false, message: 'Has alcanzado el límite diario de análisis.' },
});

// ─── Helpers ────────────────────────────────────────────────────────────────
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'tempmail.org', 'guerrillamail.com', '10minutemail.com',
  'yopmail.com', 'throwaway.email', 'maildrop.cc',
]);

function isDisposable(email) {
  const domain = (email || '').split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain);
}

function sanitizeSnapshot(raw = {}) {
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n < 1e9 ? Math.round(n) : 0;
  };
  const str = (v, maxLen = 60) => (typeof v === 'string' ? v.slice(0, maxLen) : null);

  return {
    platform:            str(raw.platform, 30),
    niche:               str(raw.niche, 40),
    followers:           num(raw.followers),
    reactionsPerPost:    num(raw.reactionsPerPost),
    postsPerMonth:       num(raw.postsPerMonth),
    format:              str(raw.format, 30),
    featuredFormatPrice: num(raw.featuredFormatPrice),
    monthlyEarnings:     num(raw.monthlyEarnings),
    yearlyEarnings:      num(raw.yearlyEarnings),
    effectiveCpm:        num(raw.effectiveCpm),
    reachPerPost:        num(raw.reachPerPost),
    whatsappType:        str(raw.whatsappType, 20),
    whatsappBucket:      str(raw.whatsappBucket, 10),
  };
}

function sanitizeUtm(raw = {}) {
  const str = (v) => (typeof v === 'string' ? v.slice(0, 100) : '');
  return {
    source:   str(raw.source),
    medium:   str(raw.medium),
    campaign: str(raw.campaign),
    term:     str(raw.term),
    content:  str(raw.content),
  };
}

// ─── HMAC tokens for unsubscribe links ──────────────────────────────────────
// Generamos un token firmado con HMAC-SHA256 sobre el leadId. Evita que
// alguien enumere y dé de baja a leads ajenos. El secret se reusa JWT_SECRET
// — si rota, los tokens viejos quedan inválidos (aceptable: el usuario
// re-pide unsubscribe).
function makeUnsubscribeToken(leadId) {
  const secret = process.env.JWT_SECRET || 'channelad-fallback-unsub-secret';
  const mac = crypto.createHmac('sha256', secret).update(String(leadId)).digest('hex').slice(0, 32);
  return `${leadId}.${mac}`;
}

function verifyUnsubscribeToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [leadId, mac] = token.split('.');
  if (!leadId || !mac) return null;
  const expected = makeUnsubscribeToken(leadId).split('.')[1];
  // timingSafeEqual exige buffers del mismo tamaño — si no coincide la
  // longitud, ya sabemos que falla.
  if (mac.length !== expected.length) return null;
  const ok = crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected));
  return ok ? leadId : null;
}

// ─── Email HTML del reporte ─────────────────────────────────────────────────
// Por ahora un HTML simple inline (sin PDF). El PDF queda como fase 3 si lo
// necesitamos. La plantilla muestra la tarifa, la tabla de formatos, y un CTA
// para registrar el canal en Channelad.
function renderReportEmailHtml({ snapshot, unsubscribeUrl, calcUrl }) {
  const fmtEur = (n) => `${Math.round(n).toLocaleString('es-ES')} €`;
  const niche = snapshot.niche || '—';
  const platform = snapshot.platform || '—';
  const subs = snapshot.followers ? snapshot.followers.toLocaleString('es-ES') : '—';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Tu análisis de canal — Channelad</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e;">
  <div style="max-width:600px;margin:0 auto;padding:24px;background:#fff;">
    <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#25d366;margin:0 0 8px;">Channelad · Análisis de canal</p>
    <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;margin:0 0 8px;">Tu tarifa estimada</h1>
    <p style="font-size:14px;color:#6e6e73;line-height:1.55;margin:0 0 24px;">
      Plataforma: <strong style="color:#1c1c1e;">${platform}</strong> · Nicho: <strong style="color:#1c1c1e;">${niche}</strong> · Suscriptores: <strong style="color:#1c1c1e;">${subs}</strong>
    </p>

    <div style="background:#eafde9;border:1px solid #25d36644;border-radius:12px;padding:20px;margin-bottom:16px;">
      <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#25d366;margin:0 0 8px;">Precio · Post estándar</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:-0.03em;color:#1c1c1e;line-height:1;">${fmtEur(snapshot.featuredFormatPrice)}</div>
      <p style="font-size:13px;color:#6e6e73;margin:10px 0 0;">El anunciante paga ${fmtEur(snapshot.featuredFormatPrice * 1.2)} (tu tarifa + 20% comisión Channelad).</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td style="padding:12px 16px;background:#f5f5f7;border-radius:10px 0 0 10px;">
          <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6e6e73;margin:0 0 4px;">Ingreso mensual</p>
          <div style="font-size:22px;font-weight:700;">${fmtEur(snapshot.monthlyEarnings)}</div>
          <p style="font-size:12px;color:#6e6e73;margin:6px 0 0;">Anual: ${fmtEur(snapshot.yearlyEarnings)}</p>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:12px 16px;background:#f5f5f7;border-radius:0 10px 10px 0;">
          <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6e6e73;margin:0 0 4px;">CPM efectivo</p>
          <div style="font-size:22px;font-weight:700;">${snapshot.effectiveCpm.toFixed(1)} €</div>
          <p style="font-size:12px;color:#6e6e73;margin:6px 0 0;">Alcance ~ ${snapshot.reachPerPost.toLocaleString('es-ES')} por post</p>
        </td>
      </tr>
    </table>

    <p style="font-size:14px;color:#1c1c1e;line-height:1.6;margin:24px 0 16px;">
      Esta estimación se basa en CPMs medianos de +2.500 canales en seguimiento propio. Cuando publiques tu primer post patrocinado en Channelad, ajustaremos la tarifa a tus datos reales.
    </p>

    <table style="width:100%;margin:24px 0;">
      <tr><td style="text-align:center;">
        <a href="${calcUrl}" style="display:inline-block;background:#25d366;color:#fff;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;">
          Registrar mi canal en Channelad
        </a>
      </td></tr>
    </table>

    <p style="font-size:12px;color:#6e6e73;line-height:1.5;margin:32px 0 0;border-top:1px solid #e4e4e7;padding-top:16px;">
      Recibes este email porque solicitaste el análisis en nuestra calculadora.
      Si no quieres recibir más comunicaciones, <a href="${unsubscribeUrl}" style="color:#6e6e73;text-decoration:underline;">date de baja aquí</a>.<br><br>
      Channelad · channelad.io · Marketplace de publicidad en canales hispanohablantes
    </p>
  </div>
</body>
</html>`;
}

// ─── POST /api/calculator/lead ──────────────────────────────────────────────
// Captura el email del creador junto al snapshot del análisis y envía el
// reporte por email.
router.post('/lead', leadLimiterPerDay, leadLimiterPerMinute, async (req, res) => {
  try {
    if (!(await ensureDb())) {
      return res.status(503).json({ success: false, message: 'DB unavailable, try again in a minute' });
    }

    const CalculatorLead = require('../models/CalculatorLead');
    const {
      email,
      consent,
      consentText,
      snapshot,
      source,
      utm,
      referrer,
      locale,
    } = req.body || {};

    // ── Validación ──
    if (!email || typeof email !== 'string' || !EMAIL_RX.test(email)) {
      return res.status(400).json({ success: false, message: 'Email inválido' });
    }
    if (consent !== true) {
      return res.status(400).json({ success: false, message: 'Falta el consentimiento' });
    }

    const cleanEmail = email.toLowerCase().trim().slice(0, 200);
    const cleanSnapshot = sanitizeSnapshot(snapshot || {});
    const cleanUtm = sanitizeUtm(utm || {});
    const cleanSource = ['calculator', 'calculator_whatsapp', 'blog_calculator'].includes(source)
      ? source
      : 'calculator';

    // ── IP hash ──
    const rawIp =
      req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers?.['x-real-ip'] ||
      req.ip ||
      req.socket?.remoteAddress ||
      '';
    const ipHash = CalculatorLead.hashIp(rawIp);

    // ── Upsert por email ──
    const lead = await CalculatorLead.findOneAndUpdate(
      { email: cleanEmail },
      {
        $set: {
          snapshot:    cleanSnapshot,
          source:      cleanSource,
          utm:         cleanUtm,
          referrer:    (typeof referrer === 'string' ? referrer.slice(0, 500) : ''),
          userAgent:   (req.headers?.['user-agent'] || '').slice(0, 500),
          locale:      (typeof locale === 'string' ? locale.slice(0, 20) : ''),
          consentAt:   new Date(),
          consentText: (typeof consentText === 'string' ? consentText.slice(0, 500) : ''),
          ipHash,
        },
        $setOnInsert: {
          email:  cleanEmail,
          status: 'new',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // ── Envío reporte (best-effort, no bloquea) ─
    // No re-enviamos si ya estaba unsubscribed.
    if (!lead.unsubscribedAt) {
      try {
        const emailService = require('../services/emailService');
        const baseUrl = process.env.PUBLIC_URL || 'https://channelad.io';
        const unsubToken = makeUnsubscribeToken(String(lead._id));
        const unsubscribeUrl = `${baseUrl}/api/calculator/unsubscribe?token=${unsubToken}`;
        const calcUrl = `${baseUrl}/auth/register?utm_source=calculator_report&utm_medium=email`;

        if (emailService?.sendRaw) {
          emailService.sendRaw({
            to: cleanEmail,
            subject: `Tu análisis de canal · ${cleanSnapshot.featuredFormatPrice} € por post estándar`,
            html: renderReportEmailHtml({ snapshot: cleanSnapshot, unsubscribeUrl, calcUrl }),
            text: `Tu análisis está listo. Tarifa estimada: ${cleanSnapshot.featuredFormatPrice} € por post estándar. Ver web: ${calcUrl}. Baja: ${unsubscribeUrl}`,
          })
            .then(() => CalculatorLead.updateOne({ _id: lead._id }, { $set: { reportSentAt: new Date(), status: 'emailed' } }).catch(() => {}))
            .catch((err) => console.error('[calculator/lead] email send failed:', err?.message));
        }

        // Notif interna a growth (no bloqueante)
        if (emailService?.sendRaw) {
          emailService.sendRaw({
            to: 'contact@channelad.io',
            subject: `[Calc lead] ${cleanSnapshot.platform || '?'} · ${cleanSnapshot.niche || '?'} · ${cleanSnapshot.followers || 0} subs`,
            text: `Email: ${cleanEmail}\nPrecio post: ${cleanSnapshot.featuredFormatPrice} €\nMensual: ${cleanSnapshot.monthlyEarnings} €\nFuente: ${cleanSource}\nUTM: ${JSON.stringify(cleanUtm)}\nDisposable: ${isDisposable(cleanEmail)}\n\nLead ID: ${lead._id}`,
          }).catch(() => {});
        }
      } catch { /* email service opcional */ }
    }

    return res.json({
      success: true,
      leadId: lead._id,
      message: 'Análisis enviado a tu email. Revisa spam si no lo ves en 5 minutos.',
    });
  } catch (err) {
    console.error('[calculator/lead] error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Error guardando el lead' });
  }
});

// ─── GET /api/calculator/unsubscribe ────────────────────────────────────────
// Pone unsubscribedAt y devuelve una página HTML de confirmación. Idempotente:
// si ya estaba unsubscribed, igualmente confirma.
router.get('/unsubscribe', async (req, res) => {
  const token = req.query?.token;
  const leadId = verifyUnsubscribeToken(token);

  // Página de respuesta — siempre HTML simple, no revela si el token era válido
  // o no (evita enumerar).
  const renderPage = (title, body) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title} · Channelad</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1c1e;">
  <div style="max-width:520px;margin:80px auto;padding:32px;background:#fff;border-radius:16px;text-align:center;">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;">${title}</h1>
    <p style="font-size:15px;color:#6e6e73;line-height:1.6;margin:0 0 24px;">${body}</p>
    <a href="https://channelad.io" style="display:inline-block;padding:12px 24px;background:#25d366;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Volver a channelad.io</a>
  </div>
</body>
</html>`;

  if (!leadId) {
    return res.status(400).send(renderPage(
      'Enlace no válido',
      'El enlace de baja no es válido o ha caducado. Si recibes nuestros emails y no quieres más, escríbenos a contact@channelad.io.'
    ));
  }

  try {
    if (!(await ensureDb())) {
      return res.status(503).send(renderPage(
        'Servicio temporalmente no disponible',
        'No hemos podido procesar tu baja ahora. Vuelve a intentarlo en unos minutos.'
      ));
    }
    const CalculatorLead = require('../models/CalculatorLead');
    await CalculatorLead.updateOne(
      { _id: leadId },
      { $set: { unsubscribedAt: new Date(), status: 'unsubscribed' } }
    );
    return res.send(renderPage(
      'Te hemos dado de baja',
      'No volverás a recibir comunicaciones automáticas sobre tu análisis. Puedes volver a suscribirte usando la calculadora cuando quieras.'
    ));
  } catch (err) {
    console.error('[calculator/unsubscribe] error:', err?.message || err);
    return res.status(500).send(renderPage(
      'Error procesando la baja',
      'Algo ha fallado. Vuelve a intentarlo o escríbenos a contact@channelad.io.'
    ));
  }
});

// ─── POST /api/calculator/analyze ───────────────────────────────────────────
// Recibe { link } público, detecta plataforma, analiza datos públicos del
// canal y devuelve un snapshot que el frontend usa para pre-rellenar el
// wizard. Si el link es WhatsApp, devolvemos un redirect al questionnaire.
router.post('/analyze', analyzeLimiterPerDay, analyzeLimiterPerMinute, async (req, res) => {
  try {
    const { link } = req.body || {};
    if (!link || typeof link !== 'string' || link.length > 500) {
      return res.status(400).json({ success: false, message: 'Link inválido o demasiado largo' });
    }

    // Cache lookup ── solo si Mongo disponible. Si falla la BD, ejecutamos
    // el analyzer de todas formas — el cache es optimización, no requisito.
    const { detectPlatform } = require('../services/calculatorAnalyzer/platformDetector');
    const detected = detectPlatform(link);

    let cachedResult = null;
    let CalculatorAnalysis = null;
    const dbOk = await ensureDb();
    if (dbOk && detected) {
      try {
        CalculatorAnalysis = require('../models/CalculatorAnalysis');
        const fingerprint = CalculatorAnalysis.fingerprintOf(detected.platform, detected.externalId);
        const cached = await CalculatorAnalysis.findOne({
          fingerprint,
          expiresAt: { $gt: new Date() },
        }).lean();
        if (cached && cached.status === 'ok') {
          cachedResult = {
            ok: true,
            platform: cached.platform,
            externalId: cached.externalId,
            normalizedUrl: cached.inputUrl,
            status: cached.status,
            data: cached.data,
            cached: true,
            scrapedFrom: 'cache',
            analysisId: cached._id,
          };
        }
      } catch (err) {
        console.warn('[calculator/analyze] cache lookup failed:', err?.message);
      }
    }

    if (cachedResult) {
      return res.json({ success: true, ...cachedResult });
    }

    // ── Ejecutar el analyzer ──
    const result = await runAnalysis(link);

    if (!result.ok) {
      return res.status(400).json({ success: false, ...result });
    }

    // ── Persistir (best-effort) ──
    let analysisId = null;
    if (dbOk && CalculatorAnalysis && result.platform && result.externalId) {
      try {
        const rawIp =
          req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
          req.headers?.['x-real-ip'] ||
          req.ip ||
          req.socket?.remoteAddress ||
          '';
        const ipHash = CalculatorAnalysis.hashIp(rawIp);
        const fingerprint = CalculatorAnalysis.fingerprintOf(result.platform, result.externalId);

        // Sólo persistimos plataformas que están en el enum del schema
        const platformEnumMap = {
          telegram:           'telegram',
          discord:            'discord',
          newsletter:         'newsletter',
          whatsapp:           'whatsapp_channel', // por defecto channel — el group viene aparte
        };
        const mappedPlatform = platformEnumMap[result.platform];

        if (mappedPlatform) {
          const doc = await CalculatorAnalysis.findOneAndUpdate(
            { fingerprint },
            {
              $set: {
                inputUrl:     result.normalizedUrl || link,
                platform:     mappedPlatform,
                externalId:   result.externalId,
                status:       result.status === 'redirect_questionnaire' ? 'redirect_oauth' : result.status,
                data:         result.data || {},
                scrapedFrom:  result.scrapedFrom || 'html_public',
                durationMs:   result.durationMs || 0,
                errorMessage: result.errorMessage || '',
                ipHash,
                userAgent:    (req.headers?.['user-agent'] || '').slice(0, 500),
                expiresAt:    new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
              $setOnInsert: { fingerprint },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          analysisId = doc._id;
        }
      } catch (err) {
        console.warn('[calculator/analyze] persist failed:', err?.message);
      }
    }

    return res.json({ success: true, ...result, analysisId, cached: false });
  } catch (err) {
    console.error('[calculator/analyze] error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Error analizando el canal' });
  }
});

module.exports = router;
