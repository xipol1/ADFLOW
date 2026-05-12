/**
 * Soft-gate logic test for the marketplace visibility helper.
 *
 * We mock the two collections it touches (Canal aggregation + Usuario find)
 * so the test doesn't need a live DB. The point is to verify the algorithm:
 *   - owner with 3 channels on Free → 1 channel hidden (the third, by createdAt)
 *   - owner with 3 channels on Pro  → nothing hidden
 *   - mixed populations resolve independently
 */

jest.mock('../models/Canal', () => ({
  aggregate: jest.fn(),
}));
jest.mock('../models/Usuario', () => ({
  find: jest.fn(),
}));

const Canal = require('../models/Canal');
const Usuario = require('../models/Usuario');
const { getHiddenChannelIds } = require('../lib/marketplaceVisibility');

function makeChannels(ownerId, count) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({ _id: `${ownerId}-c${i}`, createdAt: new Date(2026, 0, i + 1) });
  }
  return { _id: ownerId, channels: arr, count };
}

describe('getHiddenChannelIds', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('returns [] when nobody owns >1 channel', async () => {
    Canal.aggregate.mockResolvedValue([]);
    const hidden = await getHiddenChannelIds();
    expect(hidden).toEqual([]);
    expect(Usuario.find).not.toHaveBeenCalled();
  });

  test('hides excess channels for a Free creator with 3 channels', async () => {
    Canal.aggregate.mockResolvedValue([makeChannels('u1', 3)]);
    Usuario.find.mockReturnValue({
      select: () => ({
        lean: async () => [{ _id: 'u1', rol: 'creator' /* no subscription → free */ }],
      }),
    });
    const hidden = await getHiddenChannelIds();
    // Plan free → maxChannels=2 → channels c2 (index 2+) hidden.
    expect(hidden).toEqual(['u1-c2']);
  });

  test('Pro creator with 3 channels hides nothing', async () => {
    Canal.aggregate.mockResolvedValue([makeChannels('u2', 3)]);
    Usuario.find.mockReturnValue({
      select: () => ({
        lean: async () => [{
          _id: 'u2',
          rol: 'creator',
          subscription: { plan: 'creator_pro', status: 'active' },
        }],
      }),
    });
    const hidden = await getHiddenChannelIds();
    expect(hidden).toEqual([]);
  });

  test('mixed population: Free hides, Pro untouched', async () => {
    Canal.aggregate.mockResolvedValue([
      makeChannels('uFree', 5),
      makeChannels('uPro', 10),
    ]);
    Usuario.find.mockReturnValue({
      select: () => ({
        lean: async () => [
          { _id: 'uFree', rol: 'creator' },
          { _id: 'uPro', rol: 'creator', subscription: { plan: 'creator_pro', status: 'granted' } },
        ],
      }),
    });
    const hidden = await getHiddenChannelIds();
    // Free hides indexes 2,3,4 → c2, c3, c4
    expect(hidden).toEqual(['uFree-c2', 'uFree-c3', 'uFree-c4']);
  });
});
