module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ success: false, message: 'CRON_SECRET not configured' });
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    const { ensureDb } = require('../../../lib/ensureDb');
    const dbOk = await ensureDb();
    if (!dbOk) return res.status(503).json({ success: false, message: 'DB unavailable' });
    const JobLog = require('../../../models/JobLog');
    const jobId = req.query.jobId;
    const log = await JobLog.findOne({ jobId }).lean();
    if (!log) return res.status(404).json({ success: false, message: 'Job not found' });
    return res.json({ success: true, data: log });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
