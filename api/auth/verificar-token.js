const { verificarToken } = require('../../controllers/authController')

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  return verificarToken(req, res)
}
