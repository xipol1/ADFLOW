const express = require('express');
const router = express.Router();
const channelListController = require('../controllers/channelListController');
const { autenticar, autorizarRoles } = require('../middleware/auth');

/**
 * @route   POST /api/lists
 * @desc    Create a new channel list
 * @access  Private (Advertiser only)
 */
router.post('/',
  autenticar,
  autorizarRoles('advertiser'),
  channelListController.createList
);

/**
 * @route   GET /api/lists
 * @desc    Get all user channel lists
 * @access  Private (Advertiser only)
 */
router.get('/',
  autenticar,
  autorizarRoles('advertiser'),
  channelListController.getLists
);

/**
 * @route   POST /api/lists/:id/add-channel
 * @desc    Add a channel to a list
 * @access  Private (Advertiser only)
 */
router.post('/:id/add-channel',
  autenticar,
  autorizarRoles('advertiser'),
  channelListController.addChannel
);

/**
 * @route   DELETE /api/lists/:id/remove-channel/:channelId
 * @desc    Remove a channel from a list
 * @access  Private (Advertiser only)
 */
router.delete('/:id/remove-channel/:channelId',
  autenticar,
  autorizarRoles('advertiser'),
  channelListController.removeChannel
);

module.exports = router;
