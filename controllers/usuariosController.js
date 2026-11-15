
const pool = require('../config/db');
const bcrypt = require('bcrypt');

const registrarUsuario = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    // Validar campos obligatorios
    if (!nombre || !email || !password) {
      return res.status(400).json({
        mensaje: 'Todos los campos son obligatorios',
      });
    }

    // Cifrar contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Guardar usuario en PostgreSQL
    const resultado = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, email`,
      [nombre, email, passwordHash]
    );

    return res.status(201).json(resultado.rows[0]);

  } catch (error) {
    // Correo electrónico duplicado
    if (error.code === '23505') {
      return res.status(409).json({
        mensaje: 'El correo electrónico ya está registrado',
      });
    }

    console.error('Error al registrar usuario:', error.message);

    return res.status(500).json({
      mensaje: 'Error interno del servidor',
    });
  }
};

module.exports = { registrarUsuario };
