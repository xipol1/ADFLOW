/**
 * Anti-regression guards for two more security fixes from the pre-launch audit:
 *
 *   A-1 open-redirect — tracking link creation (`createLink`) must reject any
 *       non-http(s) / invalid `targetUrl` (javascript:, data:, file:, garbage,
 *       empty). Links are 302-redirected to later, so an unvalidated scheme is a
 *       phishing / open-redirect vector.
 *   C-1 payment gate — `payCampaign` must refuse to flip a campaign to PAID via
 *       the simulated path when a real card charge is required (charge > 0) in
 *       production unless ALLOW_SIMULATED_PAYMENTS is explicitly set. Otherwise
 *       it is free escrow money for the advertiser.
 *
 * Pure unit tests (mocked models, no DB).
 */

jest.mock('../lib/ensureDb', () => ({ ensureDb: jest.fn(async () => true) }));
jest.mock('../models/Campaign');
jest.mock('../models/Usuario');

const trackingController = require('../controllers/trackingController');
const campaignController = require('../controllers/campaignController');
const Campaign = require('../models/Campaign');
const Usuario = require('../models/Usuario');

const nextMock = () => jest.fn();
const resMock = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('A-1 open-redirect — createLink rejects non-http(s) / invalid targetUrl', () => {
  test.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'not a url',
    '',
  ])('rejects %p with 400', async (bad) => {
    const next = nextMock();
    await trackingController.createLink({ usuario: { id: 'U1' }, body: { targetUrl: bad } }, resMock(), next);
    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].status).toBe(400);
  });
});

describe('C-1 payment gate — payCampaign blocks simulated payment when a real charge is required in prod', () => {
  const ORIG = { node: process.env.NODE_ENV, allow: process.env.ALLOW_SIMULATED_PAYMENTS };
  afterAll(() => {
    process.env.NODE_ENV = ORIG.node;
    if (ORIG.allow === undefined) delete process.env.ALLOW_SIMULATED_PAYMENTS;
    else process.env.ALLOW_SIMULATED_PAYMENTS = ORIG.allow;
  });

  test('402 when charge > 0, NODE_ENV=production, ALLOW_SIMULATED_PAYMENTS unset', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_SIMULATED_PAYMENTS;
    // price 100, zero credits -> prospectiveCharge 100 (> 0) -> must be blocked.
    Campaign.findById.mockResolvedValue({ _id: 'C1', advertiser: { toString: () => 'U1' }, status: 'DRAFT', price: 100 });
    Usuario.findById.mockResolvedValue({ campaignCreditsBalance: 0 });

    const next = nextMock();
    await campaignController.payCampaign({ usuario: { id: 'U1' }, params: { id: 'C1' } }, resMock(), next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].status).toBe(402);
  });
});
