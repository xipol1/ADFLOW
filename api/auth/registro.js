const { registro } = require('../../controllers/authController')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  return registro(req, res)
}
