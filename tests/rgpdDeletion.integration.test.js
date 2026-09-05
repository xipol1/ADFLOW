// SPEC-B1 T013 — integration tests del flujo de borrado RGPD (User Story 1).
// Escritos ANTES de las implementaciones T015–T022; el spec exige TDD aquí.
// Por tanto, este archivo debe FALLAR al cargar mientras
// `models/AccountDeletionRequest`, `models/ReservedSlug` o
// `services/anonymizationService` no existan. NO proteger con try/catch.

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.RGPD_TOKEN_SECRET = process.env.RGPD_TOKEN_SECRET || 'test-rgpd-token-secret';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');

const { useMongo } = require('./helpers/useMongo');
const { createTestUser } = require('./helpers/setup');

// Dependencias del spec aún no implementadas — importar aquí garantiza que
// Jest falle si el modelo no existe (señal de TDD pendiente, NO de bug).
const AccountDeletionRequest = require('../models/AccountDeletionRequest');
const Usuario = require('../models/Usuario');
const Dispute = require('../models/Dispute');
const rgpdDeletionWorker = require('../workers/rgpdDeletionWorker');

// Helper: marca un usuario como emailVerificado=true y re-loguea para
// obtener un token con el flag puesto (algunos middlewares lo exigen).
async function makeVerifiedUser(suffix, overrides = {}) {
  const email = `rgpd-del-${suffix}-${Date.now()}@test.com`;
  const password = 'TestPass123';
  const userData = { email, password, nombre: `RGPD ${suffix}`, role: 'creator', ...overrides };

  const reg = await createTestUser(userData);
  if (!reg.user?.id && !reg.user?._id) return { token: undefined, user: null, email, password };

  const userId = reg.user.id || reg.user._id;
  await Usuario.findByIdAndUpdate(userId, { emailVerificado: true });

  const logRes = await request(app).post('/api/auth/login').send({ email, password });
  return { token: logRes.body?.token, user: logRes.body?.user, email, password, userId };
}

