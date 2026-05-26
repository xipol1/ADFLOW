/**
 * Cloudflare R2 Storage Service
 *
 * R2 es S3-compatible — usamos el SDK de AWS apuntando al endpoint R2.
 * Una sola instancia del cliente reutilizada por proceso.
 *
 * Configuración (env vars):
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET
 *   R2_PUBLIC_URL
 *
 * Comportamiento sin env vars:
 *   `uploadFile()` lanza con `code: STORAGE_NOT_CONFIGURED`. La ruta
 *   /api/uploads/campaign-media devuelve 503 en lugar de crashear.
 */

const crypto = require('crypto');
const path = require('path');
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf',
]);

const MAX_BYTES = 25 * 1024 * 1024;

let client = null;
let config = null;

function getClient() {
  if (client) return { client, config };
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return { client: null, config: null };
  }
  config = {
    bucket,
    publicUrl: (publicUrl || '').replace(/\/+$/, ''),
  };
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return { client, config };
}

function isEnabled() {
  return Boolean(getClient().client);
}

function assertEnabled() {
  if (!isEnabled()) {
    const err = new Error('Almacenamiento R2 no configurado. Revisa R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET.');
    err.status = 503;
    err.code = 'STORAGE_NOT_CONFIGURED';
    throw err;
  }
}

async function uploadFile({ buffer, mime, originalName, userId }) {
  assertEnabled();
  if (!Buffer.isBuffer(buffer)) throw new Error('uploadFile requires a Buffer.');
  if (!ALLOWED_MIME.has(mime)) {
    const err = new Error(`Tipo de archivo no permitido: ${mime}`);
    err.status = 400; err.code = 'MIME_NOT_ALLOWED';
    throw err;
  }
  if (buffer.length > MAX_BYTES) {
    const err = new Error(`Archivo demasiado grande (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Máximo ${(MAX_BYTES / 1024 / 1024)}MB.`);
    err.status = 400; err.code = 'FILE_TOO_LARGE';
    throw err;
  }

  const { client: c, config: cfg } = getClient();
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const ext = (path.extname(originalName || '') || mimeToExt(mime)).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const random = crypto.randomBytes(12).toString('hex');
  const userSegment = String(userId || 'anon').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 24) || 'anon';
  const key = `campaign-media/${yyyy}/${mm}/${userSegment}/${random}${ext}`;

  await c.send(new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    Body: buffer,
    ContentType: mime,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return {
    url: publicUrlFor(key),
    key,
    size: buffer.length,
    mime,
  };
}

function publicUrlFor(key) {
  const { config: cfg } = getClient();
  if (!cfg) throw new Error('Storage not configured');
  if (cfg.publicUrl) return `${cfg.publicUrl}/${key}`;
  return `r2://${cfg.bucket}/${key}`;
}

async function deleteFile(key) {
  assertEnabled();
  const { client: c, config: cfg } = getClient();
  await c.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
}

async function exists(key) {
  if (!isEnabled()) return false;
  const { client: c, config: cfg } = getClient();
  try {
    await c.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

function mimeToExt(mime) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'application/pdf': '.pdf',
  };
  return map[mime] || '';
}

module.exports = {
  uploadFile,
  deleteFile,
  exists,
  publicUrlFor,
  isEnabled,
  ALLOWED_MIME: Array.from(ALLOWED_MIME),
  MAX_BYTES,
};
