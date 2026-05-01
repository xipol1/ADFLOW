const express = require('express');
const { autenticar } = require('../middleware/auth');
const inboxController = require('../controllers/inboxController');

const router = express.Router();

/**
 * @route   GET /api/inbox
 * @desc    Aggregate everything that needs the user's attention
 *          (pending payments, releases, disputes, unread notifications)
 * @access  Privado
 */
router.get('/', autenticar, inboxController.getInbox);

/**
 * @route   GET /api/inbox/count
 * @desc    Lightweight badge count for the header bell
 * @access  Privado
 */
router.get('/count', autenticar, inboxController.getInboxCount);

module.exports = router;