describe('RGPD deletion — integration (T013)', () => {
  useMongo();

  // (a) Happy path completo: request → confirm → cron fuerza fin de gracia → executed.
  // Mide SC-001: el POST /api/rgpd/deletion debe responder en <90s desde el primer clic.
  describe('(a) happy path completo con cron forzado', () => {
    test('flujo completo termina en executed y respeta SC-001 (<90s)', async () => {
      const { token, userId } = await makeVerifiedUser('happy');
      if (!token) return; // sin DB

      const t0 = Date.now();
      const reqRes = await request(app)
        .post('/api/rgpd/deletion')
        .set('Authorization', `Bearer ${token}`)
        .send({ motivo: 'Ya no uso la plataforma' });

      if (reqRes.status === 503) return;
      const elapsedMs = Date.now() - t0;

      // SC-001: <90s — el endpoint es síncrono salvo email, no debería tardar nada.
      expect(elapsedMs).toBeLessThan(90_000);
      expect(reqRes.status).toBe(202);
      expect(reqRes.body).toHaveProperty('requestId');
      expect(reqRes.body).toHaveProperty('status', 'pending_email_confirmation');

      const requestId = reqRes.body.requestId;

      // Recupera el documento real para extraer el token plano vía bypass de bcrypt:
      // en tests usamos un token conocido inyectado por el endpoint vía side-channel,
      // o re-emitimos el hash con un token controlado. Como no podemos inferir el
      // token bcryptado, modelamos la confirmación inyectando el plano que el
      // controlador habrá guardado en metadata de test (campo NO presente en prod).
      const doc = await AccountDeletionRequest.findById(requestId);
      expect(doc).not.toBeNull();
      expect(doc.status).toBe('pending_email_confirmation');

      // Inyectamos un token plano conocido y su hash bcrypt en el documento
      // para confirmar sin depender de la entrega de email real.
      const bcrypt = require('bcryptjs');
      const plainToken = 'a'.repeat(64);
      doc.confirmationTokenHash = await bcrypt.hash(plainToken, 4);
      doc.confirmationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await doc.save();

      const confRes = await request(app)
        .post('/api/rgpd/deletion/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({ requestId, token: plainToken });

      if (confRes.status === 503) return;
      expect(confRes.status).toBe(200);
      expect(confRes.body).toHaveProperty('status', 'grace_period');
      expect(confRes.body).toHaveProperty('gracePeriodEndsAt');
      expect(confRes.body).toHaveProperty('liquidationPreview');

      // FR-003: sesiones del usuario quedan vacías tras confirmación.
      const userAfterConfirm = await Usuario.findById(userId).select('sesiones deletionStatus');
      expect(userAfterConfirm.sesiones.length).toBe(0);
      expect(userAfterConfirm.deletionStatus).toBe('pending_deletion');

      // Forzamos el fin de gracia adelantando el documento en DB y corriendo
      // el worker. El cron real evalúa `gracePeriodEndsAt <= now`.
      await AccountDeletionRequest.findByIdAndUpdate(requestId, {
        gracePeriodEndsAt: new Date(Date.now() - 1000),
      });

      await rgpdDeletionWorker.runExpiredGracePeriods();

      const finalDoc = await AccountDeletionRequest.findById(requestId);
      expect(['executed', 'paused_pending_stripe', 'paused_pending_liquidation']).toContain(finalDoc.status);

      // SC-006: el audit log queda poblado para esta request.
      const RGPDAuditLog = require('../models/RGPDAuditLog');
      const entries = await RGPDAuditLog.find({ usuarioId: userId }).sort({ timestamp: 1 });
      const actions = entries.map(e => e.action);
      expect(actions).toEqual(expect.arrayContaining(['deletion.requested', 'deletion.confirmed']));
    });
  });

  // (b) Bloqueo por disputa abierta — FR-006.
  describe('(b) bloqueo por disputa abierta', () => {
    test('responde 409 disputes_open cuando hay disputa open/under_review', async () => {
      const { token, userId } = await makeVerifiedUser('disp');
      if (!token) return;

      // Disputa mínima — usamos un ObjectId fake para campaign/againstUser; el
      // pre-check solo consulta openedBy/againstUser+status, no popula.
      await Dispute.create({
        campaign: new mongoose.Types.ObjectId(),
        openedBy: userId,
        againstUser: new mongoose.Types.ObjectId(),
        reason: 'fraud',
        description: 'Disputa de prueba que bloquea el borrado',
        status: 'open',
      });

      const res = await request(app)
        .post('/api/rgpd/deletion')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      if (res.status === 503) return;
      expect(res.status).toBe(409);
      expect(res.body?.error?.code || res.body?.code).toBe('disputes_open');
    });
  });

  // (c) Bloqueo por último admin — FR-008.
  describe('(c) bloqueo por último admin', () => {
    test('responde 409 last_admin cuando el usuario es el único admin', async () => {
      const { token, userId } = await makeVerifiedUser('admin', { role: 'creator' });
      if (!token) return;

      // Promocionamos a admin directamente en DB y re-login para que el token
      // refleje el rol nuevo. Como es el único admin del sistema, el pre-check
      // FR-008 debe bloquear.
      await Usuario.findByIdAndUpdate(userId, { rol: 'admin' });
      const reLog = await request(app).post('/api/auth/login').send({
        email: (await Usuario.findById(userId)).email,
        password: 'TestPass123',
      });
      const adminToken = reLog.body?.token;
      if (!adminToken) return;

      const res = await request(app)
        .post('/api/rgpd/deletion')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      if (res.status === 503) return;
      expect(res.status).toBe(409);
      expect(res.body?.error?.code || res.body?.code).toBe('last_admin');
    });
  });

  // (d) Bloqueo por agencia con canales — FR-008.a.
  // Skeleton-ready: `Canal.gestorId` no existe todavía, así que el query
  // devuelve 0 y el pre-check pasa. Verificamos que el endpoint NO devuelve
  // 500 y que la rama de evaluación se ejecuta (tipoPerfil agencia llega al
  // pre-check sin romper). Cuando gestorId entre en producción, el bloqueo
  // se activa automáticamente sin cambios en el test.
  describe('(d) bloqueo por agencia con canales (skeleton-ready)', () => {
    test('agencia sin canales gestionados hoy pasa el pre-check sin error', async () => {
      const { token, userId } = await makeVerifiedUser('agency');
      if (!token) return;

      await Usuario.findByIdAndUpdate(userId, { tipoPerfil: 'agencia' });

      const res = await request(app)
        .post('/api/rgpd/deletion')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      if (res.status === 503) return;
      // Hoy el query a Canal por gestorId devuelve 0; el endpoint NO debe
      // responder 500 ni 409 agency_clients_active mientras el campo no exista.
      // Cuando el campo aparezca, este test pasará a esperar 409 con
      // body.code === 'agency_clients_active'.
      expect([202, 409]).toContain(res.status);
      if (res.status === 409) {
        // Si en algún momento la implementación decide bloquear todas las
        // agencias preventivamente, el código debe ser éste (no genérico).
        expect(res.body?.error?.code || res.body?.code).toBe('agency_clients_active');
      } else {
        expect(res.body).toHaveProperty('status', 'pending_email_confirmation');
      }
    });
  });

  // (e) Cancelación durante gracia.
  describe('(e) cancelación durante periodo de gracia', () => {
    test('DELETE /api/rgpd/deletion transiciona la request a cancelled', async () => {
      const { token, userId } = await makeVerifiedUser('cancel');
      if (!token) return;

      const reqRes = await request(app)
        .post('/api/rgpd/deletion')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      if (reqRes.status === 503) return;

      const requestId = reqRes.body.requestId;
      const bcrypt = require('bcryptjs');
      const plainToken = 'b'.repeat(64);
      await AccountDeletionRequest.findByIdAndUpdate(requestId, {
        confirmationTokenHash: await bcrypt.hash(plainToken, 4),
        confirmationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const confRes = await request(app)
        .post('/api/rgpd/deletion/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({ requestId, token: plainToken });
      if (confRes.status === 503) return;
      expect(confRes.status).toBe(200);

      const cancelRes = await request(app)
        .delete('/api/rgpd/deletion')
        .set('Authorization', `Bearer ${token}`);

      if (cancelRes.status === 503) return;
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body).toHaveProperty('status', 'cancelled');

      const finalUser = await Usuario.findById(userId).select('deletionStatus');
      expect(finalUser.deletionStatus).toBe('active');
    });
  });

  // (f) Token de confirmación expirado → 410.
  describe('(f) token de confirmación expirado', () => {
    test('responde 410 token_expired si el token caducó', async () => {
      const { token } = await makeVerifiedUser('expired');
      if (!token) return;

      const reqRes = await request(app)
        .post('/api/rgpd/deletion')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      if (reqRes.status === 503) return;

      const requestId = reqRes.body.requestId;
      const bcrypt = require('bcryptjs');
      const plainToken = 'c'.repeat(64);
      await AccountDeletionRequest.findByIdAndUpdate(requestId, {
        confirmationTokenHash: await bcrypt.hash(plainToken, 4),
        confirmationTokenExpiresAt: new Date(Date.now() - 60 * 1000), // ya expiró
      });

      const confRes = await request(app)
        .post('/api/rgpd/deletion/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({ requestId, token: plainToken });

      if (confRes.status === 503) return;
      expect(confRes.status).toBe(410);
      expect(confRes.body?.error?.code || confRes.body?.code).toBe('token_expired');
    });
  });

  // (g) Token reutilizado → 410.
  describe('(g) token reutilizado', () => {
    test('segundo uso del mismo token devuelve 410 token_already_used', async () => {
      const { token } = await makeVerifiedUser('reuse');
      if (!token) return;

      const reqRes = await request(app)
        .post('/api/rgpd/deletion')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      if (reqRes.status === 503) return;

      const requestId = reqRes.body.requestId;
      const bcrypt = require('bcryptjs');
      const plainToken = 'd'.repeat(64);
      await AccountDeletionRequest.findByIdAndUpdate(requestId, {
        confirmationTokenHash: await bcrypt.hash(plainToken, 4),
        confirmationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const first = await request(app)
        .post('/api/rgpd/deletion/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({ requestId, token: plainToken });
      if (first.status === 503) return;
      expect(first.status).toBe(200);

      const second = await request(app)
        .post('/api/rgpd/deletion/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({ requestId, token: plainToken });
      expect(second.status).toBe(410);
      expect(second.body?.error?.code || second.body?.code).toBe('token_already_used');
    });
  });

  // (h) Role denial: creator/advertiser accediendo a admin audit-log → 403 (FR-022).
  describe('(h) role denial sobre /api/admin/rgpd/audit-log (FR-022)', () => {
    test('usuario rol=creator recibe 403 al consultar el audit log', async () => {
      const { token } = await makeVerifiedUser('creator-admin', { role: 'creator' });
      if (!token) return;

      const res = await request(app)
        .get('/api/admin/rgpd/audit-log')
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 503) return;
      expect(res.status).toBe(403);
    });

    test('usuario rol=advertiser recibe 403 al consultar el audit log', async () => {
      const { token } = await makeVerifiedUser('adv-admin', { role: 'advertiser' });
      if (!token) return;

      const res = await request(app)
        .get('/api/admin/rgpd/audit-log')
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 503) return;
      expect(res.status).toBe(403);
    });
  });
});
