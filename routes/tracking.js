const express = require('express');
const { autenticar } = require('../middleware/auth');
const c = require('../controllers/trackingController');

const router = express.Router();

// Authenticated endpoints
router.post('/links', autenticar, c.createLink);
router.post('/verify-link', autenticar, c.createVerificationLink);
router.post('/convert', autenticar, c.convertUrlForCampaign);
router.get('/links', autenticar, c.getMyLinks);
router.get('/links/:id/analytics', autenticar, c.getLinkAnalytics);
router.get('/verify-status/:channelId', autenticar, c.checkVerificationStatus);

module.exports = router;
