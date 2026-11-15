
const express = require('express');
const { registrarUsuario } = require('../controllers/usuariosController');

const router = express.Router();

router.post('/', registrarUsuario);

module.exports = router;
