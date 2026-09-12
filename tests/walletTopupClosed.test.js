/**
 * Guard: the wallet top-up door stays shut while main has no spendable balance.
 *
 * POST /api/transacciones/create-checkout-session opens a real Stripe Checkout
 * for "Recarga de saldo" and the webhook faithfully records a
 * Transaccion{tipo:'recarga', status:'paid'}. But nothing in main credits a
 * spendable balance: Usuario has no `saldo` field, and campaigns are paid by
 * card or from `campaignCreditsBalance`, neither of which a recarga feeds.
 * A top-up therefore charges the card and gives back nothing.
 *
 * The spendable wallet lives on feat/track-b-wallet and is not merged. Until it
 * is, this test fails loudly if someone reopens the endpoint by default.
 *
 * It also pins the two aggregation bugs that made the Finances page report
 * numbers that were not the advertiser's money.
 */

jest.mock('../lib/ensureDb', () => ({ ensureDb: jest.fn(async () => true) }));
jest.mock('../models/Transaccion');
jest.mock('../models/Retiro');
jest.mock('../models/Campaign');

const transaccionController = require('../controllers/transaccionController');
const Transaccion = require('../models/Transaccion');
const Usuario = require('../models/Usuario');

const nextMock = () => jest.fn();
const resMock = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('wallet top-up is closed while there is no spendable balance', () => {
  const OLD_ENV = process.env.WALLET_TOPUP_ENABLED;
  afterEach(() => {
    if (OLD_ENV === undefined) delete process.env.WALLET_TOPUP_ENABLED;
    else process.env.WALLET_TOPUP_ENABLED = OLD_ENV;
    jest.clearAllMocks();
  });

  test('returns 503 by default instead of opening a Stripe Checkout', async () => {
    delete process.env.WALLET_TOPUP_ENABLED;
    const next = nextMock();
    const res = resMock();

    await transaccionController.crearCheckoutSession(
      { usuario: { id: 'U1' }, body: { amount: 500 } }, res, next
    );

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].status).toBe(503);
    // Nothing was sent back that a client could redirect to and pay at.
    expect(res.json).not.toHaveBeenCalled();
  });

  test.each(['false', '', '1', 'yes', 'TRUE'])(
    'stays shut for WALLET_TOPUP_ENABLED=%p (only the exact string "true" opens it)',
    async (val) => {
      process.env.WALLET_TOPUP_ENABLED = val;
      const next = nextMock();
      await transaccionController.crearCheckoutSession(
        { usuario: { id: 'U1' }, body: { amount: 500 } }, resMock(), next
      );
      expect(next.mock.calls[0][0].status).toBe(503);
    }
  );

  test('Usuario still has no spendable `saldo` field — the reason the door is shut', () => {
    // If this ever fails, Track B (or an equivalent) has landed and the gate
    // above should be re-evaluated rather than silently left in place.
    expect(Usuario.schema.path('saldo')).toBeUndefined();
  });
});

describe('financial stats count only real campaign spend', () => {
  afterEach(() => jest.clearAllMocks());

  test('totalPagado excludes recarga / referral / retiro rows', async () => {
    Transaccion.countDocuments = jest.fn(async () => 0);
    Transaccion.aggregate = jest.fn(async () => [{ total: 120 }]);

    const res = resMock();
    await transaccionController.obtenerEstadisticasFinancieras(
      { usuario: { id: '507f1f77bcf86cd799439011' } }, res, nextMock()
    );

    const [pipeline] = Transaccion.aggregate.mock.calls[0];
    const match = pipeline[0].$match;
    expect(match.status).toBe('paid');
    // recarga = money in, referral = a credit granted, retiro = a creator
    // withdrawal. None of them is advertiser spend, yet all are status:'paid'.
    expect(match.tipo).toEqual({ $nin: ['recarga', 'referral', 'retiro'] });
  });
});
