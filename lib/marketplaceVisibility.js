/**
 * Compute which channels should be hidden from public marketplace listings
 * because their owning creator is over the plan's maxChannels cap.
 *
 * Logic:
 *   - Each creator's allowance comes from getLimit(user, 'maxChannels').
 *   - We keep their OLDEST N channels visible (createdAt ascending) and
 *     hide everything beyond that. The order is deterministic so a creator
 *     who downgrades to Free has stable expectations — their first two
 *     channels stay live.
 *   - Pro / Enterprise creators (limit = Infinity) never contribute to the
 *     hidden set, so the result is always small in practice.
 *
 * Returns: Array<ObjectId> of hidden channel ids, suitable for $nin.
 *
 * Cost: one aggregation over the Canal collection plus a small Usuario
 * find. For a healthy DB (few thousand creators) this is sub-100ms; cache
 * upstream if it ever becomes hot.
 */

const Canal = require('../models/Canal');
const Usuario = require('../models/Usuario');
const { getLimit } = require('./plans');

async function getHiddenChannelIds() {
  // First pass: find all creators that own >1 channel — only they CAN have
  // excess channels. (A creator with 1 channel can never exceed maxChannels=2.)
  const grouped = await Canal.aggregate([
    { $match: { estado: { $in: ['activo', 'verificado'] }, propietario: { $ne: null } } },
    { $sort: { propietario: 1, createdAt: 1 } },
    {
      $group: {
        _id: '$propietario',
        channels: { $push: { _id: '$_id', createdAt: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (grouped.length === 0) return [];

  // Pull plan data for each candidate owner in one go.
  const ownerIds = grouped.map(g => g._id);
  const owners = await Usuario
    .find({ _id: { $in: ownerIds }, rol: 'creator' })
    .select('rol subscription')
    .lean();
  const ownerMap = new Map(owners.map(u => [String(u._id), u]));

  const hidden = [];
  for (const g of grouped) {
    const owner = ownerMap.get(String(g._id));
    if (!owner) continue;
    const limit = getLimit(owner, 'maxChannels');
    if (limit === Infinity || g.count <= limit) continue;
    // Hide everything beyond the first `limit` channels (oldest-first).
    for (let i = limit; i < g.channels.length; i++) {
      hidden.push(g.channels[i]._id);
    }
  }
  return hidden;
}

module.exports = { getHiddenChannelIds };
