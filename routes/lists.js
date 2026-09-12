/**
 * Consolidated `/api/lists` routes — public + user-owned.
 *
 * Closes AUDIT.md M-10: previously this lived in two files (`routes/lists.js`
 * for the public catalog and `routes/userLists.js` for personal favorites)
 * both mounted under `/api/lists/*`, which made the URL space confusing.
 *
 * Layout:
 *   GET    /api/lists/public/channels      → public catalog of channels in lists
 *   GET    /api/lists/                     → current user's lists
 *   POST   /api/lists/                     → create list
 *   POST   /api/lists/:id/add-channel      → add a channel to a list
 *   DELETE /api/lists/:id/remove-channel/:channelId
 *   DELETE /api/lists/:id                  → delete a list
 */
const express = require('express');
const { param, body, query } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const channelListController = require('../controllers/channelListController');
const userListController = require('../controllers/userListController');

const router = express.Router();

// ── Public catalog ───────────────────────────────────────────────────────────
// Registered BEFORE the `/:id` patterns so it never gets parsed as an id.
router.get(
  '/public/channels',
  [
    query('pagina').optional().isInt({ min: 1 }).toInt(),
    query('limite').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('categoria').optional().isString().trim(),
    query('tematica').optional().isString().trim(),
    query('plataforma').optional().isString().trim(),
    query('minSeguidores').optional().isInt({ min: 0 }).toInt(),
    query('maxSeguidores').optional().isInt({ min: 0 }).toInt()
  ],
  validarCampos,
  channelListController.getChannels
);

// ── User-owned lists ─────────────────────────────────────────────────────────
router.get('/', autenticar, userListController.getMyLists);

router.post(
  '/',
  autenticar,
  [body('name').isString().notEmpty().trim().withMessage('name requerido')],
  validarCampos,
  userListController.createList
);

router.post(
  '/:id/add-channel',
  autenticar,
  [
    param('id').isMongoId().withMessage('ID inválido'),
    body('channelId').isMongoId().withMessage('channelId inválido')
  ],
  validarCampos,
  userListController.addChannelToList
);

router.delete(
  '/:id/remove-channel/:channelId',
  autenticar,
  [
    param('id').isMongoId().withMessage('ID inválido'),
    param('channelId').isMongoId().withMessage('channelId inválido')
  ],
  validarCampos,
  userListController.removeChannelFromList
);

router.delete(
  '/:id',
  autenticar,
  [param('id').isMongoId().withMessage('ID inválido')],
  validarCampos,
  userListController.deleteList
);

module.exports = router;
