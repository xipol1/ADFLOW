/**
 * DELETE /api/admin/delete-user
 *
 * Delete a user by email — for test/QA cleanup.
 * Body: { "email": "test@example.com" }
 * Protected by CRON_SECRET (Authorization: Bearer <secret>).
 */
const database = require('../../config/database');
const Usuario = require('../../models/Usuario');

module.exports = async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const email = (req.body?.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ success: false, message: 'email required in body' });
  }

  try {
    if (!database.estaConectado()) await database.conectar();
    const result = await Usuario.deleteOne({ email });
    return res.json({ success: true, deleted: result.deletedCount, email });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'failed' });
  }
};
