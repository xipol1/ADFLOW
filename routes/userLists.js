const express = require('express');
const { param, body } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const userListController = require('../controllers/userListController');

const router = express.Router();

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
