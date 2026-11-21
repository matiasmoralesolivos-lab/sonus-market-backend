
const express = require('express');
const cors = require('cors');
const usuariosRoutes = require('./routes/usuariosRoutes');
const app = express();
const authRoutes = require('./routes/authRoutes');
const { verificarToken } = require('./middlewares/authMiddleware');
const publicacionesRoutes = require('./routes/publicacionesRoutes');
const imagenesRoutes = require('./routes/imagenesRoutes');


// Middlewares globales
app.use(cors());
app.use(express.json());
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/publicaciones', publicacionesRoutes);
app.use('/api/imagenes', imagenesRoutes);
app.use('/api', authRoutes);

// Ruta de bienvenida
app.get('/', (req, res) => {
  res.json({
    mensaje: 'Bienvenido a la API de SonusMarket',
    estado: 'Servidor funcionando',
  });
});


app.get('/api/perfil', verificarToken, (req, res) => {
  res.json({
    mensaje: 'Acceso autorizado',
    usuario: req.usuario,
  });
});


module.exports = app;


