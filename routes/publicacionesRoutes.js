
const express = require('express');

const {
  obtenerPublicaciones,
  obtenerPublicacion,
  crearPublicacion,
} = require('../controllers/publicacionesController');

const { verificarToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Consultar todas las publicaciones
router.get('/', obtenerPublicaciones);

// Consultar una publicación por ID
router.get('/:id', obtenerPublicacion);

// Crear una publicación (requiere autenticación)
router.post('/', verificarToken, crearPublicacion);

module.exports = router;
