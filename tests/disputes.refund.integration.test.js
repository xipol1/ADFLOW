/**
 * Integration — dispute resolution moves REAL money (audit 2026-06-10, S2).
 *
 * resolveDispute used to create a Transaccion tipo:'reembolso' status:'paid'
 * WITHOUT ever calling Stripe: the advertiser saw "reembolsado" in the UI and
 * the money never went back to the card. These tests pin the fixed contract:
 *
 *   1. favor_advertiser + PI succeeded      → stripe.refunds.create (full)
 *   2. favor_advertiser + requires_capture  → stripe.paymentIntents.cancel
 *      (refunds.create FAILS on an uncaptured PI — dispute resolved before
 *      the 15-day settlement is the common case)
 *   3. partial + PI succeeded               → partial refund (pct of captured)
 *   4. partial + requires_capture           → partial CAPTURE of the kept
 *      share; Stripe auto-releases the refunded remainder
 *   5. Stripe failure                       → 502, NO Transaccion, dispute and
 *      campaign untouched (no accounting that lies), retry works
 *   6. credits-only campaign (no PI)        → no Stripe call, credits restored
 *      to the advertiser's wallet
 *   7. mixed card+credits                   → card share via Stripe, credit
 *      share via wallet
 *
 * Refund base is campaign.capturedAmount (real EUR charged), NOT
 * campaign.price — with promo credits only the captured part ever reached
 * Stripe. tests/e2e-dispute-flow.integration.test.js keeps covering the
 * legacy/simulated path (no PI, capturedAmount null → falls back to price).
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

// Controllable Stripe stub — the controllers call require('stripe')(key)
// lazily per request, so every call lands on this shared object.
const mockStripe = {
  paymentIntents: {
    retrieve: jest.fn(),
    cancel: jest.fn(async (id) => ({ id, status: 'canceled' })),
    capture: jest.fn(async (id) => ({ id, status: 'succeeded' })),
  },
  refunds: {
    create: jest.fn(async ({ payment_intent: pi }) => ({ id: `re_${pi}`, status: 'succeeded' })),
  },
};
jest.mock('stripe', () => jest.fn(() => mockStripe));

const request = require('supertest');
const app = require('../app');
const { registerVerifiedUser } = require('./helpers/registerVerifiedUser');

// status returned by paymentIntents.retrieve, keyed by PI id
const piStatus = {};
mockStripe.paymentIntents.retrieve.mockImplementation(async (id) => ({ id, status: piStatus[id] || 'succeeded' }));

describe('Disputes · real Stripe refunds', () => {
  const uniqueId = Date.now();
  const password = 'TestPass123';

  let advertiserToken, advertiserId;
  let creatorToken;
  let adminToken;
  let channelId;

  const Campaign = require('../models/Campaign');
  const Transaccion = require('../models/Transaccion');
  const Usuario = require('../models/Usuario');

  // Create a campaign via API, then force the paid state directly in the DB
  // (status, capturedAmount, stripePaymentIntentId) so each case controls the
  // exact money topology without driving the whole Stripe payment flow.
  const createPaidCampaign = async ({ price, capturedAmount, piId = null, piState = null }) => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        channel: channelId,
        content: `Refund test ad ${Math.random().toString(36).slice(2, 8)}`,
        targetUrl: 'https://example.com/landing',
        price,
      });
    expect(res.status).toBe(201);
    const id = (res.body.data || res.body.campaign)?._id;
    await Campaign.findByIdAndUpdate(id, {
      status: 'PAID',
      price,
      capturedAmount,
      stripePaymentIntentId: piId,
    });
    if (piId && piState) piStatus[piId] = piState;
    return id;
  };

  const openDispute = async (campaignId) => {
    const res = await request(app)
      .post('/api/disputes')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        campaignId,
        reason: 'not_published',
        description: 'El canal no publicó el anuncio en el plazo acordado',
      });
    expect(res.status).toBe(201);
    return res.body.data._id;
  };

  const resolve = (disputeId, body) =>
    request(app)
      .post(`/api/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resolution: 'Resolución de test', ...body });

  beforeEach(() => {
    mockStripe.paymentIntents.retrieve.mockClear();
    mockStripe.paymentIntents.cancel.mockClear();
    mockStripe.paymentIntents.capture.mockClear();
    mockStripe.refunds.create.mockClear();
  });

  beforeAll(async () => {
    const adv = await registerVerifiedUser(app, {
      email: `dsp-refund-adv-${uniqueId}@test.com`, password, nombre: 'Refund Advertiser', role: 'advertiser',
    });
    advertiserToken = adv.token;
    advertiserId = adv.user?.id || adv.user?._id;

    const cre = await registerVerifiedUser(app, {
      email: `dsp-refund-cre-${uniqueId}@test.com`, password, nombre: 'Refund Creator', role: 'creator',
    });
    creatorToken = cre.token;

    // Admin: register then promote + re-login so the JWT carries rol='admin'.
    const admEmail = `dsp-refund-adm-${uniqueId}@test.com`;
    const adm = await registerVerifiedUser(app, {
      email: admEmail, password, nombre: 'Refund Admin', role: 'advertiser',
    });
    await Usuario.findByIdAndUpdate(adm.user?.id || adm.user?._id, { rol: 'admin' });
    const reLogin = await request(app).post('/api/auth/login').send({ email: admEmail, password });
    adminToken = reLogin.body.token;

    const chanRes = await request(app)
      .post('/api/canales')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        plataforma: 'telegram',
        identificadorCanal: `@dsp-refund-${uniqueId}`,
        nombreCanal: 'Refund Channel',
        categoria: 'crypto',
      });
    expect(chanRes.status).toBe(201);
    const data = chanRes.body.data || chanRes.body.canal;
    channelId = data?._id || data?.id;
    // createCampaign derives the server-side price from the channel and
    // rejects channels without one — the test then overwrites price in DB.
    const Canal = require('../models/Canal');
    await Canal.findByIdAndUpdate(channelId, { precio: 100 });
  });

  // ── 1. favor_advertiser, PI already captured ──────────────────────────────
  test('favor_advertiser + PI succeeded → full stripe refund persisted', async () => {
    const piId = `pi_full_${uniqueId}`;
    const campaignId = await createPaidCampaign({ price: 100, capturedAmount: 100, piId, piState: 'succeeded' });
    const disputeId = await openDispute(campaignId);

    const res = await resolve(disputeId, { resolutionType: 'favor_advertiser' });
    expect(res.status).toBe(200);
    expect(res.body.data.refundAmount).toBe(100);

    expect(mockStripe.refunds.create).toHaveBeenCalledTimes(1);
    expect(mockStripe.refunds.create).toHaveBeenCalledWith(
      { payment_intent: piId, amount: 10000 },
      { idempotencyKey: `refund-dispute:${disputeId}` }
    );
    expect(mockStripe.paymentIntents.cancel).not.toHaveBeenCalled();

    const refundTx = await Transaccion.findOne({ campaign: campaignId, tipo: 'reembolso' }).lean();
    expect(refundTx).toBeTruthy();
    expect(refundTx.amount).toBe(100);
    expect(refundTx.status).toBe('paid');
    expect(refundTx.stripeRefundId).toBe(`re_${piId}`);

    const c = await Campaign.findById(campaignId).lean();
    expect(c.status).toBe('CANCELLED');
  });

  // ── 2. favor_advertiser, dispute resolved before settlement ──────────────
  test('favor_advertiser + PI requires_capture → cancel (refund on uncaptured PI would fail)', async () => {
    const piId = `pi_uncap_${uniqueId}`;
    const campaignId = await createPaidCampaign({ price: 200, capturedAmount: 200, piId, piState: 'requires_capture' });
    const disputeId = await openDispute(campaignId);

    const res = await resolve(disputeId, { resolutionType: 'favor_advertiser' });
    expect(res.status).toBe(200);
    expect(res.body.data.refundAmount).toBe(200);

    expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledTimes(1);
    expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith(
      piId,
      { idempotencyKey: `cancel-dispute:${disputeId}` }
    );
    expect(mockStripe.refunds.create).not.toHaveBeenCalled();
    expect(mockStripe.paymentIntents.capture).not.toHaveBeenCalled();

    const refundTx = await Transaccion.findOne({ campaign: campaignId, tipo: 'reembolso' }).lean();
    expect(refundTx.amount).toBe(200);
    expect(refundTx.stripeRefundId).toBeNull(); // released, not refunded — no re_ object exists
  });

  // ── 3. partial 40%, PI captured ───────────────────────────────────────────
  test('partial 40% + PI succeeded → partial stripe refund over capturedAmount', async () => {
    const piId = `pi_partial_${uniqueId}`;
    const campaignId = await createPaidCampaign({ price: 150, capturedAmount: 150, piId, piState: 'succeeded' });
    const disputeId = await openDispute(campaignId);

    const res = await resolve(disputeId, { resolutionType: 'partial', refundPercent: 40 });
    expect(res.status).toBe(200);
    expect(res.body.data.refundAmount).toBe(60); // 150 * 0.4

    expect(mockStripe.refunds.create).toHaveBeenCalledWith(
      { payment_intent: piId, amount: 6000 },
      { idempotencyKey: `refund-dispute:${disputeId}:40` }
    );

    const c = await Campaign.findById(campaignId).lean();
    expect(c.status).toBe('COMPLETED');
    // creator keeps only 60% of their payable — the refunded 40% must not be
    // withdrawable on top of going back to the advertiser
    const { resolveCreatorPayable } = require('../lib/creatorPayout');
    const fullPayable = resolveCreatorPayable({ ...c, creatorPayable: null });
    expect(c.creatorPayable).toBeCloseTo(+(fullPayable * 0.6).toFixed(2), 2);
  });

  // ── 4. partial 40%, dispute resolved before settlement ───────────────────
  test('partial 40% + requires_capture → partial capture of the kept 60%', async () => {
    const piId = `pi_pcap_${uniqueId}`;
    const campaignId = await createPaidCampaign({ price: 150, capturedAmount: 150, piId, piState: 'requires_capture' });
    const disputeId = await openDispute(campaignId);

    const res = await resolve(disputeId, { resolutionType: 'partial', refundPercent: 40 });
    expect(res.status).toBe(200);
    expect(res.body.data.refundAmount).toBe(60);

    expect(mockStripe.paymentIntents.capture).toHaveBeenCalledTimes(1);
    expect(mockStripe.paymentIntents.capture).toHaveBeenCalledWith(
      piId,
      { amount_to_capture: 9000 }, // 150 - 60 = 90 kept; Stripe releases the rest
      { idempotencyKey: `capture-dispute:${disputeId}:40` }
    );
    expect(mockStripe.refunds.create).not.toHaveBeenCalled();
    expect(mockStripe.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  // ── 5. Stripe failure → honest 502, nothing persisted ────────────────────
  test('stripe error → 502, NO refund Transaccion, dispute/campaign untouched, retry works', async () => {
    const piId = `pi_fail_${uniqueId}`;
    const campaignId = await createPaidCampaign({ price: 100, capturedAmount: 100, piId, piState: 'succeeded' });
    const disputeId = await openDispute(campaignId);

    mockStripe.refunds.create.mockRejectedValueOnce(new Error('Your card was declined upstream'));

    const res = await resolve(disputeId, { resolutionType: 'favor_advertiser' });
    expect(res.status).toBe(502);

    const refundTx = await Transaccion.findOne({ campaign: campaignId, tipo: 'reembolso' }).lean();
    expect(refundTx).toBeNull();

    const Dispute = require('../models/Dispute');
    const d = await Dispute.findById(disputeId).lean();
    expect(d.status).toBe('open'); // not resolved — accounting never lies
    expect(d.resolvedAt).toBeFalsy();

    const c = await Campaign.findById(campaignId).lean();
    expect(c.status).toBe('DISPUTED'); // not CANCELLED

    // Stripe back up → the same resolution goes through
    const retry = await resolve(disputeId, { resolutionType: 'favor_advertiser' });
    expect(retry.status).toBe(200);
    const txAfter = await Transaccion.findOne({ campaign: campaignId, tipo: 'reembolso' }).lean();
    expect(txAfter.amount).toBe(100);
  });

  // ── 6. credits-only campaign: nothing to do on Stripe ─────────────────────
  test('100% credits campaign (no PI) → no Stripe call, wallet credits restored', async () => {
    const campaignId = await createPaidCampaign({ price: 50, capturedAmount: 0, piId: null });
    const disputeId = await openDispute(campaignId);

    const before = await Usuario.findById(advertiserId).select('campaignCreditsBalance').lean();

    const res = await resolve(disputeId, { resolutionType: 'favor_advertiser' });
    expect(res.status).toBe(200);
    expect(res.body.data.refundAmount).toBe(50);

    expect(mockStripe.paymentIntents.retrieve).not.toHaveBeenCalled();
    expect(mockStripe.refunds.create).not.toHaveBeenCalled();
    expect(mockStripe.paymentIntents.cancel).not.toHaveBeenCalled();

    const after = await Usuario.findById(advertiserId).select('campaignCreditsBalance').lean();
    expect(+(after.campaignCreditsBalance - before.campaignCreditsBalance).toFixed(2)).toBe(50);

    const refundTx = await Transaccion.findOne({ campaign: campaignId, tipo: 'reembolso' }).lean();
    expect(refundTx.amount).toBe(50);
    expect(refundTx.stripeRefundId).toBeNull();
  });

  // ── 7. mixed card + credits ───────────────────────────────────────────────
  test('mixed payment (70 card + 30 credits) → card share via Stripe, credit share to wallet', async () => {
    const piId = `pi_mixed_${uniqueId}`;
    const campaignId = await createPaidCampaign({ price: 100, capturedAmount: 70, piId, piState: 'succeeded' });
    const disputeId = await openDispute(campaignId);

    const before = await Usuario.findById(advertiserId).select('campaignCreditsBalance').lean();

    const res = await resolve(disputeId, { resolutionType: 'favor_advertiser' });
    expect(res.status).toBe(200);
    expect(res.body.data.refundAmount).toBe(100); // 70 card + 30 credits

    // Only the captured 70 EUR travels through Stripe
    expect(mockStripe.refunds.create).toHaveBeenCalledWith(
      { payment_intent: piId, amount: 7000 },
      { idempotencyKey: `refund-dispute:${disputeId}` }
    );

    const after = await Usuario.findById(advertiserId).select('campaignCreditsBalance').lean();
    expect(+(after.campaignCreditsBalance - before.campaignCreditsBalance).toFixed(2)).toBe(30);
  });
});
