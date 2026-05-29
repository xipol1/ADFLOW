/**
 * E2E — Dispute flow (advertiser ↔ creator + admin arbitration).
 *
 * Disputes guard real money. An advertiser has already paid the campaign
 * (escrow / PAID state) and now wants either a refund (favor_advertiser)
 * or the creator wants the funds released (favor_creator). Admin is the
 * arbitrator with the only role allowed to call /resolve.
 *
 * The flow we walk:
 *   1. Setup: advertiser, creator+channel, admin, 3 paid campaigns
 *   2. Open dispute → Campaign auto-flips to DISPUTED
 *   3. Messaging (both parties) + auth guards
 *   4. Escalate → status='under_review'
 *   5. Resolve favor_advertiser → Campaign CANCELLED + refund tx
 *   6. Resolve favor_creator (separate dispute) → Campaign COMPLETED
 *   7. Resolve partial (separate dispute) → partial refund tx
 *   8. Post-resolution invariants — closed disputes reject new messages
 *
 * Anti-regression layered in: every controller branch with money side-
 * effects is asserted both via API response AND DB state.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');
const { registerVerifiedUser } = require('./helpers/registerVerifiedUser');

describe('E2E · Dispute flow', () => {
  const uniqueId = Date.now();
  const advertiserEmail = `e2e-dsp-adv-${uniqueId}@test.com`;
  const creatorEmail = `e2e-dsp-cre-${uniqueId}@test.com`;
  const adminEmail = `e2e-dsp-adm-${uniqueId}@test.com`;
  const outsiderEmail = `e2e-dsp-out-${uniqueId}@test.com`;
  const password = 'TestPass123';

  let advertiserToken, advertiserId;
  let creatorToken, creatorId;
  let adminToken, adminId;
  let outsiderToken;
  let channelId;

  // We open three separate disputes so each resolution path can be tested
  // end-to-end (the controller refuses a second open dispute per campaign).
  let campaignA, campaignB, campaignC;
  let disputeFavorAdv, disputeFavorCre, disputePartial;

  // Helper to wire a paid campaign on the target channel.
  const createPaidCampaign = async (price = 100) => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        channel: channelId,
        content: `Test ad content ${Math.random().toString(36).slice(2, 8)}`,
        targetUrl: 'https://example.com/landing',
        price,
      });
    if (res.status !== 201) return null;
    const id = (res.body.data || res.body.campaign)?._id;
    // Skip the simulated /pay step by patching DB directly — keeps the test
    // focused on the dispute flow and the price field matches what
    // resolveDispute reads to compute refundAmount.
    const Campaign = require('../models/Campaign');
    await Campaign.findByIdAndUpdate(id, { status: 'PAID', price });
    return id;
  };

  beforeAll(async () => {
    const adv = await registerVerifiedUser(app, {
      email: advertiserEmail, password, nombre: 'Test Advertiser', role: 'advertiser',
    });
    advertiserToken = adv.token;
    advertiserId = adv.user?.id || adv.user?._id;

    const cre = await registerVerifiedUser(app, {
      email: creatorEmail, password, nombre: 'Test Creator', role: 'creator',
    });
    creatorToken = cre.token;
    creatorId = cre.user?.id || cre.user?._id;

    // Admin: register as advertiser then promote in DB and re-login so the
    // JWT carries rol='admin'. The registerVerifiedUser helper supports
    // re-login implicitly because login reads the fresh user doc.
    const adm = await registerVerifiedUser(app, {
      email: adminEmail, password, nombre: 'Test Admin', role: 'advertiser',
    });
    adminId = adm.user?.id || adm.user?._id;
    const Usuario = require('../models/Usuario');
    await Usuario.findByIdAndUpdate(adminId, { rol: 'admin' });
    // Re-login so the new JWT reflects rol='admin'.
    const reLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password });
    adminToken = reLogin.body.token;

    // Outsider: another creator with no involvement in any campaign.
    const out = await registerVerifiedUser(app, {
      email: outsiderEmail, password, nombre: 'Test Outsider', role: 'creator',
    });
    outsiderToken = out.token;

    // Channel + 3 paid campaigns
    const chanRes = await request(app)
      .post('/api/canales')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        plataforma: 'telegram',
        identificadorCanal: `@e2e-dsp-${uniqueId}`,
        nombreCanal: 'Dispute Channel',
        categoria: 'crypto',
      });
    if (chanRes.status === 201) {
      const data = chanRes.body.data || chanRes.body.canal;
      channelId = data?._id || data?.id;
      const Canal = require('../models/Canal');
      await Canal.findByIdAndUpdate(channelId, { precio: 100 });
    }

    campaignA = await createPaidCampaign(100);
    campaignB = await createPaidCampaign(200);
    campaignC = await createPaidCampaign(150);
  });

  // ─── Stage 1: setup invariants ──────────────────────────────────────────
  describe('Stage 1: Setup invariants', () => {
    test('all 3 campaigns created and PAID', async () => {
      const Campaign = require('../models/Campaign');
      for (const id of [campaignA, campaignB, campaignC]) {
        expect(id).toBeTruthy();
        const c = await Campaign.findById(id).lean();
        expect(c.status).toBe('PAID');
        expect(c.price).toBeGreaterThan(0);
      }
    });

    test('admin user has rol=admin in DB', async () => {
      const Usuario = require('../models/Usuario');
      const u = await Usuario.findById(adminId).lean();
      expect(u.rol).toBe('admin');
    });
  });

  // ─── Stage 2: open dispute ──────────────────────────────────────────────
  describe('Stage 2: Open dispute (favor_advertiser path)', () => {
    test('advertiser opens dispute → 201, campaign auto-flips DISPUTED', async () => {
      const res = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          campaignId: campaignA,
          reason: 'not_published',
          description: 'El canal no publicó el anuncio en el plazo acordado',
        });
      expect(res.status).toBe(201);
      const data = res.body.data;
      disputeFavorAdv = data?._id;
      expect(disputeFavorAdv).toBeTruthy();
      expect(data.status).toBe('open');
      expect(String(data.openedBy)).toBe(String(advertiserId));
      expect(String(data.againstUser)).toBe(String(creatorId));

      // Campaign side-effect: status → DISPUTED
      const Campaign = require('../models/Campaign');
      const c = await Campaign.findById(campaignA).lean();
      expect(c.status).toBe('DISPUTED');
    });

    test('outsider cannot open dispute on others campaign (403)', async () => {
      const res = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          campaignId: campaignB,
          reason: 'fraud',
          description: 'No relación con esta campaña pero quiero molestar',
        });
      expect(res.status).toBe(403);
    });

    test('cannot open second dispute on the same campaign (400)', async () => {
      const res = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          campaignId: campaignA,
          reason: 'other',
          description: 'Counter-dispute',
        });
      expect(res.status).toBe(400);
    });
  });

  // ─── Stage 3: messaging ─────────────────────────────────────────────────
  describe('Stage 3: Messaging between participants', () => {
    test('creator (the againstUser) can add a message', async () => {
      const res = await request(app)
        .post(`/api/disputes/${disputeFavorAdv}/message`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ text: 'El anuncio sí se publicó, adjunto screenshot.' });
      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(Array.isArray(data.messages)).toBe(true);
      expect(data.messages.length).toBeGreaterThanOrEqual(2);
    });

    test('outsider cannot add a message (403)', async () => {
      const res = await request(app)
        .post(`/api/disputes/${disputeFavorAdv}/message`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ text: 'Yo paso por aquí' });
      expect(res.status).toBe(403);
    });

    test('admin can read any dispute even if not participant', async () => {
      const res = await request(app)
        .get(`/api/disputes/${disputeFavorAdv}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data?._id).toBeTruthy();
    });

    test('GET /api/disputes lists only own disputes for participants', async () => {
      const res = await request(app)
        .get('/api/disputes')
        .set('Authorization', `Bearer ${advertiserToken}`);
      expect(res.status).toBe(200);
      const items = res.body.data?.items || [];
      const found = items.some(d => String(d._id) === String(disputeFavorAdv));
      expect(found).toBe(true);
    });

    test('outsider sees empty list in GET /api/disputes', async () => {
      const res = await request(app)
        .get('/api/disputes')
        .set('Authorization', `Bearer ${outsiderToken}`);
      expect(res.status).toBe(200);
      const items = res.body.data?.items || [];
      const found = items.some(d => String(d._id) === String(disputeFavorAdv));
      expect(found).toBe(false);
    });
  });

  // ─── Stage 4: escalation ────────────────────────────────────────────────
  describe('Stage 4: Escalate dispute', () => {
    test('participant escalates → status under_review + escalatedAt set', async () => {
      const res = await request(app)
        .post(`/api/disputes/${disputeFavorAdv}/escalate`)
        .set('Authorization', `Bearer ${advertiserToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data?.status).toBe('under_review');
      expect(res.body.data?.escalatedAt).toBeTruthy();
    });

    test('cannot re-escalate (status no longer open)', async () => {
      const res = await request(app)
        .post(`/api/disputes/${disputeFavorAdv}/escalate`)
        .set('Authorization', `Bearer ${advertiserToken}`);
      expect(res.status).toBe(400);
    });

    test('non-admin cannot resolve (P0 role guard)', async () => {
      const res = await request(app)
        .post(`/api/disputes/${disputeFavorAdv}/resolve`)
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          resolution: 'Trying to self-resolve',
          resolutionType: 'favor_advertiser',
        });
      expect(res.status).toBe(403);
    });
  });

  // ─── Stage 5: admin resolves favor_advertiser ───────────────────────────
  describe('Stage 5: Admin resolves favor_advertiser → refund', () => {
    test('admin resolves → 200, dispute.resolved_advertiser', async () => {
      const res = await request(app)
        .post(`/api/disputes/${disputeFavorAdv}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution: 'El creador no publicó dentro del plazo acordado',
          resolutionType: 'favor_advertiser',
          adminNotes: 'Verificado timestamp del canal',
        });
      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.status).toBe('resolved_advertiser');
      expect(data.resolutionType).toBe('favor_advertiser');
      expect(data.refundAmount).toBe(100); // full price refund
      expect(String(data.resolvedBy)).toBe(String(adminId));
    });

    test('DB: campaign auto-flipped to CANCELLED', async () => {
      const Campaign = require('../models/Campaign');
      const c = await Campaign.findById(campaignA).lean();
      expect(c.status).toBe('CANCELLED');
      expect(c.cancelledAt).toBeTruthy();
    });

    test('DB: refund Transaccion (tipo=reembolso, status=paid) created', async () => {
      const Transaccion = require('../models/Transaccion');
      const refund = await Transaccion.findOne({
        campaign: campaignA,
        tipo: 'reembolso',
      }).lean();
      expect(refund).toBeTruthy();
      expect(refund.amount).toBe(100);
      expect(refund.status).toBe('paid');
      expect(String(refund.advertiser)).toBe(String(advertiserId));
    });

    test('post-resolution: new messages are rejected (dispute closed)', async () => {
      const res = await request(app)
        .post(`/api/disputes/${disputeFavorAdv}/message`)
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({ text: 'Adding after resolved' });
      expect(res.status).toBe(400);
    });

    test('post-resolution: re-resolve is rejected', async () => {
      const res = await request(app)
        .post(`/api/disputes/${disputeFavorAdv}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolution: 'Trying again', resolutionType: 'closed_no_action' });
      expect(res.status).toBe(400);
    });
  });

  // ─── Stage 6: favor_creator path ────────────────────────────────────────
  describe('Stage 6: Admin resolves favor_creator → COMPLETED', () => {
    test('creator opens dispute on campaignB (advertiser delayed payment claim)', async () => {
      const res = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          campaignId: campaignB,
          reason: 'other',
          description: 'El anunciante no entregó el material a publicar',
        });
      expect(res.status).toBe(201);
      disputeFavorCre = res.body.data?._id;
      expect(disputeFavorCre).toBeTruthy();
    });

    test('admin resolves → COMPLETED + no refund', async () => {
      const res = await request(app)
        .post(`/api/disputes/${disputeFavorCre}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution: 'Anuncio publicado correctamente',
          resolutionType: 'favor_creator',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('resolved_creator');
      expect(res.body.data.refundAmount).toBe(0);
    });

    test('DB: campaign flipped to COMPLETED', async () => {
      const Campaign = require('../models/Campaign');
      const c = await Campaign.findById(campaignB).lean();
      expect(c.status).toBe('COMPLETED');
      expect(c.completedAt).toBeTruthy();
    });

    test('DB: no refund Transaccion created for favor_creator', async () => {
      const Transaccion = require('../models/Transaccion');
      const refund = await Transaccion.findOne({
        campaign: campaignB,
        tipo: 'reembolso',
      }).lean();
      expect(refund).toBeNull();
    });
  });

  // ─── Stage 7: partial resolution ────────────────────────────────────────
  describe('Stage 7: Admin resolves partial → partial refund', () => {
    test('advertiser opens dispute on campaignC', async () => {
      const res = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          campaignId: campaignC,
          reason: 'wrong_content',
          description: 'Contenido publicado distinto al pactado',
        });
      expect(res.status).toBe(201);
      disputePartial = res.body.data?._id;
    });

    test('admin resolves partial 40% → refund 60', async () => {
      const res = await request(app)
        .post(`/api/disputes/${disputePartial}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution: 'Cumplimiento parcial: anuncio publicado pero con errata',
          resolutionType: 'partial',
          refundPercent: 40,
        });
      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.resolutionType).toBe('partial');
      // 150 * 0.4 = 60
      expect(data.refundAmount).toBe(60);
    });

    test('DB: campaign COMPLETED + partial refund Transaccion', async () => {
      const Campaign = require('../models/Campaign');
      const Transaccion = require('../models/Transaccion');
      const c = await Campaign.findById(campaignC).lean();
      expect(c.status).toBe('COMPLETED');
      const refund = await Transaccion.findOne({
        campaign: campaignC,
        tipo: 'reembolso',
      }).lean();
      expect(refund).toBeTruthy();
      expect(refund.amount).toBe(60);
    });
  });

  // ─── Stage 8: validation guards ─────────────────────────────────────────
  describe('Stage 8: Validation guards', () => {
    test('open dispute with invalid reason → 400', async () => {
      const res = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          campaignId: campaignA,
          reason: 'NOT_A_REAL_REASON',
          description: 'Inválido',
        });
      expect(res.status).toBe(400);
    });

    test('resolve with invalid resolutionType → 400', async () => {
      const res = await request(app)
        .post(`/api/disputes/${disputeFavorAdv}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution: 'x',
          resolutionType: 'BOGUS_TYPE',
        });
      expect(res.status).toBe(400);
    });

    test('non-mongoId dispute id → 400', async () => {
      const res = await request(app)
        .get('/api/disputes/not-a-mongo-id')
        .set('Authorization', `Bearer ${advertiserToken}`);
      expect(res.status).toBe(400);
    });

    test('non-existent dispute id → 404', async () => {
      const res = await request(app)
        .get('/api/disputes/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${advertiserToken}`);
      expect(res.status).toBe(404);
    });

    test('routes reject unauthenticated requests (401)', async () => {
      const checks = await Promise.all([
        request(app).get('/api/disputes'),
        request(app).post('/api/disputes').send({}),
        request(app).post('/api/disputes/507f1f77bcf86cd799439099/message').send({ text: 'x' }),
      ]);
      checks.forEach(r => expect(r.status).toBe(401));
    });
  });
});
