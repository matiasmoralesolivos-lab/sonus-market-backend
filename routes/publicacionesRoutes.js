const express = require('express');

const {
  obtenerPublicaciones,
  obtenerPublicacion,
  obtenerEtiquetas,
  crearPublicacion,
  actualizarPublicacion,
} = require('../controllers/publicacionesController');

const { verificarToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Consultar todas las publicaciones
router.get('/', obtenerPublicaciones);

// Consultar catálogo de etiquetas
router.get('/etiquetas', obtenerEtiquetas);

// Consultar una publicación por ID
router.get('/:id', obtenerPublicacion);

// Crear una publicación (requiere autenticación)
router.post('/', verificarToken, crearPublicacion);

// Actualizar una publicación propia (requiere autenticación)
router.put('/:id', verificarToken, actualizarPublicacion);

module.exports = router;