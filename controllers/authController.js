
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Login tradicional
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        mensaje: 'Email y contraseña son obligatorios',
      });
    }

    const resultado = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        mensaje: 'Credenciales incorrectas',
      });
    }

    const usuario = resultado.rows[0];

    if (!usuario.password_hash) {
      return res.status(401).json({
        mensaje: 'Esta cuenta utiliza inicio de sesión con Google',
      });
    }

    const passwordValida = await bcrypt.compare(
      password,
      usuario.password_hash
    );

    if (!passwordValida) {
      return res.status(401).json({
        mensaje: 'Credenciales incorrectas',
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
    });

  } catch (error) {
    console.error('Error en login:', error.message);

    return res.status(500).json({
      mensaje: 'Error interno del servidor',
    });
  }
};

// Login con Google
const loginGoogle = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        mensaje: 'La credencial de Google es obligatoria',
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload.email || payload.email_verified !== true) {
      return res.status(401).json({
        mensaje: 'La cuenta de Google no tiene un correo verificado',
      });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const nombre = payload.name || email.split('@')[0];

    let resultado = await pool.query(
      `SELECT id, nombre, email, google_id
       FROM usuarios WHERE google_id = $1`,
      [googleId]
    );

    let usuario = resultado.rows[0];

    if (!usuario) {
      resultado = await pool.query(
        `SELECT id, nombre, email, google_id
         FROM usuarios WHERE LOWER(email) = LOWER($1)`,
        [email]
      );

      usuario = resultado.rows[0];

      if (usuario) {
        if (usuario.google_id && usuario.google_id !== googleId) {
          return res.status(409).json({
            mensaje: 'Este correo ya está vinculado a otra cuenta de Google',
          });
        }

        await pool.query(
          'UPDATE usuarios SET google_id = $1 WHERE id = $2',
          [googleId, usuario.id]
        );
      } else {
        const nuevoUsuario = await pool.query(
          `INSERT INTO usuarios (nombre, email, google_id)
           VALUES ($1, $2, $3)
           RETURNING id, nombre, email, google_id`,
          [nombre, email, googleId]
        );

        usuario = nuevoUsuario.rows[0];
      }
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      mensaje: 'Inicio de sesión con Google exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
    });

  } catch (error) {
    console.error('Error en login con Google:', error.message);

    return res.status(500).json({
      mensaje: 'Error interno del servidor',
    });
  }
};

module.exports = { login, loginGoogle };
