// Vercel serverless entry point — wraps the full Express app
// All /api/* requests are routed here via vercel.json rewrites
module.exports = require('../app');
