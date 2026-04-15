const { verificarEmail } = require('../../../controllers/authController')

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  // Vercel dynamic routes pass the segment via req.query; the controller reads req.params.token
  if (!req.params) req.params = {}
  req.params.token = req.query.token
  return verificarEmail(req, res)
}
