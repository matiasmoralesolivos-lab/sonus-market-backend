
const express = require('express');

const {
  registrarUsuario,
  solicitarRecuperacion,
  restablecerPassword,
} = require('../controllers/usuariosController');

const router = express.Router();

router.post('/', registrarUsuario);
router.post('/restablecer-password', restablecerPassword);

router.post('/recuperar-password', solicitarRecuperacion);

module.exports = router;
