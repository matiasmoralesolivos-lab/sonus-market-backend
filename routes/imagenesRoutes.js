
const express = require('express');

const {
  obtenerAutenticacionImagenes,
} = require('../controllers/imagenesController');

const { verificarToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Generar credenciales temporales para subir imágenes
router.post('/auth', verificarToken, obtenerAutenticacionImagenes);

module.exports = router;
